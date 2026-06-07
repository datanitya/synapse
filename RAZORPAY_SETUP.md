# Razorpay Integration — Setup Guide

This document covers everything needed to go from zero to live payments in SYNAPSE.

---

## Architecture Overview

```
User clicks "Upgrade"
        │
        ▼
POST /api/billing/create-subscription
  → Creates Razorpay Subscription linked to a Razorpay Plan
  → Returns { subscriptionId, keyId }
        │
        ▼
Razorpay Checkout modal opens in browser
  → User pays (UPI, card, net banking, wallet)
        │
        ▼
POST /api/billing/verify-payment   ← frontend calls this on success
  → Verifies HMAC signature
  → Activates user's plan in DB
        │                          ← Razorpay also fires this independently
        ▼
POST /api/billing/webhook
  → subscription.charged   → activates plan + logs payment
  → subscription.activated → activates plan + logs payment
  → subscription.cancelled → downgrades to FREE
  → payment.failed         → sets status = past_due + logs failure
```

All payment events are logged to the `PaymentLog` table and visible at `/admin/payments`.

---

## Step 1 — Razorpay Account

1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com) and create an account.
2. Complete KYC (required for live mode). You can use **Test mode** to develop without KYC.

---

## Step 2 — API Keys

1. Dashboard → **Settings → API Keys**
2. Click **Generate Test Key** (test mode) or **Generate Live Key** (production)
3. You'll see two values:
   - **Key ID** — starts with `rzp_test_` or `rzp_live_`
   - **Key Secret** — shown only once, copy it immediately

Add to your `.env`:
```env
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
```

> **Security**: Never commit these to git. The Key Secret must stay server-side only.

---

## Step 3 — Create Plans in Razorpay Dashboard

Each SYNAPSE billing tier needs a corresponding Razorpay Plan.

1. Dashboard → **Subscriptions → Plans → + Create Plan**
2. Fill in:

| SYNAPSE Tier | Plan Name | Interval | Amount | Currency |
|---|---|---|---|---|
| Creator (PRO) | SYNAPSE Creator | Monthly | **29900** paise (= ₹299) | INR |
| Pro (BUSINESS) | SYNAPSE Pro | Monthly | **99900** paise (= ₹999) | INR |

> Amount is always in **paise** (smallest unit). ₹299 = 29900 paise.

3. After creating each plan, copy its **Plan ID** (format: `plan_xxxxxxxxxxxxxxxxxx`)

---

## Step 4 — Link Razorpay Plan IDs to SYNAPSE Plans

1. Start the SYNAPSE dev server (`pnpm dev`)
2. Log in with an admin account → go to `/admin/plans`
3. Click **Edit plan** on Creator and Pro
4. Paste the Razorpay Plan ID into the **Razorpay Plan ID** field and save

The field maps to `Plan.razorpayPlanId` in the database. Without this, clicking "Switch to Creator/Pro" will return a 400 error.

---

## Step 5 — Set Up Webhooks

1. Dashboard → **Settings → Webhooks → + Add New Webhook**
2. **Webhook URL**: `https://yourdomain.com/api/billing/webhook`
   - For local testing, use a tunnel (see §7 below)
