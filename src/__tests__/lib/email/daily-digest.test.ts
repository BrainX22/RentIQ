import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DealMatch } from '@/types';

// Mock Resend before importing the module under test
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}));

import { buildDigestHtml, sendDailyDigest } from '@/lib/email/daily-digest';
import { Resend } from 'resend';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeMatch(overrides: Partial<DealMatch> = {}): DealMatch {
  return {
    id: 'match-1',
    user_id: 'user-1',
    property_id: 'prop-1',
    property_name: 'Sunset Apartments',
    property_price: 200_000,
    est_monthly_cash_flow: 350,
    est_cash_on_cash_return: 8.5,
    deal_score_value: 82,
    deal_grade: 'A',
    matched_at: '2026-03-21T00:00:00Z',
    dismissed_at: null,
    ...overrides,
  };
}

const APP_URL = 'https://app.example.com';

// ─── buildDigestHtml ─────────────────────────────────────────────────────────

describe('buildDigestHtml', () => {
  it('returns a string containing the property name', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ property_name: 'Sunny Villa' })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain('Sunny Villa');
  });

  it('returns a string containing the formatted price ($200,000)', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ property_price: 200_000 })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain('$200,000');
  });

  it('escapes HTML in property names (e.g. <script> becomes &lt;script&gt;)', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ property_name: '<script>alert("xss")</script>' })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows "N/A" when est_cash_on_cash_return is null', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ est_cash_on_cash_return: null })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain('N/A');
  });

  it('shows green color for positive cash flow', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ est_monthly_cash_flow: 500 })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    // Positive cash flow should use green color
    expect(html).toMatch(/#059669|#16a34a|green/i);
  });

  it('shows red color for negative cash flow', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ est_monthly_cash_flow: -200 })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    // Negative cash flow should use red color
    expect(html).toMatch(/#dc2626|#e11d48|red/i);
  });

  it('Grade A badge has green color (#059669)', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ deal_grade: 'A' })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain('#059669');
  });

  it('Grade B badge has blue color (#2563eb)', () => {
    const html = buildDigestHtml({
      matches: [makeMatch({ deal_grade: 'B' })],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain('#2563eb');
  });

  it('uses "there" when userName is null', () => {
    const html = buildDigestHtml({
      matches: [makeMatch()],
      userName: null,
      appUrl: APP_URL,
    });
    expect(html).toContain('Hi there');
  });

  it('CTA button links to ${appUrl}/dashboard', () => {
    const html = buildDigestHtml({
      matches: [makeMatch()],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(html).toContain(`${APP_URL}/dashboard`);
  });

  it('uses safe fallback URL when appUrl has javascript: scheme', () => {
    const html = buildDigestHtml({
      matches: [makeMatch()],
      userName: null,
      appUrl: 'javascript:alert(1)',
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('https://getrentiq.com');
  });
});

// ─── sendDailyDigest ─────────────────────────────────────────────────────────

describe('sendDailyDigest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns { success: false, error } when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendDailyDigest({
      to: 'user@example.com',
      matches: [makeMatch()],
      userName: 'Alice',
      appUrl: APP_URL,
    });
    expect(result).toEqual({
      success: false,
      error: 'RESEND_API_KEY not configured',
    });
  });

  it('calls resend.emails.send() with correct from, to, subject, html args', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'deals@example.com';

    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    vi.mocked(Resend).mockImplementation(function () {
      return { emails: { send: mockSend } };
    } as unknown as typeof Resend);

    const matches = [makeMatch()];
    await sendDailyDigest({
      to: 'user@example.com',
      matches,
      userName: 'Alice',
      appUrl: APP_URL,
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.from).toBe('deals@example.com');
    expect(callArgs.to).toBe('user@example.com');
    expect(callArgs.subject).toContain('Daily Deal Digest');
    expect(callArgs.subject).toContain('1 new A/B deal found');
    expect(typeof callArgs.html).toBe('string');
    expect(callArgs.html.length).toBeGreaterThan(100);
  });

  it('returns { success: true } on successful send', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    vi.mocked(Resend).mockImplementation(function () {
      return { emails: { send: mockSend } };
    } as unknown as typeof Resend);

    const result = await sendDailyDigest({
      to: 'user@example.com',
      matches: [makeMatch()],
      userName: 'Alice',
      appUrl: APP_URL,
    });

    expect(result).toEqual({ success: true });
  });

  it('returns { success: false, error } when Resend throws — does NOT re-throw', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const mockSend = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(Resend).mockImplementation(function () {
      return { emails: { send: mockSend } };
    } as unknown as typeof Resend);

    const result = await sendDailyDigest({
      to: 'user@example.com',
      matches: [makeMatch()],
      userName: 'Alice',
      appUrl: APP_URL,
    });

    expect(result).toEqual({ success: false, error: 'Network error' });
    // Must not throw — if we reach here, it didn't throw
  });

  it('returns { success: false } when Resend SDK returns an API error (not a thrown error)', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const mockSend = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'domain not verified', statusCode: 403, name: 'validation_error' },
    });
    vi.mocked(Resend).mockImplementation(function () {
      return { emails: { send: mockSend } };
    } as unknown as typeof Resend);
    const result = await sendDailyDigest({
      to: 'user@example.com',
      matches: [makeMatch()],
      userName: 'Test',
      appUrl: 'https://app.test',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('domain not verified');
  });
});
