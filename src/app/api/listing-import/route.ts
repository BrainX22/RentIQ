import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlSchema } from "@/lib/validations";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Allowlist of real-estate listing domains.
// Only these hosts may be fetched to prevent SSRF attacks.
const ALLOWED_LISTING_HOSTS = new Set([
  "www.zillow.com",
  "zillow.com",
  "www.realtor.com",
  "realtor.com",
  "www.redfin.com",
  "redfin.com",
  "www.trulia.com",
  "trulia.com",
  "www.homes.com",
  "homes.com",
  "www.apartments.com",
  "apartments.com",
  "www.loopnet.com",
  "loopnet.com",
  "www.crexi.com",
  "crexi.com",
]);

type JsonRecord = Record<string, unknown>;

interface ListingImportResult {
  sourceUrl: string;
  extracted: {
    propertyPrice?: number;
    monthlyRent?: number;
    propertyTaxYearly?: number;
    hoaFeesMonthly?: number;
    insuranceMonthly?: number;
    address?: string;
  };
  notes: string[];
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function getByPath(record: JsonRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as JsonRecord)) {
      return (acc as JsonRecord)[key];
    }
    return undefined;
  }, record);
}

function pickMoneyValue(record: JsonRecord, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = getByPath(record, key);
    const parsed = toNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function extractJsonLdBlocks(html: string): JsonRecord[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: JsonRecord[] = [];

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && typeof item === "object") blocks.push(item as JsonRecord);
        });
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as JsonRecord);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return blocks;
}

function findListingLikeObject(items: JsonRecord[]): JsonRecord | undefined {
  const isListingType = (typeValue: unknown): boolean => {
    if (typeof typeValue === "string") {
      const lower = typeValue.toLowerCase();
      return (
        lower.includes("residence") ||
        lower.includes("house") ||
        lower.includes("apartment") ||
        lower.includes("offer") ||
        lower.includes("product") ||
        lower.includes("realestate")
      );
    }

    if (Array.isArray(typeValue)) {
      return typeValue.some((entry) => isListingType(entry));
    }

    return false;
  };

  return items.find((item) => isListingType(item["@type"]));
}

function extractAddress(record: JsonRecord): string | undefined {
  const direct = record.address;
  if (typeof direct === "string") return direct;

  if (direct && typeof direct === "object") {
    const addr = direct as JsonRecord;
    const parts = [
      addr.streetAddress,
      addr.addressLocality,
      addr.addressRegion,
      addr.postalCode,
    ].filter((part) => typeof part === "string" && part.length > 0) as string[];

    if (parts.length > 0) return parts.join(", ");
  }

  return undefined;
}

function extractFromHtml(sourceUrl: string, html: string): ListingImportResult {
  const notes: string[] = [];
  const jsonLd = extractJsonLdBlocks(html);

  if (jsonLd.length === 0) {
    return {
      sourceUrl,
      extracted: {},
      notes: ["No JSON-LD data found on the page."],
    };
  }

  const listing = findListingLikeObject(jsonLd) ?? jsonLd[0];

  const propertyPrice = pickMoneyValue(listing, ["offers.price", "price", "offers.lowPrice", "offers.highPrice"]);
  const monthlyRent = pickMoneyValue(listing, ["rent", "leasePrice"]);
  const propertyTaxYearly = pickMoneyValue(listing, ["annualTaxAmount", "propertyTax"]);
  const hoaFeesMonthly = pickMoneyValue(listing, ["hoaFee", "monthlyHoaFee"]);
  const insuranceMonthly = pickMoneyValue(listing, ["insuranceMonthly", "insurance"]);
  const address = extractAddress(listing);

  if (!propertyPrice) notes.push("Price was not detected. Fill it manually.");
  if (!monthlyRent) notes.push("Rent was not detected. Fill it manually.");

  return {
    sourceUrl,
    extracted: {
      propertyPrice,
      monthlyRent,
      propertyTaxYearly,
      hoaFeesMonthly,
      insuranceMonthly,
      address,
    },
    notes,
  };
}

export async function POST(req: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/listing-import", "POST");
      const ip = getClientIp(req.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))) } }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error — failing open:", rlErr);
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = urlSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const parsedUrl = new URL(parsed.data.url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported." }, { status: 400 });
    }

    if (!ALLOWED_LISTING_HOSTS.has(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "URL must be from a supported real-estate listing site (Zillow, Redfin, Realtor.com, etc.)." },
        { status: 400 }
      );
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RPC-Importer/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      redirect: "manual", // validate redirects to prevent SSRF via open redirect on allowed domains
      signal: AbortSignal.timeout(5000),
    });

    // Follow up to 3 redirect hops, re-validating the host on each hop
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return NextResponse.json({ error: "Could not fetch URL (redirect with no location)." }, { status: 400 });
      }
      const redirectUrl = new URL(location, parsedUrl);
      if (!ALLOWED_LISTING_HOSTS.has(redirectUrl.hostname)) {
        return NextResponse.json(
          { error: "URL must be from a supported real-estate listing site (Zillow, Redfin, Realtor.com, etc.)." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Redirect to another listing URL — please use the final URL directly." }, { status: 400 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch URL (status ${response.status}).` },
        { status: 400 }
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2_000_000) {
      return NextResponse.json({ error: "Listing page too large to process." }, { status: 400 });
    }

    const html = await response.text();
    const result = extractFromHtml(parsedUrl.toString(), html);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Import failed. Try another listing URL or fill fields manually." },
      { status: 500 }
    );
  }
}
