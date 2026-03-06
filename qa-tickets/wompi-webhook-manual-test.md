# Wompi Webhook — Manual Test Guide

## Endpoint

```
POST /v1/payments/webhook/wompi
```

- **Auth**: none (public, `@Public()`)
- **Wompi dashboard config**: Events → Webhook URL → `https://api.deorigencampesino.com/v1/payments/webhook/wompi`

---

## How It Works

1. Frontend creates an order via `POST /v1/orders` → gets `orderNumber` (e.g. `DO-ABC123-0001`).
2. Frontend calls `POST /v1/payments/checkout` with `orderId` → gets back `orderNumber`.
3. Frontend opens Wompi Widget with `reference: orderNumber`.
4. When the buyer pays, Wompi POSTs `transaction.updated` to this endpoint.
5. Handler looks up the order by `orderNumber`, finds its PENDING payment, sets:
   - `APPROVED` → `Payment.status = PAID`, `Order.status = CONFIRMED`, sends confirmation email.
   - Any other status → `Payment.status = FAILED`, order stays `PENDING` (buyer can retry).

---

## Signature Validation

Set `WOMPI_EVENT_KEY` in `.env` (copy from Wompi Dashboard → Developers → Events).  
Without the key, signature validation is **skipped** (MVP mode). With the key, the handler
computes `SHA256(prop_values_concat + eventKey)` and rejects mismatched checksums with `401`.

```env
# .env
WOMPI_EVENT_KEY=your_event_key_from_dashboard
```

---

## Curl Examples

### Setup — get an orderNumber to use

```bash
# 1. Login as buyer
TOKEN=$(curl -s -X POST http://localhost:3001/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@example.com","password":"Buyer123!"}' | jq -r .accessToken)

# 2. Create order
ORDER=$(curl -s -X POST http://localhost:3001/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":"<product-id>","quantity":1}],"fulfillmentType":"LOCAL_WAREHOUSE"}')

ORDER_NUMBER=$(echo $ORDER | jq -r .orderNumber)
ORDER_ID=$(echo $ORDER | jq -r .id)
echo "orderNumber=$ORDER_NUMBER"

# 3. Create payment record
curl -s -X POST http://localhost:3001/v1/payments/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER_ID\"}" | jq .
```

---

### Test A — APPROVED (happy path)

```bash
curl -s -X POST http://localhost:3001/v1/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d "{
    \"event\": \"transaction.updated\",
    \"data\": {
      \"transaction\": {
        \"id\": \"wompi-tx-test-001\",
        \"reference\": \"$ORDER_NUMBER\",
        \"status\": \"APPROVED\",
        \"amount_in_cents\": 1000000,
        \"currency\": \"COP\",
        \"payment_method_type\": \"CARD\"
      }
    },
    \"environment\": \"test\",
    \"timestamp\": 1741180800
  }" | jq .
```

**Expected response:**
```json
{ "received": true, "matched": true, "status": "PAID" }
```

**Expected side-effects:**
- `Payment.status` → `PAID`, `Payment.externalId` → `wompi-tx-test-001`
- `Order.status` → `CONFIRMED`, `Order.paidAt` set
- `OrderEvent` created with note `"Pago Wompi confirmado. TX: wompi-tx-test-001"`
- Confirmation email sent to buyer (mock-logged in backend console)

---

### Test B — DECLINED (failure path)

```bash
curl -s -X POST http://localhost:3001/v1/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d "{
    \"event\": \"transaction.updated\",
    \"data\": {
      \"transaction\": {
        \"id\": \"wompi-tx-test-002\",
        \"reference\": \"$ORDER_NUMBER\",
        \"status\": \"DECLINED\",
        \"amount_in_cents\": 1000000,
        \"currency\": \"COP\"
      }
    },
    \"environment\": \"test\",
    \"timestamp\": 1741180800
  }" | jq .
```

**Expected response:**
```json
{ "received": true, "matched": true, "status": "FAILED" }
```

**Expected side-effects:**
- `Payment.status` → `FAILED`
- Order stays `PENDING` (buyer can retry payment)
- `OrderEvent` created with note `"Pago Wompi fallido (DECLINED). TX: wompi-tx-test-002"`

> **Note:** VOIDED and ERROR map to FAILED the same way.

---

### Test C — Unknown reference (no matching order)

```bash
curl -s -X POST http://localhost:3001/v1/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "wompi-tx-test-003",
        "reference": "DO-NONEXISTENT-0000",
        "status": "APPROVED",
        "amount_in_cents": 5000,
        "currency": "COP"
      }
    },
    "environment": "test",
    "timestamp": 1741180800
  }' | jq .
```

**Expected response:**
```json
{ "received": true, "matched": false }
```

---

### Test D — Missing data.transaction (malformed payload)

```bash
curl -s -X POST http://localhost:3001/v1/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d '{"event":"ping"}' | jq .
```

**Expected response:**
```json
{ "received": true, "matched": false }
```

---

### Test E — With signature (when WOMPI_EVENT_KEY is set)

The properties Wompi signs are:
`transaction.id + transaction.status + transaction.amount_in_cents + WOMPI_EVENT_KEY`

```bash
# In production Wompi sends a real checksum; in test generate it:
EVENT_KEY="your_event_key_here"
TX_ID="wompi-tx-test-001"
STATUS="APPROVED"
AMOUNT=1000000
RAW="${TX_ID}${STATUS}${AMOUNT}${EVENT_KEY}"
CHECKSUM=$(echo -n "$RAW" | sha256sum | awk '{print $1}')

curl -s -X POST http://localhost:3001/v1/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d "{
    \"event\": \"transaction.updated\",
    \"data\": {
      \"transaction\": {
        \"id\": \"$TX_ID\",
        \"reference\": \"$ORDER_NUMBER\",
        \"status\": \"$STATUS\",
        \"amount_in_cents\": $AMOUNT,
        \"currency\": \"COP\"
      }
    },
    \"environment\": \"test\",
    \"timestamp\": 1741180800,
    \"signature\": {
      \"checksum\": \"$CHECKSUM\",
      \"properties\": [\"transaction.id\", \"transaction.status\", \"transaction.amount_in_cents\"]
    }
  }" | jq .
```

---

## Verify DB State (after Test A)

```bash
# Check payment
curl -s http://localhost:3001/v1/payments/transaction/<paymentId> \
  -H "Authorization: Bearer $TOKEN" | jq '{status, externalId}'
# → { "status": "PAID", "externalId": "wompi-tx-test-001" }

# Check order
curl -s http://localhost:3001/v1/orders/<orderId> \
  -H "Authorization: Bearer $TOKEN" | jq '{status, paidAt}'
# → { "status": "CONFIRMED", "paidAt": "2026-03-05T..." }
```

---

## What's Left for Production

1. Set `WOMPI_EVENT_KEY` in production `.env` to enable strict signature validation
2. Ensure HTTPS on the webhook URL (Wompi requires it in production)
3. In `createCheckout`, pass `provider: "wompi"` when creating the payment record
4. Frontend: open Wompi Widget with `reference: orderNumber` and `currency: "COP"` (amount in cents)
5. Consider idempotency: if Wompi retries, a second webhook call will find no PENDING payment and return `matched: false` gracefully (safe)
