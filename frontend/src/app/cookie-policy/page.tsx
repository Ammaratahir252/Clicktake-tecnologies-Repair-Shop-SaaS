import Link from 'next/link';

export const metadata = { title: 'Cookie Policy — DibnowRepairSaaS' };

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-sm hover:underline">← Home</Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-600 text-sm font-medium">Cookie Policy</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-stone-400 font-medium mb-2">Last updated: June 2026</p>
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Cookie Policy</h1>
        <div className="space-y-6 text-stone-700 leading-relaxed">
          <p>DibnowRepairSaaS uses only essential cookies necessary for the operation of the service. We do not use tracking, advertising, or analytics cookies.</p>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Essential Cookies</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-stone-200 rounded-xl text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {['Name', 'Purpose', 'Duration', 'Type'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-bold text-stone-600 border-b border-stone-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['token', 'Authentication JWT token for session management', '1 day', 'HTTP-only, Secure'],
                    ['__stripe_sid', 'Stripe payment session identifier', 'Session', 'Third-party (Stripe)'],
                    ['__stripe_mid', 'Stripe machine identifier for fraud detection', '1 year', 'Third-party (Stripe)'],
                  ].map(([name, purpose, duration, type]) => (
                    <tr key={name} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-stone-800">{name}</td>
                      <td className="px-4 py-3 text-stone-600">{purpose}</td>
                      <td className="px-4 py-3 text-stone-600">{duration}</td>
                      <td className="px-4 py-3 text-stone-500 text-xs">{type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Managing Cookies</h2>
            <p>Since we only use essential cookies, disabling them will prevent you from logging in. You can clear cookies via your browser settings. For more information, visit <a href="https://allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">allaboutcookies.org</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Contact</h2>
            <p>Questions about our cookie use? Email <a href="mailto:privacy@dibnow.com" className="text-blue-600 hover:underline">privacy@dibnow.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
