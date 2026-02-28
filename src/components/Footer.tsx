import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

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
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="cursor-pointer hover:text-foreground transition-colors">About</span></li>
            <li><span className="cursor-pointer hover:text-foreground transition-colors">Contact</span></li>
            <li><span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span></li>
            <li><span className="cursor-pointer hover:text-foreground transition-colors">Terms</span></li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground text-center">
        <p>This platform provides information only and does not offer investment advice. All funds are regulated by the Capital Markets Authority of Kenya.</p>
        <p className="mt-2">© {new Date().getFullYear()} MMF Compare Kenya. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
