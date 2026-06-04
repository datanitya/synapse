export const metadata = {
  title: 'Terms of Service — SYNAPSE',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Terms of Service</h1>
      <p className="text-slate-500 text-sm mb-10">Last updated: June 2025</p>

      <div className="space-y-8 text-slate-400 leading-relaxed text-sm">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
          <p>By creating an account or using SYNAPSE, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">2. Description of Service</h2>
          <p>SYNAPSE is an AI-assisted LinkedIn content creation and trend discovery tool. It helps you discover relevant trends, generate post drafts, and manage your content — but it does not post on your behalf without your explicit approval.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">3. No Auto-Posting</h2>
          <p className="font-medium text-slate-300">SYNAPSE will never automatically post to your LinkedIn. Every post requires your explicit, conscious approval. This is a core, non-negotiable feature of the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">4. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You are responsible for the content you publish to LinkedIn via SYNAPSE</li>
            <li>You must comply with LinkedIn&apos;s Terms of Service and Community Standards</li>
            <li>You must not use SYNAPSE to generate spam, misleading content, or content that violates applicable laws</li>
            <li>You must keep your account credentials secure</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">5. Content Ownership</h2>
          <p>You own the content you create using SYNAPSE. We do not claim any ownership over your generated posts, drafts, or content bank items.</p>
          <p className="mt-3">You grant SYNAPSE a limited license to process and store your content for the purpose of delivering the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">6. Subscription and Billing</h2>
          <p>Free accounts are provided at no cost subject to usage limits. Paid plans are billed monthly. You can cancel at any time; your access continues until the end of the current billing period.</p>
          <p className="mt-3">We reserve the right to change plan pricing with 30 days notice.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">7. Service Availability</h2>
          <p>SYNAPSE is provided &quot;as is&quot; without warranty. We do not guarantee uninterrupted access or that AI-generated content will meet your expectations. We are not liable for any business losses arising from use of the service.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">8. Termination</h2>
          <p>You may close your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">9. Contact</h2>
          <p>Questions? Email us at <a href="mailto:hello@synapse.app" className="text-blue-400 hover:text-blue-300">hello@synapse.app</a></p>
        </section>
      </div>
    </div>
  );
}
