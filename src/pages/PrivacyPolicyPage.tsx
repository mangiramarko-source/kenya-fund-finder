import { Shield } from "lucide-react";

const PrivacyPolicyPage = () => (
  <div className="container py-10 max-w-3xl">
    <div className="flex items-center gap-3 mb-6">
      <Shield className="h-8 w-8 text-accent" />
      <h1 className="text-2xl md:text-3xl font-bold">Privacy Policy</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-8">
      Last updated: August 2026 | Effective date: August 2026
    </p>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kenya Fund Finder ("the Platform") is owned and operated by <strong>Elyon Innovation LTD</strong>, a company incorporated in the Republic of Kenya ("we", "our", or "the Company"). We act as the data controller for personal information collected through the Platform and are committed to protecting your privacy in compliance with the <strong>Kenya Data Protection Act, 2019</strong> and applicable international data privacy standards. This Privacy Policy explains our practices regarding the collection, use, disclosure, and protection of your data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We collect only the minimum personal data required to provide our financial research and comparison services:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Account Information:</strong> When you register or sign in, we process your email address, authenticated user identifier, and session tokens via our authentication provider (Supabase).</li>
          <li><strong>User-Generated Configuration:</strong> Your saved watchlists, simulated portfolios, and price alert thresholds are stored in your secure account database records. We do not collect or store bank account numbers or financial transaction credentials.</li>
          <li><strong>Analytics & Usage Telemetry:</strong> Anonymized interaction events, page views, and general device information (browser type, operating system, approximate region) are processed via our analytics infrastructure.</li>
          <li><strong>Attribution Data:</strong> Campaign source parameters (e.g. UTM source, medium, campaign) stored locally in browser storage to understand aggregate marketing acquisition channels.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">3. Third-Party Service Providers & Processors</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We work with select third-party infrastructure and service providers to operate, secure, and improve the Platform:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
          <li><strong>Supabase:</strong> Cloud database, authentication, and encrypted data storage provider. All data transmissions are protected via TLS/HTTPS and database Row-Level Security (RLS).</li>
          <li><strong>PostHog (EU Cloud):</strong> Product analytics provider hosted within the European Union (<code>eu.i.posthog.com</code>). PostHog analytics tracking is strictly gated by your explicit analytics consent and is never initialized prior to consent.</li>
          <li><strong>Vercel Analytics:</strong> Web vitals and performance diagnostics for technical site optimization.</li>
          <li><strong>Sentry:</strong> Automated application error monitoring and crash diagnostics.</li>
          <li><strong>Cloudflare (Turnstile):</strong> Privacy-first bot detection and abuse prevention on authentication forms.</li>
          <li><strong>Advertising Partners (Meta / Facebook / Instagram):</strong> In the event that marketing conversion tracking (Meta Pixel / Conversions API) is utilized for campaign attribution, tracking is strictly gated by explicit marketing/advertising consent. No sensitive personal financial data, specific fund investment balances, or account values are ever transmitted to advertising networks.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">4. Cookies & Local Storage</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          The Platform uses local storage and cookies categorized as follows:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Necessary / Essential:</strong> Required for authentication, security tokens, and consent preference storage. Always active.</li>
          <li><strong>Analytics:</strong> Used to understand site performance and visitor trends. Activated only with explicit consent.</li>
          <li><strong>Advertising / Marketing:</strong> Used for campaign attribution and advertising measurement. Activated only with explicit consent.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          You can modify or revoke your cookie choices at any time by clicking "Cookie Settings" in our website footer.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">5. How We Use Your Information</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>To authenticate and manage your user account.</li>
          <li>To persist your custom watchlists, simulated portfolios, and price alert settings.</li>
          <li>To send requested notification emails (e.g. price alerts, weekly market summaries).</li>
          <li>To maintain platform security, prevent automated abuse, and fix technical errors.</li>
          <li>To analyze aggregate traffic trends and optimize platform usability.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">6. Data Retention & Account Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your account profile and associated watchlists/alerts for as long as your account remains active. You may request the deletion of your account and all associated personal data at any time by contacting our data protection support team at <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a>. Upon receipt, your account and database records will be permanently deleted within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">7. Your Data Rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          Under the Kenya Data Protection Act, 2019, you have the right to:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Be informed of how your personal data is processed.</li>
          <li>Access the personal data held about you.</li>
          <li>Request correction of inaccurate or incomplete information.</li>
          <li>Request erasure / deletion of your personal data.</li>
          <li>Object to or restrict the processing of your data.</li>
          <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC) Kenya.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">8. Data Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We enforce comprehensive technical and operational safeguards, including end-to-end HTTPS encryption, cryptographically verified authentication, row-level database authorization, and strict Content Security Policies (CSP) to safeguard your data against unauthorized access or disclosure.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any privacy inquiries, data subject requests, or questions regarding this policy, please contact our Data Protection team at:
        </p>
        <p className="text-sm font-medium text-foreground mt-2">
          <strong>Elyon Innovation LTD</strong><br />
          Email: <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a><br />
          Website: <a href="https://kenyafundfinder.com" className="text-accent hover:underline">https://kenyafundfinder.com</a>
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicyPage;
