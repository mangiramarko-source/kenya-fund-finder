import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicyPage = () => (
  <div className="container py-10 max-w-3xl">
    <div className="flex items-center gap-3 mb-6">
      <Shield className="h-8 w-8 text-accent" />
      <h1 className="text-2xl md:text-3xl font-bold">Privacy Policy</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-8">
      Last updated: November 2026 | Effective date: November 2026 | Compliant with the Kenya Data Protection Act, 2019 (KDPA), Samsung Galaxy Store &amp; Google Play Developer Policies
    </p>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">1. Introduction &amp; Data Controller</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kenya Fund Finder (&ldquo;the Platform&rdquo; or &ldquo;the App&rdquo;) is owned and operated by <strong>Elyon Innovation LTD</strong>, a company incorporated in the Republic of Kenya (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Company&rdquo;). We act as the data controller for personal information collected through our web platform and mobile applications (including our Samsung Galaxy Store and Android Trusted Web Activity packages) and are committed to protecting your privacy in compliance with the <strong>Kenya Data Protection Act, 2019 (KDPA)</strong> and applicable international data privacy standards. This Privacy Policy explains our practices regarding the collection, use, cross-border transfer, disclosure, and protection of your data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We collect only the minimum personal data required to provide our financial research, market tracking, and comparison services:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5">
          <li><strong>Account &amp; OAuth Identity Information:</strong> When you register or sign in using email and password, <strong>Google OAuth</strong>, or <strong>Microsoft OAuth</strong>, we process your email address, authenticated user identifier, session tokens, and basic OAuth profile metadata (such as your display name and profile picture URL) via our authentication provider (Supabase).</li>
          <li><strong>Profile Customization &amp; Avatar Uploads:</strong> If you customize your profile or upload a profile photo, we store your chosen display name and sanitized avatar image in our dedicated cloud storage bucket. Uploaded images are re-encoded client-side to strip EXIF and location metadata prior to upload.</li>
          <li><strong>User-Generated Configuration:</strong> Your saved watchlists, simulated/mock portfolios, and custom price alert thresholds are stored in your secure account database records. <strong>We do not collect or store bank account numbers, M-Pesa PINs, payment card details, or brokerage trading credentials.</strong></li>
          <li><strong>Push Notifications &amp; Alert Subscriptions:</strong> If you opt in to browser or mobile push notifications or email digests, we store your encrypted Web Push subscription endpoint, cryptographic keys, and alert delivery preferences so we can deliver the alerts you configure.</li>
          <li><strong>AI Assistant (AI Lab) Queries &amp; Redacted Telemetry:</strong> When you submit questions or scenarios to our AI Lab educational assistant, your prompt text is processed by our edge functions to generate educational explanations and deterministic market comparisons. Any resolution telemetry logged to improve our financial catalog is strictly anonymized, bounded, and scrubbed of personal identifiers (emails, phone numbers, and account IDs).</li>
          <li><strong>Analytics &amp; Usage Telemetry:</strong> Anonymized interaction events, page views, and general device metadata (browser/WebView version, operating system, screen size, and approximate region) processed only when you grant analytics consent.</li>
          <li><strong>Attribution Data:</strong> Campaign source parameters (e.g., UTM source, medium, campaign) stored locally in browser storage to understand aggregate marketing acquisition channels.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">3. Third-Party Service Providers &amp; Sub-Processors</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We work with vetted third-party infrastructure and service providers to operate, secure, and improve the Platform:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
          <li><strong>Supabase:</strong> Cloud PostgreSQL database, OAuth/email authentication, edge functions, and encrypted storage provider. All data transmissions are protected via TLS/HTTPS and database Row-Level Security (RLS).</li>
          <li><strong>PostHog (EU Cloud):</strong> Product analytics provider hosted within the European Union (<code>eu.i.posthog.com</code>). PostHog analytics tracking is strictly gated by your explicit analytics consent and is never initialized prior to consent.</li>
          <li><strong>Vercel:</strong> Global edge hosting, static content delivery, and anonymized Web Vitals performance diagnostics.</li>
          <li><strong>Sentry:</strong> Automated application error monitoring and crash diagnostics with strict token, URL, and PII redaction rules.</li>
          <li><strong>Cloudflare (Turnstile):</strong> Privacy-preserving bot detection and abuse prevention on authentication forms.</li>
          <li><strong>AI Lab Inference Providers:</strong> Cloud language model endpoints invoked exclusively via server-side Supabase Edge Functions to interpret natural-language educational queries without exposing your account identity or personal financial records.</li>
          <li><strong>Advertising Partners (Meta / Facebook / Instagram):</strong> In the event that marketing conversion tracking (Meta Pixel / Conversions API) is utilized for campaign attribution, tracking is strictly gated by explicit marketing/advertising consent. No sensitive personal financial data, specific fund investment balances, or portfolio values are ever transmitted to advertising networks.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">4. Cross-Border Data Transfers (KDPA 2019, Sections 48 &amp; 49)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          To deliver reliable, low-latency market data and secure authentication, personal data and technical telemetry collected through the Platform are transferred to and processed on cloud infrastructure located outside the Republic of Kenya—specifically within data centers in the <strong>European Union (EU)</strong> and the <strong>United States (US)</strong> operated by our sub-processors listed in Section 3 (including Supabase, Vercel, PostHog EU Cloud, Sentry, and Cloudflare).
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          All cross-border data transfers are conducted in strict compliance with <strong>Sections 48 and 49 of the Kenya Data Protection Act, 2019</strong> and the <strong>Data Protection (General) Regulations, 2021</strong>, supported by the following statutory safeguards:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Contractual &amp; Adequacy Safeguards:</strong> Binding Data Processing Agreements (DPAs) and Standard Contractual Clauses (SCCs) requiring sub-processors to maintain data protection and security standards commensurate with Kenyan law and GDPR.</li>
          <li><strong>Technical Encryption:</strong> Mandatory end-to-end encryption in transit (TLS 1.2/1.3 over HTTPS) and cryptographic encryption at rest (AES-256) combined with strict database Row-Level Security (RLS).</li>
          <li><strong>Informed Consent &amp; Necessity:</strong> Your explicit acknowledgement when creating an account or configuring your Cookie &amp; Privacy Preferences, as well as contractual necessity to synchronize your watchlists, portfolios, and price alerts across devices.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">5. Cookies, Local Storage &amp; App Storage</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          The Platform uses browser local storage, service worker caches, and cookies categorized as follows:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Necessary / Essential:</strong> Required for authentication sessions, security tokens, offline fallback caching, theme preferences, and consent preference storage. Always active.</li>
          <li><strong>Analytics:</strong> Used to understand platform performance and visitor trends. Activated only with explicit consent.</li>
          <li><strong>Advertising / Marketing:</strong> Used for campaign attribution and advertising measurement. Activated only with explicit consent.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          You can modify or revoke your cookie choices at any time by clicking &ldquo;Cookie Settings&rdquo; in the website footer or inside your Profile settings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">6. How We Use Your Information</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>To authenticate and manage your user account across web and mobile devices.</li>
          <li>To persist your custom watchlists, simulated portfolios, and price alert settings.</li>
          <li>To deliver user-requested push notifications and email digests (e.g., price alerts, weekly market summaries).</li>
          <li>To process educational financial questions and comparisons in AI Lab.</li>
          <li>To maintain platform security, prevent automated abuse, and fix technical errors.</li>
          <li>To analyze aggregate traffic trends and optimize platform usability (subject to your consent).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">7. Data Retention &amp; Account Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          We retain your account profile and associated watchlists, simulated portfolios, and alerts only for as long as your account remains active. You have the right to permanently delete your account and all associated personal data at any time without fee:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5">
          <li><strong>Instant In-App Deletion:</strong> Sign in, navigate to <Link to="/profile" className="text-accent hover:underline font-medium">My Profile</Link>, scroll to the <strong>Danger Zone</strong> card, and select <strong>Delete Account</strong> to immediately and irrevocably purge your account, avatar, portfolio, watchlists, and alert records.</li>
          <li><strong>Web &amp; Email Deletion Request (No App Needed):</strong> Visit our dedicated <Link to="/delete-account" className="text-accent hover:underline font-medium">Account &amp; Data Deletion Page (/delete-account)</Link> or email our Data Protection team at <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a>. Manual email requests are verified and permanently completed within <strong>30 days</strong>.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">8. Children&apos;s Privacy &amp; Age Restriction (18+)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In accordance with <strong>Section 33 of the Kenya Data Protection Act, 2019</strong> and mobile application store standards (Samsung Galaxy Store and Google Play), Kenya Fund Finder is intended exclusively for adults aged <strong>18 years and older</strong>. We do not knowingly solicit, collect, or process personal data from children or minors under the age of 18. If we discover that personal data from an individual under 18 has been collected, we will immediately deactivate the account and permanently purge all associated personal records. If you believe a minor has registered an account, please notify us at <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Your Data Rights Under Kenyan Law</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          Under the Kenya Data Protection Act, 2019, you have the right to:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Be informed of the use to which your personal data is to be put.</li>
          <li>Access your personal data in our custody.</li>
          <li>Object to the processing of all or part of your personal data.</li>
          <li>Request correction or deletion of false, misleading, or outdated personal data.</li>
          <li>Request erasure / permanent deletion of your personal data via <Link to="/delete-account" className="text-accent hover:underline">/delete-account</Link>.</li>
          <li>Lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC) Kenya</strong> (<a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">www.odpc.go.ke</a>).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">10. Data Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We enforce comprehensive technical and operational safeguards, including end-to-end HTTPS encryption, cryptographically verified authentication, row-level database authorization (RLS), client-side image sanitization, and strict Content Security Policies (CSP) to safeguard your data against unauthorized access, alteration, or disclosure.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">11. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any privacy inquiries, cross-border data transfer questions, data subject requests, or questions regarding this policy, please contact our Data Protection team at:
        </p>
        <p className="text-sm font-medium text-foreground mt-2">
          <strong>Elyon Innovation LTD</strong><br />
          Nairobi, Republic of Kenya<br />
          Email: <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a><br />
          Account Deletion Portal: <Link to="/delete-account" className="text-accent hover:underline">https://kenyafundfinder.com/delete-account</Link><br />
          Website: <a href="https://kenyafundfinder.com" className="text-accent hover:underline">https://kenyafundfinder.com</a>
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicyPage;
