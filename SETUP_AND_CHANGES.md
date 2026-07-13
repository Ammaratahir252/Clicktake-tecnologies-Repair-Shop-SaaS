# DibnowRepairSaaS — Setup & Changes Guide

## ⚠️ SECURITY — DO THIS FIRST

Your credentials were exposed in the chat. Immediately regenerate:

1. **MongoDB** → Atlas → Security → Database Access → Reset user password
2. **Groq API Key** → console.groq.com → Keys → Delete old, create new
3. **JWT Secrets** → Generate fresh ones:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Run twice — one for JWT_SECRET, one for JWT_REFRESH_SECRET
4. **Brevo** → Settings → API Keys → Regenerate
5. **Cloudinary** → Settings → Access Keys → Regenerate secret

Then update `frontend/.env.local` with the new values.

---

## What Changed in This Version

### New File: `frontend/src/lib/ai/providers.ts`
Unified AI module with three providers:

| Function | Provider | Used For | Cost |
|----------|----------|----------|------|
| `callGroq()` | Groq llama-3.3-70b | Chat, automation validation | Free |
| `callOpenAI()` | GPT-4o-mini | Cost estimation | ~$0.0001/call |
| `callGemini()` | Gemini 1.5-flash | Diagnostics, forecasting | Free tier |

### Updated AI Routes
| Route | Before | After |
|-------|--------|-------|
| `api/ai/chat` | Groq | Groq ✅ (unchanged) |
| `api/ai/automation` | Groq | Groq ✅ (unchanged) |
| `api/ai/diagnostic` | Groq | **Gemini** (bigger context) |
| `api/ai/estimate` | Groq | **OpenAI** (better numbers) |
| `api/ai/forecast` | Groq | **Gemini** (bigger context) |

### Updated `frontend/.env.local`
All three AI keys are now listed with instructions.

### Updated `frontend/package.json`
Added `"openai": "^4.67.0"` to dependencies.

---

## Step 1 — Get Your 3 AI Keys

### Groq (FREE)
1. Go to https://console.groq.com/keys
2. Create key → copy it
3. Set `GROQ_API_KEY=gsk_xxx` in `.env.local`

### OpenAI — ChatGPT (PAID but very cheap)
1. Go to https://platform.openai.com/api-keys
2. Create key → copy it
3. Add $5 credit at https://platform.openai.com/settings/billing
4. Set `OPENAI_API_KEY=sk-proj-xxx` in `.env.local`
5. Cost: ~$0.15 per 1000 estimate calls

### Google Gemini (FREE generous tier)
1. Go to https://aistudio.google.com/app/apikey
2. Create API key → copy it
3. Set `GEMINI_API_KEY=AIzaSy_xxx` in `.env.local`
4. Free: 15 requests/minute, 1500/day

---

## Step 2 — Set Up Stripe Payment Plans

Your app currently has placeholder Stripe price IDs. Here's how to fix:

### 2a. Get Stripe Test Keys
1. Go to https://dashboard.stripe.com → toggle to **Test mode**
2. Developers → API Keys → copy Secret key (`sk_test_xxx`) and Publishable key (`pk_test_xxx`)
3. Add to `.env.local`

### 2b. Create 4 Subscription Products
1. Go to https://dashboard.stripe.com/products → **Add product**
2. Create: **Starter**, **Pro**, **Business**, **Enterprise**
3. For each: add a **recurring monthly price**
4. Click each price → copy the ID starting with `price_` (NOT `prod_`)
5. Add to `.env.local`:
   ```
   STRIPE_PRICE_STARTER=price_xxx
   STRIPE_PRICE_PRO=price_xxx
   STRIPE_PRICE_BUSINESS=price_xxx
   STRIPE_PRICE_ENTERPRISE=price_xxx
   ```

### 2c. Set Up Webhook
1. Go to https://dashboard.stripe.com/webhooks → **Add endpoint**
2. URL: `https://yourdomain.com/api/webhooks/stripe`
   - For local dev: use `ngrok http 3000` to get a public URL
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret (`whsec_xxx`) → add to `.env.local`

---

## Step 3 — Install New Dependency & Run

```bash
cd frontend
npm install          # installs the new openai package
npm run dev          # start development server
```

---

## Step 4 — Test Everything Works

### Test AI routes
```bash
# Test Gemini (diagnostic)
curl -X POST http://localhost:3000/api/ai/diagnostic \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "x-role: technician" \
  -d '{"deviceBrand": "Samsung", "deviceModel": "S23", "issue": "screen cracked"}'

# Test OpenAI (estimate)
curl -X POST http://localhost:3000/api/ai/estimate \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "x-role: technician" \
  -d '{"deviceBrand": "iPhone", "issue": "battery replacement"}'

# Test Groq (chat - unchanged)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my repair status?"}'
```

### Test Stripe billing
```bash
# Create a checkout session
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan": "starter", "email": "test@example.com", "tenantId": "YOUR_TENANT_ID"}'

# Use test card: 4242 4242 4242 4242 (any future date, any CVV)
```

---

## Common Errors & Fixes

| Error Message | Fix |
|--------------|-----|
| `GROQ_API_KEY is missing` | Add key to `.env.local` and restart dev server |
| `OPENAI_API_KEY is not set` | Add key to `.env.local` |
| `GEMINI_API_KEY is not set` | Add key to `.env.local` |
| `Stripe is not configured` | Add `STRIPE_SECRET_KEY` to `.env.local` |
| `Unknown plan "starter"` | Replace placeholder `STRIPE_PRICE_STARTER` with real `price_xxx` ID |
| `No such price 'price_replace...'` | Same as above — need real Stripe price IDs |
| Webhook returns 400 | `STRIPE_WEBHOOK_SECRET` wrong or endpoint URL mismatch |
| `Cannot find module 'groq-sdk'` | Run `npm install` in the frontend directory |
