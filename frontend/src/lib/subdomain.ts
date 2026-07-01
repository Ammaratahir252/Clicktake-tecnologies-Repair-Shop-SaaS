import Tenant from '@/models/tenant.model';
import connectDB from '@/lib/db';

/**
 * Extracts the subdomain from a hostname string.
 * Example: 'elitetech.dibnow.com' -> 'elitetech'
 * Example: 'elitetech.localhost:3000' -> 'elitetech'
 * Returns null if it is the main domain or 'www'.
 */
export function extractSubdomain(hostname: string): string | null {
  if (!hostname) return null;
  
  // Remove port if present
  const host = hostname.split(':')[0];
  
  if (host === 'localhost' || host === 'dibnow.com' || host === 'www.dibnow.com') {
    return null;
  }
  
  const parts = host.split('.');
  
  // Production
  if (parts.length > 2 && host.endsWith('dibnow.com')) {
    const sub = parts[0];
    return sub === 'www' ? null : sub;
  }
  
  // Local development
  if (parts.length > 1 && host.endsWith('localhost')) {
    const sub = parts[0];
    return sub === 'www' ? null : sub;
  }

  return null;
}

/**
 * Resolves a subdomain string to a Tenant document.
 */
export async function getTenantBySubdomain(subdomain: string) {
  if (!subdomain) return null;
  await connectDB();
  const tenant = await Tenant.findOne({ 
    subdomain: subdomain.toLowerCase(), 
    isActive: true 
  });
  return tenant;
}
