// Mock env (avoids real env validation requiring APP_URL/JWT secrets etc.)
jest.mock('../../../config/env', () => ({
  env: {
    ENCRYPTION_KEY: '12345678901234567890123456789012',
    APP_URL: 'http://localhost:4001',
  },
}));

// Mock logger (errorHandler imports it)
jest.mock('../../../utils/logger', () => ({
  logger: {
    info:  jest.fn(),
    error: jest.fn(),
    warn:  jest.fn(),
  },
}));

// Mock the entire service layer — no DB calls in route tests
jest.mock('../service/delivery.service', () => ({
  bookDeliveryJob:        jest.fn(),
  assignDriver:           jest.fn(),
  updateDeliveryStatus:   jest.fn(),
  recordGpsPing:          jest.fn(),
  getLiveDriverLocation:  jest.fn(),
  completeDeliveryJob:    jest.fn(),
  anonymiseJobForErasure: jest.fn(),
  getDeliveryJob:         jest.fn(),
  listDeliveryJobs:       jest.fn(),
  getDriverActiveJobs:    jest.fn(),
  upsertServiceZone:      jest.fn(),
  listServiceZones:       jest.fn(),
  checkPostcodeInZone:    jest.fn(),
}));

import Fastify, { FastifyInstance } from 'fastify';
import { deliveryRoutes } from '../routes/delivery.routes';
import { registerErrorHandler } from '../../../middleware/errorHandler';
import { UserRole } from '../../../types';
import * as deliveryService from '../service/delivery.service';

// ─── Helpers ────────────────────────────────────────────────
const makeToken = (payload: object) =>
  Buffer.from(JSON.stringify(payload)).toString('base64');

const authHeaders = (role: UserRole, extra: Record<string, string> = {}) => ({
  authorization: `Bearer ${makeToken({ userId: 'u1', role, email: 'a@b.com' })}`,
  'x-tenant-id': 'tenant-001',
  ...extra,
});

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(deliveryRoutes, { prefix: '/api/delivery' });
  registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// PUBLIC — /check-zone
// ─────────────────────────────────────────────────────────────
describe('GET /api/delivery/check-zone', () => {
  it('returns 400 when postcode is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/delivery/check-zone' });
    expect(res.statusCode).toBe(400);
    console.log('BODY1:', JSON.stringify(res.json()));
});

  it('returns 400 for invalid UK postcode format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/check-zone?postcode=NOTAPOSTCODE',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 for a valid postcode and calls the service', async () => {
    (deliveryService.checkPostcodeInZone as jest.Mock).mockResolvedValue({
      inZone: true,
      message: 'We deliver to your area!',
      fee: 5,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/check-zone?postcode=SW1A 2AA',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.inZone).toBe(true);
    expect(deliveryService.checkPostcodeInZone).toHaveBeenCalledTimes(1);
  });

  it('does not require authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/check-zone?postcode=M1 1AE',
    });
    // not 401 — public route
    expect(res.statusCode).not.toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH / TENANT GUARDS on protected routes
// ─────────────────────────────────────────────────────────────
describe('auth + tenant guards', () => {
  it('returns 401 when Authorization header missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/my-jobs',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when X-Tenant-ID header missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/my-jobs',
      headers: {
        authorization: `Bearer ${makeToken({ userId: 'u1', role: UserRole.DRIVER, email: 'a@b.com' })}`,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when role is not permitted for the route', async () => {
    // CUSTOMER not allowed on GET /jobs (ops dashboard)
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/jobs',
      headers: authHeaders(UserRole.CUSTOMER),
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /jobs — book a delivery
// ─────────────────────────────────────────────────────────────
describe('POST /api/delivery/jobs', () => {
  const validBody = {
    customerId: '507f1f77bcf86cd799439011',
    jobType: 'pickup',
    address: {
      line1: '10 Downing Street',
      city: 'London',
      postcode: 'SW1A 2AA',
      country: 'GB',
    },
    preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timeSlot: 'anytime',
    paymentMethod: 'cash',
    gdprConsent: {
      consentGiven: true,
      consentText: 'I agree to data processing for delivery purposes.',
    },
  };

  it('returns 400 on invalid body (missing gdprConsent)', async () => {
    const { gdprConsent, ...bad } = validBody;
    const res = await app.inject({
      method: 'POST',
      url: '/api/delivery/jobs',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: bad,
    });
    expect(res.statusCode).toBe(400);
    console.log('BODY2:', JSON.stringify(res.json()));
  });

  it('returns 201 and the booked job on valid body', async () => {
    (deliveryService.bookDeliveryJob as jest.Mock).mockResolvedValue({
      _id: 'job123',
      status: 'pending',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/delivery/jobs',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data._id).toBe('job123');
    expect(deliveryService.bookDeliveryJob).toHaveBeenCalledTimes(1);
  });

  it('returns 403 for DRIVER role (not allowed to book)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/delivery/jobs',
      headers: authHeaders(UserRole.DRIVER),
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /jobs/:id
// ─────────────────────────────────────────────────────────────
describe('GET /api/delivery/jobs/:id', () => {
  it('returns 200 with job data', async () => {
    (deliveryService.getDeliveryJob as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      status: 'assigned',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/jobs/507f1f77bcf86cd799439099',
      headers: authHeaders(UserRole.MANAGER),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('assigned');
  });
});

// ─────────────────────────────────────────────────────────────
// GET /my-jobs — driver self-service
// ─────────────────────────────────────────────────────────────
describe('GET /api/delivery/my-jobs', () => {
  it('returns 200 for DRIVER role', async () => {
    (deliveryService.getDriverActiveJobs as jest.Mock).mockResolvedValue([
      { _id: 'job1', status: 'en_route' },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/my-jobs',
      headers: authHeaders(UserRole.DRIVER),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it('returns 403 for CUSTOMER role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/delivery/my-jobs',
      headers: authHeaders(UserRole.CUSTOMER),
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /zones — service zone creation
// ─────────────────────────────────────────────────────────────
describe('POST /api/delivery/zones', () => {
  const validZone = {
    name: 'Central London',
    postcodeDistricts: ['SW1', 'EC2'],
    pricingModel: 'flat_postcode',
    baseFeeExVat: 4.99,
  };

  it('returns 403 for FRONTDESK role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/delivery/zones',
      headers: authHeaders(UserRole.FRONTDESK),
      payload: validZone,
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 201 for OWNER role with valid body', async () => {
    (deliveryService.upsertServiceZone as jest.Mock).mockResolvedValue({
      _id: 'zone1',
      name: 'Central London',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/delivery/zones',
      headers: authHeaders(UserRole.OWNER),
      payload: validZone,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Central London');
  });
});