# DibnowRepairSaaS — Module 9: Doorstep Delivery & Logistics (UK)

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env .env.local
# Edit .env with your MongoDB URI and Redis connection
```

### 3. Run unit tests (no DB or Redis needed)
```bash
npm test
```

### 4. Start the dev server
```bash
npm run dev
# Server starts on http://localhost:4001
```

---

## Testing the API

### Step 1 — Health check
```bash
curl http://localhost:4001/health
```
Expected: `{"success":true,"data":{"status":"healthy",...}}`

---

### Step 2 — Generate a test JWT
The dev auth middleware accepts base64-encoded JSON tokens. Generate one:

```bash
node -e "
const payload = {
  userId:   '507f1f77bcf86cd799439001',
  role:     'owner',
  email:    'owner@testshop.com'
};
console.log(Buffer.from(JSON.stringify(payload)).toString('base64'));
"
```

Copy the output — use it as your Bearer token.

---

### Step 3 — Check if a postcode is in your delivery zone
```bash
# First create a zone (Step 5), then check it
curl "http://localhost:4001/api/delivery/check-zone?postcode=SW1A+2AA"
```

---

### Step 4 — Create a service zone (requires auth)
```bash
TOKEN="<your-base64-token>"
TENANT="507f1f77bcf86cd799430001"

curl -X POST http://localhost:4001/api/delivery/zones \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Central London",
    "postcodeDistricts": ["SW1A", "SW1", "EC1", "EC2"],
    "pricingModel": "flat_postcode",
    "baseFeeExVat": 5.00,
    "maxDistanceKm": 15
  }'
```

---

### Step 5 — Book a doorstep pickup
```bash
curl -X POST http://localhost:4001/api/delivery/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "507f1f77bcf86cd799439011",
    "jobType": "pickup",
    "address": {
      "line1": "10 Downing Street",
      "city": "London",
      "postcode": "SW1A 2AA",
      "country": "GB"
    },
    "preferredDate": "2026-08-15T09:00:00Z",
    "timeSlot": "08:00-12:00",
    "paymentMethod": "cash",
    "gdprConsent": {
      "consentGiven": true,
      "consentText": "I consent to my personal data being processed for this collection booking."
    }
  }'
```

---

### Step 6 — Assign a driver
```bash
JOB_ID="<job-id-from-step-5>"

curl -X PATCH http://localhost:4001/api/delivery/jobs/$JOB_ID/assign-driver \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"driverId": "507f1f77bcf86cd799439099"}'
```

---

### Step 7 — Generate a driver token and go en route
```bash
DRIVER_TOKEN=$(node -e "
const p = { userId: '507f1f77bcf86cd799439099', role: 'driver', email: 'driver@testshop.com' };
console.log(Buffer.from(JSON.stringify(p)).toString('base64'));
")

curl -X PATCH http://localhost:4001/api/delivery/jobs/$JOB_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"status": "en_route", "gpsLat": 51.5074, "gpsLng": -0.1278}'
```

---

### Step 8 — GPS ping (every 30 seconds in real use)
```bash
curl -X POST http://localhost:4001/api/delivery/jobs/$JOB_ID/gps-ping \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"lat": 51.5014, "lng": -0.1419}'
```

---

### Step 9 — Check live driver location (customer portal view)
```bash
curl http://localhost:4001/api/delivery/jobs/$JOB_ID/live-location \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT"
```

---

### Step 10 — Complete delivery with proof
```bash
curl -X POST http://localhost:4001/api/delivery/jobs/$JOB_ID/complete \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "proofPhotoUrl": "https://res.cloudinary.com/test/image/upload/proof.jpg",
    "deviceConditionNotes": "Device returned in good condition, screen replaced.",
    "paymentCollected": 120.00
  }'
```

---

## Module 9 API reference

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET    | `/health` | Public | Health check |
| GET    | `/api/delivery/check-zone?postcode=SW1A+2AA` | Public | Check if postcode is covered |
| POST   | `/api/delivery/jobs` | Owner/Manager/FrontDesk/Customer | Book pickup or delivery |
| GET    | `/api/delivery/jobs` | Owner/Manager/FrontDesk | List all jobs (paginated) |
| GET    | `/api/delivery/jobs/:id` | All authenticated | Get single job |
| PATCH  | `/api/delivery/jobs/:id/assign-driver` | Owner/Manager | Assign driver |
| PATCH  | `/api/delivery/jobs/:id/status` | Driver/Owner/Manager | Update job status |
| POST   | `/api/delivery/jobs/:id/gps-ping` | Driver | Send live GPS location |
| GET    | `/api/delivery/jobs/:id/live-location` | All authenticated | Get current driver location |
| POST   | `/api/delivery/jobs/:id/complete` | Driver | Complete with proof of delivery |
| POST   | `/api/delivery/jobs/:id/erase` | Owner/Manager | UK GDPR right-to-erasure |
| GET    | `/api/delivery/my-jobs` | Driver | Driver's own active jobs |
| GET    | `/api/delivery/zones` | All authenticated | List service zones |
| POST   | `/api/delivery/zones` | Owner/Manager | Create service zone |
| PATCH  | `/api/delivery/zones/:id` | Owner/Manager | Update service zone |

---

## Project structure

```
src/
├── server.ts                         # Entry point
├── types/index.ts                    # UserRole enum, Fastify augmentation
├── errors/index.ts                   # AppError, ValidationError, NotFoundError etc.
├── config/
│   ├── mongodb.ts                    # Mongoose connection
│   └── redis.ts                      # ioredis client + GPS key helpers
├── middleware/
│   ├── authMiddleware.ts             # JWT validation (base64 JSON in dev)
│   ├── tenantMiddleware.ts           # X-Tenant-ID extraction
│   ├── roleMiddleware.ts             # requireRole([...]) factory
│   └── errorHandler.ts              # Global Fastify error handler
├── models/
│   └── auditLog.model.ts            # Append-only audit trail
├── utils/
│   └── logger.ts                    # Console JSON logger
└── modules/delivery/
    ├── model/
    │   ├── delivery.model.ts         # DeliveryJob Mongoose schema
    │   └── serviceZone.model.ts     # ServiceZone Mongoose schema
    ├── service/delivery.service.ts  # All business logic (14 functions)
    ├── controller/delivery.controller.ts  # Thin HTTP layer
    ├── routes/delivery.routes.ts    # Route registration + RBAC
    ├── validators/delivery.validators.ts  # Zod schemas
    ├── utils/
    │   ├── postcode.utils.ts        # Royal Mail postcode + postcodes.io
    │   └── pricing.utils.ts         # 4 pricing models + VAT engine
    └── __tests__/delivery.test.ts   # Unit test suite
```
