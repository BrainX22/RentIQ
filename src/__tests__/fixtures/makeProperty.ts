import type { Property } from "@/types";

/**
 * Shared test fixture factory for Property objects.
 * Provides safe defaults for every required field; override via the second argument.
 *
 * Centralising this prevents test-file drift when the Property type gains new fields
 * after a DB migration.
 */
export function makeProperty(id: string, overrides: Partial<Property> = {}): Property {
  return {
    id,
    user_id: "user-1",
    property_name: `Property ${id}`,
    property_price: 300_000,
    down_payment_percent: 20,
    interest_rate: 7,
    loan_term_years: 30,
    monthly_rent: 2_000,
    property_tax_yearly: 3_600,
    insurance_monthly: 100,
    hoa_fees_monthly: 0,
    maintenance_percent: 10,
    vacancy_percent: 8,
    monthly_cash_flow: 500,
    annual_cash_flow: 6_000,
    cash_on_cash_return: 10,
    noi: 15_000,
    monthly_mortgage: 1_600,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}
