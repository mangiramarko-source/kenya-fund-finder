import { FileText } from "lucide-react";

const TermsOfUsePage = () => (
  <div className="container py-10 max-w-3xl">
    <div className="flex items-center gap-3 mb-6">
      <FileText className="h-8 w-8 text-accent" />
      <h1 className="text-2xl md:text-3xl font-bold">Terms of Use</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By accessing or using Kenya Fund Finder ("the Platform"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">2. Nature of the Platform</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fund Finder Kenya is an <strong>informational platform only</strong>. It provides data about unit trust funds — including Money Market Funds, Fixed Income Funds, Balanced Funds, Equity Funds, Bond Funds, and other collective investment schemes — regulated by the Capital Markets Authority (CMA) of Kenya for comparison and educational purposes. The Platform:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
          <li>Does <strong>not</strong> provide investment advice, financial advice, or any recommendation to buy or sell any financial product.</li>
          <li>Does <strong>not</strong> act as a broker, dealer, fund manager, or investment adviser.</li>
          <li>Does <strong>not</strong> facilitate the purchase, sale, or redemption of any fund units.</li>
          <li>Is <strong>not</strong> affiliated with, endorsed by, or connected to any fund manager, the CMA, or any financial institution.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">3. No Investment Advice</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nothing on this Platform constitutes a solicitation, recommendation, endorsement, or offer to buy or sell any securities or financial instruments. All investment decisions should be made after consulting with a <strong>qualified and licensed financial advisor</strong> who can assess your individual financial situation, risk tolerance, and investment objectives.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">4. Data Accuracy and Sources</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fund data displayed on the Platform is sourced from publicly available documents, including fund fact sheets, regulatory filings, and fund manager websites. While we strive for accuracy:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
          <li>Data may not reflect real-time or the most current values.</li>
          <li>Yields shown are <strong>gross annual effective yields before the 15% withholding tax</strong> unless otherwise stated.</li>
          <li>Past performance is <strong>not indicative of future results</strong>.</li>
          <li>We do not guarantee the completeness, accuracy, or timeliness of any information.</li>
          <li>Users should verify all data independently with the respective fund managers before making any decisions.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">5. Investment Risks</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All investments carry risk, including the potential loss of principal. Unit trust funds — including Money Market, Fixed Income, Balanced, Equity, and Bond Funds — carry varying levels of risk. Money Market Funds, while generally considered lower-risk, are <strong>not guaranteed</strong> and are <strong>not deposits</strong> with any bank or financial institution. Other fund categories such as Equity and Balanced Funds may experience greater volatility. Fund values can fluctuate, and past returns do not guarantee future performance.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">6. Calculator Disclaimer</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The investment calculator provided on this Platform is for <strong>illustrative purposes only</strong>. Projections assume constant yield rates and do not account for withholding taxes, management fees, market fluctuations, or other variables that affect actual returns across any fund category. Results are estimates and should not be relied upon for investment decisions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">7. Intellectual Property</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All content, design, and code on this Platform are the property of Fund Finder Kenya or their respective owners. You may not reproduce, distribute, or create derivative works without prior written consent. Fund names, logos, and trademarks belong to their respective fund managers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">8. User Accounts</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you create an account, you are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You agree to provide accurate information and to notify us promptly of any unauthorised use.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Prohibited Uses</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Use the Platform for any unlawful purpose.</li>
          <li>Scrape, crawl, or extract data from the Platform using automated tools without permission.</li>
          <li>Attempt to gain unauthorised access to the Platform's systems or data.</li>
          <li>Misrepresent your affiliation with any person or entity.</li>
          <li>Use Platform data to create competing products or services.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">10. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To the fullest extent permitted by Kenyan law, Fund Finder Kenya, its owners, operators, and contributors shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the Platform, reliance on any information provided, or any investment decisions made based on information found on the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">11. Third-Party Links</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Platform may contain links to external websites, including fund manager sites and regulatory bodies. These links are provided for convenience only. We do not endorse, control, or assume responsibility for the content or practices of any third-party websites.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">12. Governing Law</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms of Use shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising from use of the Platform shall be subject to the exclusive jurisdiction of the courts of Kenya.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">13. Changes to These Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to modify these Terms of Use at any time. Changes will be effective immediately upon posting to this page. Your continued use of the Platform after any modifications constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">14. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any questions about these Terms of Use, please contact us through the Platform.
        </p>
      </section>
    </div>
  </div>
);

export default TermsOfUsePage;
