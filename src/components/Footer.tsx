import { Link } from "react-router-dom";
import { TrendingUp, AlertTriangle } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card mt-16">
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary mb-3">
            <TrendingUp className="h-5 w-5 text-accent" />
            MMF Compare Kenya
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your trusted platform for comparing Money Market Funds in Kenya. All funds listed are regulated by the Capital Markets Authority.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/compare" className="hover:text-foreground transition-colors">Compare Funds</Link></li>
            <li><Link to="/calculator" className="hover:text-foreground transition-colors">Calculator</Link></li>
            <li><Link to="/news" className="hover:text-foreground transition-colors">News</Link></li>
            <li><Link to="/learn" className="hover:text-foreground transition-colors">Learn</Link></li>
            <li><Link to="/page/about" className="hover:text-foreground transition-colors">About</Link></li>
            <li><Link to="/page/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link></li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-start gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Important Disclaimer:</strong> This platform provides information only and does not constitute investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the platform's content as such. MMF Compare Kenya does not recommend that any financial product is suitable for you. The content on this platform is provided for general informational purposes only. Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal. Please consult with a qualified financial advisor before making any investment decisions.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          All funds listed on this platform are regulated by the <strong>Capital Markets Authority (CMA) of Kenya</strong>. Fund data is sourced from publicly available fact sheets and regulatory filings. Yields shown are gross annual effective yields before the 15% withholding tax unless otherwise stated. Data may not reflect real-time values.
        </p>
        <p className="text-xs text-muted-foreground text-center mt-4">
          © {new Date().getFullYear()} MMF Compare Kenya. All rights reserved. This platform is not affiliated with, endorsed by, or connected to any fund manager or the CMA.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
