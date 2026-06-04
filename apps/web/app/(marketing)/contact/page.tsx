export const metadata = {
  title: 'Contact — SYNAPSE',
};

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Contact us</h1>
      <p className="text-slate-400 text-sm mb-10 leading-relaxed">
        Have a question, found a bug, or want to give feedback? We&apos;d love to hear from you.
      </p>

      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
          <div className="text-blue-400 shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="16" height="11" rx="1.5" />
              <polyline points="1,4 9,10 17,4" />
            </svg>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">General enquiries</p>
            <a href="mailto:hello@synapse.app" className="text-white hover:text-blue-400 transition-colors font-medium">
              hello@synapse.app
            </a>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
          <div className="text-blue-400 shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="9" r="8" />
              <line x1="9" y1="5" x2="9" y2="9" />
              <line x1="9" y1="12" x2="9" y2="13" />
            </svg>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Privacy & data</p>
            <a href="mailto:privacy@synapse.app" className="text-white hover:text-blue-400 transition-colors font-medium">
              privacy@synapse.app
            </a>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-8 leading-relaxed">
        We typically respond within 24 hours on business days.
      </p>
    </div>
  );
}
