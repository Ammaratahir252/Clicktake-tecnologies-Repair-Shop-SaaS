import Link from 'next/link';

export const metadata = { title: 'Your GDPR Rights — DibnowRepairSaaS' };

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-blue-700 font-bold text-sm hover:underline">← Home</Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-600 text-sm font-medium">GDPR Rights</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-stone-400 font-medium mb-2">Last updated: June 2026</p>
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Your GDPR Rights</h1>
        <p className="text-stone-600 mb-10">Under the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018, you have the following rights regarding your personal data.</p>
        <div className="grid gap-4">
          {[
            { right: 'Right to Access', desc: 'You can request a copy of all personal data we hold about you. We will respond within 30 days.', icon: '📋' },
            { right: 'Right to Rectification', desc: 'If your data is inaccurate or incomplete, you can request correction at any time.', icon: '✏️' },
            { right: 'Right to Erasure', desc: 'You can request deletion of your personal data (the "right to be forgotten"), subject to legal retention requirements such as HMRC financial records.', icon: '🗑️' },
            { right: 'Right to Restrict Processing', desc: 'You can ask us to pause processing of your data while an accuracy dispute is resolved.', icon: '⏸️' },
            { right: 'Right to Data Portability', desc: 'You can receive your data in a machine-readable format (JSON/CSV) to transfer to another service.', icon: '📦' },
            { right: 'Right to Object', desc: 'You can object to processing based on legitimate interests. We will assess whether our interests override your rights.', icon: '🚫' },
            { right: 'Right to Withdraw Consent', desc: 'Where processing is based on consent (e.g. marketing emails), you can withdraw at any time via the unsubscribe link.', icon: '↩️' },
          ].map(({ right, desc, icon }) => (
            <div key={right} className="bg-white border border-stone-200 rounded-2xl p-5 flex gap-4">
              <span className="text-2xl mt-0.5">{icon}</span>
              <div>
                <h3 className="font-bold text-stone-800 mb-1">{right}</h3>
                <p className="text-sm text-stone-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="font-bold text-blue-900 mb-2">How to Exercise Your Rights</h2>
          <p className="text-sm text-blue-800">Email your request to <a href="mailto:privacy@dibnow.com" className="font-bold underline">privacy@dibnow.com</a> with subject line "GDPR Request — [Your Name]". We will verify your identity and respond within 30 days. If you are unsatisfied, you may lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong> at <a href="https://ico.org.uk/make-a-complaint" target="_blank" rel="noopener noreferrer" className="font-bold underline">ico.org.uk/make-a-complaint</a>.</p>
        </div>
      </div>
    </div>
  );
}