3. **Secret**: Generate a strong random string (e.g. `openssl rand -hex 32`)
4. **Active Events** — check these boxes:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.pending`
   - `payment.failed`
5. Save

Add the secret to your `.env`:
```env
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_here"
```

> The webhook endpoint (`POST /api/billing/webhook`) has **no JWT auth**. Security comes entirely from the HMAC-SHA256 signature verification in `BillingService.handleWebhook()`.

---

## Step 6 — Environment Variables Summary

```env
# ─── Razorpay ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret_here"
```

---

## Step 7 — Local Development & Testing

Razorpay webhooks require a publicly reachable URL. Use a tunnel during development:

**Using ngrok:**
```bash
ngrok http 3001
# Copy the https URL, e.g. https://abc123.ngrok.io
# Set webhook URL to: https://abc123.ngrok.io/api/billing/webhook
```

**Using localtunnel:**
```bash
npx localtunnel --port 3001
```

### Test Cards (Test Mode)

| Card | Number | CVV | Expiry |
|---|---|---|---|
| Visa (success) | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Mastercard (success) | 5267 3181 8797 5449 | Any | Any future |
| International card | 4012 8888 8888 1881 | Any | Any future |
| Failure simulation | 4000 0000 0000 0002 | Any | Any future |

**Test UPI**: Use `success@razorpay` as the UPI ID to simulate success.

---

## Step 8 — Subscription Lifecycle

| Event | What SYNAPSE does |
|---|---|
| `subscription.activated` | Sets user plan to the subscribed tier, status = `active`, logs payment |
| `subscription.charged` | Same as activated (monthly renewal), logs payment |
| `subscription.cancelled` | Downgrades user to FREE plan, status = `cancelled` |
| `subscription.completed` | Downgrades user to FREE plan (subscription ended) |
| `subscription.pending` | Sets status = `past_due` |
| `payment.failed` | Sets status = `past_due`, logs failed payment |

User fields updated on each event:
- `User.planId` — points to the new Plan
- `User.planSince` — timestamp of plan change
- `User.subscriptionStatus` — current subscription health
- `User.razorpaySubscriptionId` — Razorpay subscription ID for reconciliation

---

## Step 9 — Admin Payments Dashboard

Go to `/admin/payments` after logging in as admin.

You'll see:
- **Total revenue** — sum of all captured payments ever
- **This month** — revenue in the current calendar month
- **Total transactions** — count of all payments
- **Failed payments** — count of `payment.failed` events

The table shows every webhook event with: date, user name & email, plan, amount, payment method, event type, and status.

> Payments appear here only after Razorpay fires the webhook. If you don't see a payment, check the webhook logs in your Razorpay dashboard (Settings → Webhooks → click your webhook → View Deliveries).

---

## Step 10 — Going Live

1. Complete Razorpay KYC
2. Switch to **Live mode** in the Razorpay dashboard
3. Generate **live API keys** and update `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in production env
4. Create live plans (same steps as §3, but in live mode)
5. Update Plan `razorpayPlanId` values in the admin portal with live plan IDs
6. Create a live webhook with your production URL and update `RAZORPAY_WEBHOOK_SECRET`
7. Test with a real ₹1 transaction before going public

---

## Cancellation Flow

Users cancel from the `/billing` page (Cancel subscription button on the current plan card).

1. Frontend calls `POST /api/billing/cancel`
2. Backend calls Razorpay API to cancel the subscription
3. User is immediately downgraded to FREE plan

Razorpay also sends `subscription.cancelled` webhook which the backend handles as a fallback.

---

## Troubleshooting

| Problem | Likely cause |
|---|---|
| "This plan is not yet available for purchase" | `razorpayPlanId` not set on the Plan in admin portal |
| Webhook not receiving events | URL not publicly reachable; check ngrok / production URL |
| Webhook signature mismatch | `RAZORPAY_WEBHOOK_SECRET` doesn't match what's in the Razorpay dashboard |
| Payment verified but plan not updated | Webhook fired before `verifyPayment` — safe to ignore, webhook is the source of truth |
| Plan not updating after payment | Check `PaymentLog` in Prisma Studio for the event; check server logs for errors |

---

## Database Reference

**`Plan` model fields added:**
- `razorpayPlanId String?` — the Razorpay Plan ID (set via admin portal)

**`User` model fields added:**
- `razorpayCustomerId String?` — reserved for future use
- `razorpaySubscriptionId String?` — active Razorpay Subscription ID
- `subscriptionStatus String?` — `created | authenticated | active | past_due | cancelled`

**`PaymentLog` model** — one row per webhook event:
- `razorpayPaymentId` — Razorpay payment ID (unique)
- `razorpaySubscriptionId` — linked subscription
- `userId / userEmail / userName` — resolved from subscription
- `amountPaise` — amount in paise (divide by 100 for ₹)
- `status` — `captured | failed | refunded`
- `method` — `upi | card | netbanking | wallet`
- `planDisplayName` — which plan was being paid for
- `event` — the Razorpay event that triggered this record
