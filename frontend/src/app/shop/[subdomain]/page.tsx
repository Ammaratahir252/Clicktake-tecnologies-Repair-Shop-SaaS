import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import connectDB from "@/lib/db";
import Tenant from "@/models/tenant.model";
import Review from "@/models/review.model";
import { getJwtSecretBytes } from "@/lib/auth/jwtSecret";

export const dynamic = "force-dynamic";

// Platform staff (super_admin, scoped admin) can open ANY shop's page from the
// admin panel for moderation/support — regardless of whether the owner has
// opted into the public directory (`isPubliclyVisible`). Everyone else only
// ever sees shops that are actually public.
async function isAdminViewer(): Promise<boolean> {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload.role === "super_admin" || payload.role === "admin";
  } catch {
    return false;
  }
}

async function getShop(subdomain: string) {
  await connectDB();
  const isAdmin = await isAdminViewer();
  const tenant = await Tenant.findOne({
    subdomain: subdomain.toLowerCase(),
    isActive: true,
    ...(isAdmin ? {} : { isPubliclyVisible: true }),
  }).lean() as any;
  return tenant;
}

async function getReviews(tenantId: string) {
  const reviews = await Review.find({ tenantId, isPublic: true })
    .sort({ createdAt: -1 })
    .limit(9)
    .select('customerName rating comment createdAt')
    .lean();
  return reviews as any[];
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter",
  website: "Website",
};

export default async function ShopPage({ params }: { params: { subdomain: string } }) {
  const shop = await getShop(params.subdomain);

  if (!shop) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Shop not found</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            There&apos;s no shop publicly available at &ldquo;{params.subdomain}&rdquo;. Double-check the link or contact the shop directly.
          </p>
        </div>
      </main>
    );
  }

  const reviews = shop.showReviewsPublicly ? await getReviews(shop._id.toString()) : [];
  const socialEntries = Object.entries(shop.socialLinks || {}).filter(([, v]) => !!v) as [string, string][];

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{
        background: shop.bannerUrl ? `linear-gradient(rgba(29,78,216,0.75),rgba(29,78,216,0.85)), url(${shop.bannerUrl})` : "#1d4ed8",
        backgroundSize: "cover", backgroundPosition: "center",
        color: "#fff", padding: "48px 24px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 20 }}>
          {shop.logo && (
            <Image src={shop.logo} alt={shop.name} width={72} height={72} style={{ borderRadius: 16, objectFit: "cover", border: "2px solid rgba(255,255,255,0.4)", background: "#fff", flexShrink: 0 }} />
          )}
          <div>
            <p style={{ fontSize: 13, opacity: 0.85, fontWeight: 600, marginBottom: 6 }}>{shop.subdomain}.dibnow.com</p>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>{shop.name}</h1>
            {shop.tagline && <p style={{ fontSize: 15, opacity: 0.9 }}>{shop.tagline}</p>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
        {shop.description && (
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>About this shop</h2>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{shop.description}</p>
          </section>
        )}

        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Contact &amp; Location</h2>
          <div style={{ display: "grid", gap: 8, fontSize: 14, color: "#475569" }}>
            {shop.phone && <p><strong style={{ color: "#0f172a" }}>Phone:</strong> {shop.phone}</p>}
            {shop.email && <p><strong style={{ color: "#0f172a" }}>Email:</strong> {shop.email}</p>}
            {(shop.address || shop.city) && (
              <p><strong style={{ color: "#0f172a" }}>Address:</strong> {[shop.address, shop.city, shop.postcode].filter(Boolean).join(", ")}</p>
            )}
            {shop.openingHours && <p><strong style={{ color: "#0f172a" }}>Hours:</strong> {shop.openingHours}</p>}
          </div>
          {socialEntries.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
              {socialEntries.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", padding: "6px 12px", borderRadius: 999, textDecoration: "none" }}>
                  {SOCIAL_LABELS[key] || key}
                </a>
              ))}
            </div>
          )}
        </section>

        {(shop.servicesOffered?.length > 0 || shop.acceptedDevices?.length > 0) && (
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
            {shop.servicesOffered?.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Services</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: shop.acceptedDevices?.length ? 16 : 0 }}>
                  {shop.servicesOffered.map((s: string) => (
                    <span key={s} style={{ fontSize: 12, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: 999 }}>{s}</span>
                  ))}
                </div>
              </>
            )}
            {shop.acceptedDevices?.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Devices Repaired</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {shop.acceptedDevices.map((d: string) => (
                    <span key={d} style={{ fontSize: 12, fontWeight: 600, background: "#f0fdf4", color: "#16a34a", padding: "4px 10px", borderRadius: 999 }}>{d}</span>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {shop.team?.length > 0 && (
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Meet the team</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
              {shop.team.map((member: any, i: number) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", width: 64, height: 64, borderRadius: "50%", margin: "0 auto 10px", overflow: "hidden", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {member.photoUrl
                      ? <Image src={member.photoUrl} alt={member.name} fill sizes="64px" style={{ objectFit: "cover" }} />
                      : <span style={{ fontSize: 20, fontWeight: 800, color: "#1d4ed8" }}>{member.name?.[0]?.toUpperCase()}</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{member.name}</p>
                  {member.title && <p style={{ fontSize: 11, color: "#64748b" }}>{member.title}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {reviews.length > 0 && (
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>Customer reviews</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {reviews.map((r: any) => (
                <div key={r._id} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.customerName}</span>
                    <span style={{ fontSize: 12, color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20, textAlign: "center" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Existing customer?</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Log in to track your repair or book a new one with {shop.name}.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{ background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
              Log In
            </Link>
            <Link href={`/register?tenantId=${shop._id}`} style={{ background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, textDecoration: "none" }}>
              Create Customer Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
