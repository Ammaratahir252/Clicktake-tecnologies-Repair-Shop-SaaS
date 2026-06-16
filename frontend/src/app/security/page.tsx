import Link from 'next/link';

export const metadata = { title: 'Security — DibnowRepairSaaS' };

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-sm hover:underline">← Home</Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-600 text-sm font-medium">Security</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-stone-400 font-medium mb-2">Last updated: June 2026</p>
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Security Practices</h1>
        <p className="text-stone-600 mb-10">We take the security of your data seriously. Here's how we protect your information.</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            { title: 'Password Hashing', body: 'All passwords are hashed using bcrypt with salt factor 12. We never store plaintext passwords.', icon: '🔐' },
            { title: 'JWT Authentication', body: 'Sessions use signed JWT tokens with short expiry. Tokens support version-based revocation.', icon: '🎟️' },
            { title: 'Account Lockout', body: 'After 5 failed login attempts, accounts are locked for 15 minutes to prevent brute-force attacks.', icon: '🔒' },
            { title: 'Data Encryption', body: 'Sensitive fields (payment provider keys) are encrypted at rest using AES-256.', icon: '🛡️' },
            { title: 'Multi-tenant Isolation', body: 'Every database query is scoped to a tenant ID. Cross-tenant data access is architecturally impossible.', icon: '🏗️' },
            { title: 'HTTPS Only', body: 'All traffic is served over TLS. HTTP connections are automatically redirected to HTTPS.', icon: '🌐' },
            { title: 'Immutable Audit Logs', body: 'All sensitive actions are logged in an append-only audit trail. Logs cannot be deleted or modified.', icon: '📜' },
            { title: 'Payment Security', body: 'Card data is never stored or transmitted through our servers. All payments use Stripe\'s PCI-DSS compliant infrastructure.', icon: '💳' },
          ].map(({ title, body, icon }) => (
            <div key={title} className="bg-white border border-stone-200 rounded-2xl p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="font-bold text-stone-800 mb-1">{title}</h3>
              <p className="text-sm text-stone-600">{body}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="font-bold text-amber-900 mb-2">Report a Vulnerability</h2>
          <p className="text-sm text-amber-800">Found a security issue? Please disclose it responsibly by emailing <a href="mailto:security@dibnow.com" className="font-bold underline">security@dibnow.com</a>. We commit to acknowledging reports within 24 hours and resolving confirmed vulnerabilities within 90 days. We do not take legal action against good-faith security researchers.</p>
        </div>
      </div>
    </div>
  );
}
