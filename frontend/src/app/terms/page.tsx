import Link from 'next/link';

export const metadata = { title: 'Terms of Service — DibnowRepairSaaS' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-sm hover:underline">← Home</Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-600 text-sm font-medium">Terms of Service</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-stone-400 font-medium mb-2">Last updated: June 2026</p>
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Terms of Service</h1>
        <div className="space-y-6 text-stone-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using DibnowRepairSaaS ("the Service"), you agree to be bound by these Terms. If you disagree, do not use the Service. These Terms are governed by the laws of England and Wales.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">2. Description of Service</h2>
            <p>DibnowRepairSaaS is a cloud-based repair shop management platform. We provide tools for ticket management, inventory tracking, customer communication, delivery logistics, and AI-assisted diagnostics.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>Shop owners are responsible for all activity under their tenant account.</li>
              <li>You must not share login credentials or allow unauthorised access.</li>
              <li>You must provide accurate information during registration.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">4. Acceptable Use</h2>
            <p>You must not use the Service to: violate any law, infringe intellectual property rights, transmit malware, attempt to gain unauthorised access to other tenants' data, or engage in fraudulent activity.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">5. Subscription & Billing</h2>
            <p>Free tier is available with limited features. Pro and Enterprise plans are billed monthly. Cancellation takes effect at the end of the current billing period. No refunds for partial months.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">6. Data Ownership</h2>
            <p>You retain ownership of all data you input into the Service. We do not sell your data to third parties. Upon account termination, you may request a data export within 30 days.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">7. Service Availability</h2>
            <p>We target 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance. We are not liable for losses caused by outages.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Clicktake Technologies shall not be liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the fees paid in the 3 months preceding the claim.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">9. Changes to Terms</h2>
            <p>We may update these Terms with 30 days' notice via email. Continued use after the effective date constitutes acceptance.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">10. Contact</h2>
            <p>Questions? Email <a href="mailto:legal@dibnow.com" className="text-blue-600 hover:underline">legal@dibnow.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
