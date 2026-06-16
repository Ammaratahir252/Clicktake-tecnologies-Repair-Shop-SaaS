import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — DibnowRepairSaaS' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-sm hover:underline">← Home</Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-600 text-sm font-medium">Privacy Policy</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-stone-400 font-medium mb-2">Last updated: June 2026</p>
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-stone max-w-none space-y-6 text-stone-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">1. Who We Are</h2>
            <p>DibnowRepairSaaS is operated by Clicktake Technologies. We provide a multi-tenant SaaS platform for repair shop management. Our registered address and data controller details are available on request at <a href="mailto:privacy@dibnow.com" className="text-blue-600 hover:underline">privacy@dibnow.com</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> Name, email, password (hashed), phone number, role.</li>
              <li><strong>Repair data:</strong> Device information, repair notes, photos, and status history.</li>
              <li><strong>Payment data:</strong> Transaction records (we do not store raw card numbers — payments processed via Stripe).</li>
              <li><strong>Usage data:</strong> IP address, browser type, pages visited, timestamps.</li>
              <li><strong>Location data:</strong> GPS coordinates for driver delivery tracking (stored temporarily in Redis, TTL 10 minutes).</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the repair management platform.</li>
              <li>To send transactional notifications (repair updates, invoice confirmations).</li>
              <li>To process payments securely via Stripe.</li>
              <li>To detect fraud and maintain security audit logs.</li>
              <li>To comply with UK HMRC financial record-keeping requirements (7 years).</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">4. Legal Basis (UK GDPR)</h2>
            <p>We process personal data under the following lawful bases: <strong>Contract</strong> (providing our service), <strong>Legitimate Interests</strong> (fraud prevention, security), <strong>Legal Obligation</strong> (HMRC records), and <strong>Consent</strong> (marketing communications, where applicable).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">5. Data Retention</h2>
            <p>Repair job records are retained for 12 months by default. Financial records are kept for 7 years per HMRC requirements. You may request deletion of personal data not subject to legal hold at any time. See your rights below.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">6. Your Rights</h2>
            <p>Under UK GDPR you have the right to: access your data, rectify inaccuracies, erase personal data (right to be forgotten), restrict processing, data portability, and object to processing. To exercise any right, email <a href="mailto:privacy@dibnow.com" className="text-blue-600 hover:underline">privacy@dibnow.com</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">7. Cookies</h2>
            <p>We use essential cookies for authentication (HTTP-only, secure). See our <Link href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link> for details.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">8. Contact</h2>
            <p>Data Controller: Clicktake Technologies · <a href="mailto:privacy@dibnow.com" className="text-blue-600 hover:underline">privacy@dibnow.com</a></p>
            <p className="mt-2">You also have the right to lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong>: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ico.org.uk</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
