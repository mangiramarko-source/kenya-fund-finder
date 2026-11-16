import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfUsePage = () => (
  <div className="container py-10 max-w-3xl">
    <div className="flex items-center gap-3 mb-6">
      <FileText className="h-8 w-8 text-accent" />
      <h1 className="text-2xl md:text-3xl font-bold">Terms of Use</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-8">
      Last updated: November 2026 | Effective date: November 2026
    </p>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms &amp; Age Eligibility (18+)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By accessing or using Kenya Fund Finder (&ldquo;the Platform&rdquo; or &ldquo;the App&rdquo;), owned and operated by <strong>Elyon Innovation LTD</strong>, a company incorporated in the Republic of Kenya (&ldquo;the Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of Use and our <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. You must be at least <strong>18 years of age</strong> to create an account or use the Platform. If you do not agree to these terms or are under 18 years old, please do not use the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">2. Nature of the Platform &amp; Non-Lender / Non-Broker Declaration</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kenya Fund Finder is strictly an <strong>independent, read-only financial information, market data, and educational comparison platform</strong>. It aggregates publicly reported figures across Kenyan financial markets, including:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
          <li>Collective Investment Schemes (Money Market Funds, Fixed Income Funds, Balanced Funds, Equity Funds, and Special Funds) regulated by the <strong>Capital Markets Authority (CMA)</strong> of Kenya;</li>
          <li>Listed equities traded on the <strong>Nairobi Securities Exchange (NSE)</strong> alongside regional East African exchanges including the <strong>Uganda Securities Exchange (USE)</strong>, <strong>Dar es Salaam Stock Exchange (DSE)</strong>, and <strong>Rwanda Stock Exchange (RSE)</strong>;</li>
          <li>Government of Kenya Treasury Bills, Fixed-Coupon Bonds (FXD), and Infrastructure Bonds (IFB), commercial bank fixed deposits, and indicative foreign exchange (FX) rates published by or regulated under the <strong>Central Bank of Kenya (CBK)</strong>;</li>
          <li>Deposit-Taking Savings and Credit Co-operative Societies (DT-SACCOs) regulated by the <strong>SACCO Societies Regulatory Authority (SASRA)</strong>; and</li>
          <li>Global benchmark commodities and curated financial news.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3 font-medium text-foreground">
          Mandatory Regulatory &amp; App Store Disclosures — The Platform:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-1">
          <li>Does <strong>not</strong> offer, arrange, broker, or disburse personal loans, payday loans, mobile credit facilities, or cash advances of any kind.</li>
          <li>Does <strong>not</strong> provide personalized investment advice, financial planning, tax advice, or any recommendation to buy, sell, or hold any security or financial product.</li>
          <li>Does <strong>not</strong> act as a licensed stockbroker, dealer, fund manager, investment adviser, commercial bank, or SACCO agent.</li>
          <li>Does <strong>not</strong> accept client deposits, hold custodial funds, process financial payments, or execute securities or fund transactions.</li>
          <li>Is <strong>not</strong> affiliated with, endorsed by, or sponsored by the CMA (Kenya, Uganda, or Rwanda), CMSA (Tanzania), the NSE, USE, DSE, RSE, the CBK, SASRA, the Kenya Revenue Authority (KRA), or any listed company, bank, SACCO, or fund manager.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">3. No Investment or Tax Advice</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nothing on this Platform constitutes a solicitation, recommendation, endorsement, or offer to buy or sell any securities or financial instruments. All investment and financial decisions should be made only after reviewing official product disclosure documents (Information Memoranda, Fact Sheets, or Audited Financial Statements) and consulting with a <strong>qualified and CMA/CBK/SASRA-licensed financial or tax advisor</strong> who can assess your personal financial circumstances, risk tolerance, and investment objectives.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">4. Data Accuracy, Delays &amp; Sources</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Market quotes, fund yields, bank deposit rates, SACCO dividend rates, and Treasury auction results displayed on the Platform are sourced from publicly available regulatory filings, fund fact sheets, newspaper disclosures, and public market-data feeds. While we strive for accuracy:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
          <li>NSE, USE, DSE, and RSE stock quotes, FX rates, and commodity prices may be delayed and are <strong>not guaranteed as real-time executable exchange prices</strong>.</li>
          <li>Money Market Fund and Treasury yields shown are <strong>gross annual effective yields before Kenya&apos;s statutory 15% (or 10%) KRA withholding tax</strong> unless explicitly labeled as an estimated net return.</li>
          <li>Past performance, historical yields, and prior SACCO dividend rates are <strong>not indicative of future results</strong>.</li>
          <li>We do not warrant the completeness, accuracy, or timeliness of any information. Users must verify all current rates, fees, and dealing terms directly with the respective licensed institution before acting.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">5. Investment Risks</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All investments carry risk, including the potential loss of principal. Unit trust funds, East African listed equities (NSE, USE, DSE, and RSE), government securities, and SACCO shares carry varying levels of market, credit, interest-rate, and liquidity risk. Money Market Funds, while generally lower-risk, are <strong>not guaranteed</strong> and are <strong>not bank deposits</strong> protected by the Kenya Deposit Insurance Corporation (KDIC). Share prices and fund Net Asset Values (NAVs) can rise or fall.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">6. Calculators &amp; Simulated Portfolio Disclaimers</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The investment, MMF, savings, and tax calculators, as well as the Portfolio &amp; Watchlist tracking tools provided on this Platform, are for <strong>illustrative and educational simulation purposes only</strong>. Projections assume constant rates and simplified withholding tax assumptions and do not account for compounding variations, brokerage tariffs, management fee adjustments, early-withdrawal penalties, or market volatility. Simulated portfolios do not represent real custodial holdings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">7. AI Assistant (AI Lab) &amp; Automated Explanations Disclaimer</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Platform includes an optional educational feature (&ldquo;AI Lab&rdquo;) that generates plain-language explanations, glossary definitions, and deterministic scenario comparisons based on our public market catalog. Outputs from AI Lab are <strong>automated educational responses only</strong>:
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
          <li>AI Lab does <strong>not</strong> know your personal financial situation and is programmed to refuse personalized buy, sell, or allocation recommendations.</li>
          <li>Automated natural-language interpretation can occasionally misclassify an entity or omit context; always verify every figure against the underlying fund fact sheet, issuer disclosure, or licensed intermediary.</li>
          <li>Do not submit sensitive personal data, passwords, or private account numbers into AI Lab prompts.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">8. Intellectual Property &amp; Trademark Fair Use</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All original content, platform architecture, design, typography, icons, and source code on this Platform are the intellectual property of <strong>Elyon Innovation LTD</strong>. You may not reproduce, distribute, or create derivative works without prior written consent.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          All third-party product names, logos, exchange ticker symbols (NSE, USE, DSE, and RSE), commercial bank marks, SACCO names, licensed Collective Investment Scheme manager trademarks, and media publication marks are the property of their respective owners. Their display on Kenya Fund Finder is strictly for nominative identification, factual comparison, and news reporting purposes under fair dealing / fair use principles, and does not imply any affiliation, sponsorship, or endorsement by those trademark owners.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. User Accounts &amp; Account Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you create an account (via email/password, Google OAuth, or Microsoft OAuth), you are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You may permanently delete your account and all associated personal data at any time through your <Link to="/profile" className="text-accent hover:underline">Profile Settings</Link> or via our public <Link to="/delete-account" className="text-accent hover:underline">Account &amp; Data Deletion Portal (/delete-account)</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">10. Prohibited Uses</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Use the Platform for any unlawful, fraudulent, or unauthorized financial activity.</li>
          <li>Scrape, crawl, spider, or bulk-extract data from the Platform using automated tools without prior written permission.</li>
          <li>Attempt to bypass authentication controls, security headers, rate limits, or bot-protection mechanisms.</li>
          <li>Misrepresent your identity or affiliation with any person, regulator, or financial institution.</li>
          <li>Republish or resell Platform data to build competing commercial directories or services.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">11. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To the fullest extent permitted by the laws of the Republic of Kenya, <strong>Elyon Innovation LTD</strong>, its directors, officers, employees, contractors, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, or any loss of capital, profits, or data, arising out of your access to, use of, or inability to use the Platform, any delay or inaccuracy in reported market data, or any investment or financial decision made in reliance on information displayed on the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">12. Third-Party Links</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Platform contains links to external websites, including fund manager portals, stockbrokers, media publishers, and regulatory bodies (CMA, CBK, NSE, CDSC, KRA). These links are provided for reference and convenience only. We do not control, endorse, or assume responsibility for the content, security, or privacy practices of any third-party websites.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">13. Market News Aggregation &amp; Fair Dealing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kenya Fund Finder curates and indexes publicly available financial headlines, analytical summaries, and source links from Kenyan and international media outlets for commentary, educational research, and news reporting under the fair dealing provisions of the <strong>Kenya Copyright Act (Cap 130)</strong>. Full articles remain the exclusive intellectual property of their respective publishers, and users are provided direct links to original publisher sources. Kenya Fund Finder does not warrant the accuracy of third-party reporting.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">14. Governing Law &amp; Jurisdiction</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms of Use shall be governed by and construed in accordance with the laws of the <strong>Republic of Kenya</strong>. Any disputes arising from or relating to the use of the Platform shall be subject to the exclusive jurisdiction of the courts of the Republic of Kenya at Nairobi.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">15. Changes to These Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to update or modify these Terms of Use at any time. Material changes will be effective immediately upon posting to this page with an updated effective date. Your continued use of the Platform after any modifications constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">16. Contact Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any questions about these Terms of Use, regulatory disclosures, or copyright/trademark inquiries, please contact us:
        </p>
        <p className="text-sm font-medium text-foreground mt-2">
          <strong>Elyon Innovation LTD</strong><br />
          Nairobi, Republic of Kenya<br />
          Email: <a href="mailto:kenyafundfinder@outlook.com" className="text-accent hover:underline">kenyafundfinder@outlook.com</a><br />
          Contact Page: <Link to="/page/contact" className="text-accent hover:underline">https://kenyafundfinder.com/page/contact</Link>
        </p>
      </section>
    </div>
  </div>
);

export default TermsOfUsePage;
