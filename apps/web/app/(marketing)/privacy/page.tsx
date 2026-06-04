export const metadata = {
  title: 'Privacy Policy — SYNAPSE',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Privacy Policy</h1>
      <p className="text-slate-500 text-sm mb-10">Last updated: June 2025</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-slate-400 leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">1. What we collect</h2>
          <p>When you connect with LinkedIn, we receive your public profile information: name, email address, headline, and profile picture. We store this to create and maintain your SYNAPSE account.</p>
          <p className="mt-3">We also collect usage data such as trends you save, posts you generate, and how you interact with the platform. This helps us improve the product and personalize your experience.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">2. How we use your data</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide the SYNAPSE service — trend discovery, AI content generation, draft management</li>
            <li>To personalize AI-generated content to your voice and preferences</li>
            <li>To send optional product updates and posting reminders (you can opt out at any time)</li>
            <li>To improve the platform by analyzing aggregate usage patterns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">3. LinkedIn OAuth</h2>
          <p>SYNAPSE uses LinkedIn OAuth for authentication. We request the <code className="text-blue-400 bg-slate-800 px-1 rounded">openid</code>, <code className="text-blue-400 bg-slate-800 px-1 rounded">profile</code>, and <code className="text-blue-400 bg-slate-800 px-1 rounded">email</code> scopes only.</p>
          <p className="mt-3">We <strong className="text-white">never post to your LinkedIn automatically</strong>. Every post requires your explicit approval before it goes anywhere.</p>
          <p className="mt-3">Your LinkedIn access token is encrypted at rest using AES-256-CBC and is only used to authenticate your session.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">4. Data storage and security</h2>
          <p>Your data is stored in a secured PostgreSQL database. Sensitive values (tokens, API keys) are encrypted at rest. We use HTTPS for all data in transit.</p>
          <p className="mt-3">We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">5. Cookies</h2>
          <p>We use a single HttpOnly session cookie (<code className="text-blue-400 bg-slate-800 px-1 rounded">synapse_token</code>) to keep you logged in. This cookie is not accessible to JavaScript and cannot be read by third-party scripts.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">6. Your rights</h2>
          <p>You can request deletion of your account and all associated data at any time by emailing us. We will process deletion requests within 30 days.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">7. Contact</h2>
          <p>Questions? Email us at <a href="mailto:privacy@synapse.app" className="text-blue-400 hover:text-blue-300">privacy@synapse.app</a></p>
        </section>
      </div>
    </div>
  );
}
