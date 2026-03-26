# RPC — Rental Property Calculator

A freemium SaaS web application for real estate investors to calculate cash flow, profitability, and deal quality for rental properties.

## Features

- **Cash Flow Calculator** — Analyze acquisition costs, operating expenses, debt service, and net cash flow
- **Property Savings** — Save up to 3 analyses per month on the free tier, unlimited on pro
- **Deal Scoring** — Automatic ROI, cap rate, and cash-on-cash return metrics
- **Watchlist Criteria** — Set deal filters (location, price range, minimum return) to find properties
- **Stripe Billing** — Secure subscription management with monthly billing portal
- **User Dashboard** — Access all saved properties and subscription status
- **Dark Mode Only** — Sleek, eye-friendly interface built for desktop and mobile

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + Shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Stripe (Checkout Sessions + Webhooks) |
| Rate Limiting | Upstash Redis |
| Hosting | Vercel |
| Testing | Vitest (unit/integration) + Playwright (E2E) |

## Prerequisites

- **Node.js** ≥ 18.x and npm 9+
- **Git**
- **Supabase account** — https://supabase.com (free tier is sufficient)
- **Stripe account** — https://stripe.com (test mode for development)
- **Upstash Redis account** — https://upstash.com (free tier for rate limiting)

## Local Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/rpc.git
cd rpc
npm install
```

### 2. Configure Environment Variables

Copy the template and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with values from Supabase, Stripe, and Upstash. See [Environment Variables](#environment-variables) section below for details.

### 3. Set Up Database

Create a Supabase project at https://supabase.com.

**Option A: Using Supabase CLI (Recommended)**

Install the CLI globally, then push migrations:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

**Option B: Using SQL Editor (Manual)**

1. Go to Supabase Dashboard → SQL Editor
2. Open each migration file in `supabase/migrations/`
3. Copy-paste and run each migration in order

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3001

## Environment Variables

All variables in `.env.example` are required unless marked optional. Store sensitive keys in `.env.local` (never commit).

| Variable | Where to Find | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Public URL for browser clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon key | Public key, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key | Secret key, server-side only |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key | Test key starts with `sk_test_`, live starts with `sk_live_` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys → Publishable key | Public key for browser, safe to expose |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret | Shown only once — copy and save securely |
| `STRIPE_PRICE_ID` | Stripe Dashboard → Products → Select product → Pricing | Recurring price ID, format: `price_...` |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Select database → Details → REST API → URL | REST endpoint for HTTP requests |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Select database → Details → REST API → Token | Authorization token for Redis access |
| `NEXT_PUBLIC_APP_URL` | (Optional) Your production domain | Used for OG tags and sitemap. Omit for localhost |

### Example .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Database Setup (Details)

### Tables Created

The migrations create the following tables with Row-Level Security (RLS):

- **properties** — Saved property analyses (user_id, address, purchase_price, monthly_rent, computed metrics)
- **usage_tracking** — Monthly save counter per user (user_id, month, count) for freemium gating
- **subscriptions** — Mirrors Stripe subscription state (user_id, stripe_customer_id, stripe_subscription_id, plan_type, status)
- **watchlist_criteria** — User deal filters (user_id, city, max_price, min_return)

All tables enforce `auth.uid() = user_id` via RLS policies. No SQL queries can bypass this.

### Seeding (Optional)

To seed test data:

```bash
supabase db seed -- supabase/seeds/01-test-data.sql
```

## Stripe Setup

### Create a Product and Recurring Price

1. **Stripe Dashboard** → Products → Add Product
2. Set up recurring pricing (monthly or yearly)
3. Copy the **Price ID** (format: `price_...`)
4. Add to `.env.local` as `STRIPE_PRICE_ID`

### Set Up Webhook

1. **Stripe Dashboard** → Developers → Webhooks → Add endpoint
2. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
3. **Events to Listen:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing Secret** → Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Local Testing with Stripe CLI

Test webhooks locally using the Stripe CLI:

```bash
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Use test card `4242 4242 4242 4242` (expiry: any future date, CVC: any 3 digits) for checkout.

## Running Tests

### Unit and Integration Tests

```bash
npm run test          # Run once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report (aim for 80%+)
```

