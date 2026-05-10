# PayPal Setup

GameClaw bills paid tiers through **PayPal Subscriptions** (recurring monthly). Free tier requires no setup. Pro / Pro+ / Enterprise require the steps below.

The code already ships and gracefully degrades when PayPal env vars are placeholders: free works, paid tiers return a clear "not yet configured" error.

> **Sandbox first.** Test the entire flow against `developer.paypal.com` sandbox accounts before flipping `PAYPAL_ENV=live`. There's no shortcut — a misconfigured live integration charges real money.

---

## Step 1 — Create a PayPal Business app

1. Go to <https://developer.paypal.com/dashboard/>
2. Switch to **Sandbox** mode (top of the page)
3. **My Apps & Credentials** → **Create App**
4. Name: `GameClaw (sandbox)`. Type: Merchant.
5. Copy the **Client ID** and **Secret**

Repeat for **Live** mode when you're ready to flip the switch (separate App → separate ID + Secret).

## Step 2 — Create products + plans

PayPal Subscriptions API needs a Product → Plan hierarchy. Plans have the actual pricing.

For each tier (Pro, Pro+, Enterprise):

```bash
# Use sandbox endpoint while testing; api-m.paypal.com when live
TOKEN=$(curl -s https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r .access_token)

# Create the product
PRODUCT=$(curl -s -X POST https://api-m.sandbox.paypal.com/v1/catalogs/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "GameClaw Pro",
    "description": "GameClaw Pro tier — daily AI-driven game automation",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }' | jq -r .id)

# Create the plan ($5/mo for Pro; change to 15 / 50 for Pro+ / Enterprise)
curl -s -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": \"$PRODUCT\",
    \"name\": \"GameClaw Pro Monthly\",
    \"billing_cycles\": [{
      \"frequency\": {\"interval_unit\": \"MONTH\", \"interval_count\": 1},
      \"tenure_type\": \"REGULAR\",
      \"sequence\": 1,
      \"total_cycles\": 0,
      \"pricing_scheme\": {\"fixed_price\": {\"value\": \"5\", \"currency_code\": \"USD\"}}
    }],
    \"payment_preferences\": {
      \"auto_bill_outstanding\": true,
      \"setup_fee_failure_action\": \"CONTINUE\",
      \"payment_failure_threshold\": 3
    }
  }" | jq -r .id
```

Save the returned **Plan ID** (`P-XXX...`) for each tier.

## Step 3 — Configure a webhook

1. Developer dashboard → **My Apps & Credentials** → your app → **Add Webhook**
2. URL: `https://gogameclaw.com/api/webhooks/paypal`
3. Events to subscribe to:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
4. Save and copy the **Webhook ID** (`WH-XXX`)

## Step 4 — Update Cloud Run env

Replace placeholders with real values:

```bash
# Secrets (rotate via versions)
printf "<sandbox-client-id>"  | gcloud secrets versions add PAYPAL_CLIENT_ID     --data-file=-
printf "<sandbox-secret>"     | gcloud secrets versions add PAYPAL_CLIENT_SECRET --data-file=-
printf "<webhook-id>"         | gcloud secrets versions add PAYPAL_WEBHOOK_ID    --data-file=-

# Env vars (plan IDs aren't sensitive but go via env for runtime swap)
gcloud run services update gameclaw --region us-central1 --update-env-vars=\
PAYPAL_ENV=sandbox,\
PAYPAL_VERIFY_WEBHOOKS=true,\
PAYPAL_PLAN_PRO=P-...,\
PAYPAL_PLAN_PROPLUS=P-...,\
PAYPAL_PLAN_ENTERPRISE=P-...
```

When you go live, repeat Step 1–3 in **Live** mode and update:

```bash
gcloud run services update gameclaw --region us-central1 --update-env-vars=PAYPAL_ENV=live
```

## Step 5 — Test in sandbox

1. Sandbox → **Sandbox accounts**: create a personal buyer account (with funded PayPal sandbox balance)
2. On `https://gogameclaw.com/pricing`, click **Subscribe**
3. PayPal redirects to the sandbox approval page → log in with the sandbox buyer
4. Approve → redirected to `/settings/billing?subscribed=1`
5. Within ~30s, the webhook fires `BILLING.SUBSCRIPTION.ACTIVATED` → user's tier upgrades
6. Verify in `/settings/billing`: tier should show as Pro/Pro+/Enterprise

## Troubleshooting

- **"PayPal not configured" error on subscribe** → secrets still have `TBD` values. Re-run Step 4.
- **Subscription created but tier never upgrades** → check webhook events in `gcloud logging read 'resource.type=cloud_run_revision AND textPayload:"paypal webhook"' --limit=20`
- **Webhook signature verification failing** → ensure `PAYPAL_WEBHOOK_ID` matches exactly what the dashboard shows. Set `PAYPAL_VERIFY_WEBHOOKS=false` to bypass during initial setup (re-enable for live).
- **Billing dashboard shows "canceling" but UI still shows Pro** → wait for the `BILLING.SUBSCRIPTION.CANCELLED` webhook, or refresh after a few seconds.
