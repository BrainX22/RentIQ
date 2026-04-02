import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockLemonSqueezySetup,
  mockCreateCheckout,
  mockGetSubscription,
  mockUpdateSubscription,
} = vi.hoisted(() => {
  const mockLemonSqueezySetup = vi.fn();
  const mockCreateCheckout = vi.fn();
  const mockGetSubscription = vi.fn();
  const mockUpdateSubscription = vi.fn();
  return { mockLemonSqueezySetup, mockCreateCheckout, mockGetSubscription, mockUpdateSubscription };
});

vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  lemonSqueezySetup: mockLemonSqueezySetup,
  createCheckout: mockCreateCheckout,
  getSubscription: mockGetSubscription,
  updateSubscription: mockUpdateSubscription,
}));

describe("LemonSqueezy lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.LEMONSQUEEZY_API_KEY = "test-api-key";
    process.env.LEMONSQUEEZY_STORE_ID = "321542";
  });

  describe("createCheckoutUrl", () => {
    it("calls createCheckout with correct storeId, variantId, email and user_id", async () => {
      mockCreateCheckout.mockResolvedValue({
        data: { data: { attributes: { url: "https://checkout.lemonsqueezy.com/buy/test" } } },
        error: null,
      });

      const { createCheckoutUrl } = await import("@/lib/lemonsqueezy");
      const url = await createCheckoutUrl("1477889", "user@test.com", "user-abc", "http://localhost:3001");

      expect(mockCreateCheckout).toHaveBeenCalledWith(
        "321542",
        "1477889",
        expect.objectContaining({
          checkoutData: expect.objectContaining({
            email: "user@test.com",
            custom: { user_id: "user-abc" },
          }),
          productOptions: expect.objectContaining({
            redirectUrl: "http://localhost:3001/dashboard?checkout=success",
          }),
        })
      );
      expect(url).toBe("https://checkout.lemonsqueezy.com/buy/test");
    });

    it("throws when createCheckout returns an error", async () => {
      mockCreateCheckout.mockResolvedValue({
        data: null,
        error: { message: "Invalid variant" },
      });

      const { createCheckoutUrl } = await import("@/lib/lemonsqueezy");
      await expect(
        createCheckoutUrl("bad-id", "user@test.com", "user-abc", "http://localhost:3001")
      ).rejects.toThrow("Failed to create LemonSqueezy checkout");
    });

    it("throws when checkout URL is missing from response", async () => {
      mockCreateCheckout.mockResolvedValue({
        data: { data: { attributes: { url: null } } },
        error: null,
      });

      const { createCheckoutUrl } = await import("@/lib/lemonsqueezy");
      await expect(
        createCheckoutUrl("1477889", "user@test.com", "user-abc", "http://localhost:3001")
      ).rejects.toThrow("Failed to create LemonSqueezy checkout");
    });
  });

  describe("getCustomerPortalUrl", () => {
    it("returns customer portal URL from subscription", async () => {
      mockGetSubscription.mockResolvedValue({
        data: {
          data: {
            attributes: {
              urls: { customer_portal: "https://rentalpropertycalculator.lemonsqueezy.com/billing?sig=abc" },
            },
          },
        },
        error: null,
      });

      const { getCustomerPortalUrl } = await import("@/lib/lemonsqueezy");
      const url = await getCustomerPortalUrl("2022684");

      expect(mockGetSubscription).toHaveBeenCalledWith("2022684");
      expect(url).toBe("https://rentalpropertycalculator.lemonsqueezy.com/billing?sig=abc");
    });

    it("throws when getSubscription returns an error", async () => {
      mockGetSubscription.mockResolvedValue({ data: null, error: { message: "Not found" } });

      const { getCustomerPortalUrl } = await import("@/lib/lemonsqueezy");
      await expect(getCustomerPortalUrl("bad-id")).rejects.toThrow("Failed to get customer portal URL");
    });
  });

  describe("cancelLsSubscription", () => {
    it("calls updateSubscription with cancelled: true", async () => {
      mockUpdateSubscription.mockResolvedValue({ data: {}, error: null });

      const { cancelLsSubscription } = await import("@/lib/lemonsqueezy");
      await cancelLsSubscription("2022684");

      expect(mockUpdateSubscription).toHaveBeenCalledWith("2022684", { cancelled: true });
    });

    it("throws when updateSubscription returns an error", async () => {
      mockUpdateSubscription.mockResolvedValue({ data: null, error: { message: "API error" } });

      const { cancelLsSubscription } = await import("@/lib/lemonsqueezy");
      await expect(cancelLsSubscription("2022684")).rejects.toThrow(
        "Failed to cancel LemonSqueezy subscription"
      );
    });
  });
});
