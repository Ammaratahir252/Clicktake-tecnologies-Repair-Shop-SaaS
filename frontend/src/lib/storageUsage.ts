import 'server-only';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import Lead from '@/models/lead.model';

/**
 * Real per-tenant storage measurement. This app has no file-upload pipeline for
 * tenant data yet (ticket "photos" are a client-only mock, never persisted) — so
 * "storage" here means the actual BSON size of everything a tenant has stored in
 * MongoDB (tickets, customers, leads). That's a genuine, live number, not a
 * placeholder — it just measures document data rather than uploaded files, since
 * no file storage exists to measure yet.
 */
async function bsonSizeForTenant(Model: any, tenantId: any): Promise<number> {
  const result = await Model.aggregate([
    { $match: { tenantId } },
    { $group: { _id: null, size: { $sum: { $bsonSize: '$$ROOT' } } } },
  ]);
  return result[0]?.size ?? 0;
}

export interface TenantStorageUsage {
  tenantId: string;
  tenantName: string;
  usedBytes: number;
  usedMb: number;
  capMb: number;
  pctUsed: number;
  overCap: boolean;
}

export async function getStorageUsageByTenant(capMb: number): Promise<TenantStorageUsage[]> {
  await connectDB();
  const tenants = await Tenant.find().select('name').lean();

  const usages = await Promise.all(
    tenants.map(async (t: any) => {
      const [tickets, customers, leads] = await Promise.all([
        bsonSizeForTenant(Ticket, t._id),
        bsonSizeForTenant(Customer, t._id),
        bsonSizeForTenant(Lead, t._id),
      ]);
      const usedBytes = tickets + customers + leads;
      const usedMb = usedBytes / (1024 * 1024);
      return {
        tenantId: String(t._id),
        tenantName: t.name,
        usedBytes,
        usedMb,
        capMb,
        pctUsed: capMb > 0 ? (usedMb / capMb) * 100 : 0,
        overCap: capMb > 0 && usedMb > capMb,
      };
    })
  );

  return usages.sort((a, b) => b.usedBytes - a.usedBytes);
}
