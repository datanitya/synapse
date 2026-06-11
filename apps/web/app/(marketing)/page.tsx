import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import WaitlistForm from '../../components/marketing/WaitlistForm';

function parseJwt(token: string): { onboardingComplete?: boolean } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,15 6,9 10,12 18,4" />
        <polyline points="13,4 18,4 18,9" />
      </svg>
    ),
    title: 'Trends Feed',
    desc: 'Curated HackerNews topics filtered to your niche — so you never run out of relevant ideas.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H4a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V7L13 2z" />
        <polyline points="13,2 13,7 18,7" />
        <line x1="6" y1="10" x2="14" y2="10" />
        <line x1="6" y1="13" x2="11" y2="13" />
      </svg>
    ),
    title: 'AI Voice Generation',
    desc: 'GPT-4o writes 3 post variations in your tone — contrarian, story, or data-driven.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="14" rx="2" />
        <line x1="7" y1="8" x2="13" y2="8" />
        <line x1="7" y1="11" x2="13" y2="11" />
        <line x1="7" y1="14" x2="10" y2="14" />
      </svg>
    ),
    title: 'Draft Workspace',
    desc: 'Review, edit, and approve posts before they go anywhere. You stay in control.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="16" height="11" rx="1" />
        <path d="M2 9l7-6 7 6" />
        <line x1="7" y1="12" x2="13" y2="12" />
      </svg>
    ),
    title: 'Content Bank',
    desc: 'Save your best posts and build a library of content you can reuse and remix.',
  },
];

const FAQS = [
  {
    q: 'What is SYNAPSE?',
    a: 'SYNAPSE is an AI brand advisor for LinkedIn. It discovers trending topics in your niche, generates posts in your voice, and helps you build authority consistently — without spending hours on content.',
  },
  {
    q: 'Is it free to start?',
    a: 'Yes. The Free plan gives you access to the trends feed and ~10 AI-generated posts per month. No credit card required.',
  },
  {
    q: 'How does the AI learn my voice?',
    a: 'During onboarding you set your tone, goals, and writing examples. The AI uses these to generate posts that sound like you, not a generic chatbot.',
  },
  {
    q: 'Is my LinkedIn account safe?',
    a: 'SYNAPSE uses read-only LinkedIn OAuth for login. We never post on your behalf automatically — every post requires your explicit approval before it goes anywhere.',
  },
  {
    q: 'How is this different from ChatGPT?',
    a: "ChatGPT is a blank canvas. SYNAPSE is a brand advisor: it knows your niche, tracks what's trending, and generates posts tailored to your voice and goals. It's a workflow, not just a prompt.",
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '',
    features: [
      'Trends feed (HackerNews + Google News)',
      '~50,000 tokens / month (~10 posts)',
      'Drafts & content bank',
      'Brand DNA learning',
      'LinkedIn login',
    ],
    cta: 'Get started free',
    href: '/login',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    features: [
      '500,000 tokens / month (~100 posts)',
      'Scheduled auto-publish to LinkedIn',
      'Opportunity Score on every trend',
      'Brand Score + Voice Report',
      'Image generation',
      'All AI providers (GPT-4o, Claude, Gemini)',
    ],
    cta: 'Start Pro',
    href: '#waitlist',
    highlight: true,
  },
  {
    name: 'Business',
    price: '₹1,499',
    period: '/month',
    features: [
      'Unlimited tokens',
      'Everything in Pro',
      'Developer API access',
      'Team accounts (5 seats)',
      'Post analytics (impressions, likes)',
      'Priority support',
    ],
    cta: 'Contact us',
    href: '#waitlist',
    highlight: false,
  },
];

export default async function LandingPage() {
  // Logged-in users skip the landing page
  const cookieStore = await cookies();
  const token = cookieStore.get('synapse_token')?.value;
  if (token) {
    const payload = parseJwt(token);
    redirect(payload?.onboardingComplete ? '/dashboard' : '/onboarding');
  }

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-blue-400 text-xs font-medium tracking-wide">Now in Beta — limited spots</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Discover trends.{' '}
          <span className="text-blue-400">Build authority.</span>
          <br />
          Grow on LinkedIn.
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          SYNAPSE tracks what&apos;s trending in your niche, writes posts in your voice, and helps you show up consistently — without spending hours on content.
        </p>

        <div className="flex flex-col items-center gap-4">
          <WaitlistForm source="hero" buttonLabel="Join Beta — It's Free" />
          <p className="text-slate-600 text-xs">No credit card · LinkedIn login · Cancel anytime</p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="bg-slate-900/40 border-y border-slate-800/60 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-12 tracking-tight">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Connect LinkedIn', desc: 'One-click OAuth login. SYNAPSE reads your profile to understand your background.' },
              { n: '2', title: 'Discover trends', desc: 'Browse daily trending topics filtered for your niche. Save the ones that interest you.' },
              { n: '3', title: 'Generate & post', desc: 'Pick a trend, get 3 AI-written posts in your voice. Edit, approve, and copy to LinkedIn.' },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
                  <span className="text-blue-400 font-bold text-sm">{step.n}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-3 tracking-tight">Everything you need to build your brand</h2>
          <p className="text-slate-400 text-center text-sm mb-12">Not just an AI writer — a complete LinkedIn growth system.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex gap-4">
                <div className="text-blue-400 shrink-0 mt-0.5">{f.icon}</div>
                <div>
                  <h3 className="text-white font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section className="bg-slate-900/40 border-y border-slate-800/60 py-20" id="pricing">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-3 tracking-tight">Simple pricing</h2>
          <p className="text-slate-400 text-center text-sm mb-12">Start free. Upgrade when you&apos;re ready.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? 'bg-blue-600/10 border-2 border-blue-500/50'
                    : 'bg-slate-900 border border-slate-800'
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Most popular</div>
                )}
                <div>
                  <p className="text-slate-400 text-sm mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 text-sm">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-white text-center mb-10 tracking-tight">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 text-sm">{faq.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA + Waitlist ─────────────────────────────── */}
      <section className="bg-slate-900/40 border-t border-slate-800/60 py-20" id="waitlist">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Ready to build your brand?
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Join creators using SYNAPSE to post consistently and grow their authority on LinkedIn.
          </p>
          <div className="flex flex-col items-center gap-3">
            <WaitlistForm source="footer" />
            <p className="text-slate-600 text-xs">Free to join · No spam · Unsubscribe anytime</p>
          </div>
        </div>
      </section>
    </div>
  );
}