Test files live in `src/**/*.test.ts` and `src/**/*.test.tsx`.

### End-to-End Tests (E2E)

```bash
npm run test:e2e
```

E2E tests are in `e2e/` and use Playwright. They test critical user flows (signup, calculator, property save, billing).

## Deployment to Vercel

### 1. Push to GitHub

```bash
git remote add origin https://github.com/yourusername/rpc.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Vercel will auto-detect Next.js settings

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add all variables from `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` — Set to your Vercel domain (e.g., `https://rpc.vercel.app`)

### 4. Update Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add your Vercel URL:

```
https://rpc.vercel.app/auth/callback
```

### 5. Update Stripe Webhook URL

In Stripe Dashboard → Webhooks, update the endpoint URL to:

```
https://rpc.vercel.app/api/webhooks/stripe
```

### 6. Deploy

Merge to `main` or click "Deploy" in Vercel Dashboard. Vercel will build and deploy automatically.

## Project Structure

```
rpc/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── checkout/           # Stripe Checkout Session creation
│   │   │   ├── properties/         # Save/fetch properties
│   │   │   ├── webhooks/stripe/    # Stripe webhook handler
│   │   │   └── billing-portal/     # Stripe billing portal redirect
│   │   ├── auth/                   # Auth pages (login, signup, callback)
│   │   ├── calculator/             # Main calculator page
│   │   └── dashboard/              # Protected dashboard
│   ├── components/
│   │   ├── calculator/             # Calculator UI components
│   │   ├── dashboard/              # Dashboard UI
│   │   ├── auth/                   # Auth forms
│   │   └── ui/                     # Shadcn/ui components
│   ├── hooks/
│   │   ├── useCalculator.ts        # Calculator state & logic
│   │   ├── useUser.ts              # Current user + auth
│   │   └── usePricingExperiment.ts # A/B testing pricing
│   ├── lib/
│   │   ├── calculations.ts         # Pure calculator math
│   │   ├── stripe.ts               # Stripe client initialization
│   │   ├── supabase/               # Supabase client & utilities
│   │   └── utils.ts                # General utilities
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── supabase/
│   ├── migrations/                 # Database migrations
│   └── seeds/                      # Test data (optional)
├── e2e/                            # Playwright E2E tests
├── .env.example                    # Environment template
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── package.json
```

## Key Concepts

### Immutability

All state updates use immutable patterns (spread operator, object cloning). Never mutate existing state directly.

### Pure Functions

Calculations in `lib/calculations.ts` are pure functions with no side effects. They take inputs and return outputs without modifying global state.

### Row-Level Security (RLS)

All database queries are protected by Supabase RLS policies. The server cannot read or modify another user's data even with the service role key misused.

### API Response Format

All API responses use a consistent envelope:

```javascript
// Success
{ data: { /* payload */ } }

// Error
{ error: "User message describing the issue" }
```

## Troubleshooting

### Port 3001 Already in Use

The dev server runs on port 3001 by default. If in use, specify a different port:

```bash
npm run dev -- --port 3002
```

### Supabase Connection Issues

Verify your credentials are correct in `.env.local`:

```bash
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

If the URL is missing, you'll see `undefined`. Re-run `cp .env.example .env.local` and fill in all values.

### Stripe Webhook Not Firing Locally

Make sure the Stripe CLI is running:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Check the webhook signing secret matches `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Tests Failing

Run tests with verbose output:

```bash
npm run test -- --reporter=verbose
```

Check test setup in `vitest.config.ts` and ensure all mocks are configured. See `CLAUDE.md` for testing standards.

## Performance Considerations

- All calculations are performed client-side for instant feedback
- Server validates and stores results in the database
- Rate limiting (via Upstash Redis) prevents abuse of POST endpoints
- Properties are paginated on the dashboard for faster page loads

## Contributing

We follow conventional commits (`feat:`, `fix:`, `test:`, etc.). See `CLAUDE.md` for detailed development standards.

1. Create a feature branch
2. Write tests first (TDD)
3. Implement functionality
4. Run tests and coverage checks
5. Submit a pull request

## License

MIT

## Support

For issues, questions, or feature requests, open a GitHub issue or contact the development team.
