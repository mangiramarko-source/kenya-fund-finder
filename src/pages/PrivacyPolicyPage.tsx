import { Shield } from "lucide-react";

const PrivacyPolicyPage = () => (
  <div className="container py-10 max-w-3xl">
    <div className="flex items-center gap-3 mb-6">
      <Shield className="h-8 w-8 text-accent" />
      <h1 className="text-2xl md:text-3xl font-bold">Privacy Policy</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kenya Fund Finder ("we", "our", or "the Platform") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website. By using this Platform, you agree to the practices described in this policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">We may collect the following types of information:</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Account Information:</strong> If you create an account, we collect your email address and authentication credentials.</li>
          <li><strong>Usage Data:</strong> We collect anonymised page view data, including pages visited and session identifiers, to improve our services.</li>
          <li><strong>Device Information:</strong> Browser type, operating system, and screen resolution may be collected automatically.</li>
          <li><strong>Cookies:</strong> We use essential cookies for authentication and session management. We also use cookies set by Google AdSense to serve personalised advertisements and measure ad performance.</li>
          <li><strong>Advertising Data:</strong> Google AdSense may collect information about your browsing behaviour to serve relevant ads. This includes your IP address, browser type, pages visited, and interaction with ads.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Cookies & Advertising</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">This Platform uses the following types of cookies:</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li><strong>Essential Cookies:</strong> Required for core functionality such as authentication and session management.</li>
          <li><strong>Analytics Cookies:</strong> Help us understand how visitors use the Platform to improve our services.</li>
          <li><strong>Advertising Cookies:</strong> Set by Google AdSense and its partners to display personalised advertisements based on your browsing activity across websites.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          You can manage your cookie preferences through your browser settings. Disabling cookies may affect the functionality of this Platform. For more information on how Google uses data from partner sites, visit{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google's Privacy & Terms</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">3. How We Use Your Information</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>To provide and maintain the Platform's functionality.</li>
          <li>To authenticate users and manage accounts.</li>
          <li>To analyse usage patterns and improve user experience.</li>
          <li>To ensure the security and integrity of the Platform.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">4. Data Sharing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not sell, trade, or rent your personal information to third parties. We may share anonymised, aggregated data for analytical purposes. We may disclose your information if required by law or to protect our legal rights.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">5. Data Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We implement industry-standard security measures, including encrypted data transmission (HTTPS/TLS), secure authentication, and row-level security on our database. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your account data for as long as your account is active. Usage analytics data is retained in anonymised form. You may request deletion of your account and associated data by contacting us.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">In accordance with the Kenya Data Protection Act, 2019, you have the right to:</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate personal data.</li>
          <li>Request deletion of your personal data.</li>
          <li>Object to or restrict the processing of your data.</li>
          <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">8. Third-Party Links</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This Platform may contain links to external fund manager websites or regulatory bodies. We are not responsible for the privacy practices or content of those external sites. We encourage you to review their privacy policies independently.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Children's Privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">10. Changes to This Policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the Platform after changes constitutes acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">11. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us through the Platform.
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicyPage;
