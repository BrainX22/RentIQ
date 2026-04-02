import "@testing-library/jest-dom";
import { vi } from "vitest";

// ─── Env vars required by route modules at import time ────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.LEMONSQUEEZY_API_KEY = "test-ls-api-key";
process.env.LEMONSQUEEZY_STORE_ID = "321542";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-ls-webhook-secret-32chars!!";
process.env.LEMONSQUEEZY_PRO_VARIANT_ID = "1477889";
process.env.LEMONSQUEEZY_MAX_VARIANT_ID = "1477891";

// ─── Radix UI / jsdom browser API stubs ──────────────────────────────────────
// Radix UI Dialog, Popover, Select, etc. call these APIs that jsdom omits.
// Without them tests can flake or emit "not implemented" warnings in CI.

// @floating-ui/dom (used by @base-ui/react tooltips) calls `new ResizeObserver()`.
// Must use a class/constructor — arrow functions cannot be called with `new`.
global.ResizeObserver = vi.fn(function ResizeObserver(
  this: { observe: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }
) {
  this.observe = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
}) as unknown as typeof ResizeObserver;

global.IntersectionObserver = vi.fn(function IntersectionObserver(
  this: { observe: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }
) {
  this.observe = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
}) as unknown as typeof IntersectionObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Radix uses pointer events extensively; prevent jsdom "not implemented" warnings
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
