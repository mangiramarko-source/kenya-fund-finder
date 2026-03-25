import { forwardRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, AlertTriangle, Twitter, Facebook, Instagram, Linkedin, Youtube, Globe, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
  sort_order: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  globe: Globe,
  tiktok: Globe,
};

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);

  useEffect(() => {
    supabase
      .from("social_links_public" as any)
      .select("id, platform, url, icon_name, sort_order")
      .order("sort_order")
      .then(({ data }) => setSocialLinks((data as any as SocialLinkItem[]) || []));
  }, []);

  return (
    <footer ref={ref} className="border-t border-border bg-card mt-16">
      <div className="container py-10">
        {/* Main footer grid — all viewports */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary mb-3">
              <TrendingUp className="h-5 w-5 text-accent" />
              Kenya Fund Finder
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Your trusted platform for comparing CMA-regulated investment funds in Kenya.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {socialLinks.map((link) => {
                  const IconComponent = ICON_MAP[link.icon_name.toLowerCase()] || Globe;
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors" aria-label={link.platform}>
                      <IconComponent className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Markets */}
          <div>
            <h4 className="font-heading font-semibold mb-3 text-sm text-foreground">Markets</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/stocks" className="hover:text-foreground transition-colors">Stocks</Link></li>
              <li><Link to="/funds" className="hover:text-foreground transition-colors">Unit Trusts</Link></li>
              <li><Link to="/rates" className="hover:text-foreground transition-colors">FX Rates</Link></li>
              <li><Link to="/commodities" className="hover:text-foreground transition-colors">Commodities</Link></li>
              <li><Link to="/markets" className="hover:text-foreground transition-colors">Market Dashboard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold mb-3 text-sm text-foreground">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/calculator" className="hover:text-foreground transition-colors">Calculator</Link></li>
              <li><Link to="/news" className="hover:text-foreground transition-colors">News</Link></li>
              <li><Link to="/learn" className="hover:text-foreground transition-colors">Learn</Link></li>
              <li><Link to="/compare" className="hover:text-foreground transition-colors">Compare Funds</Link></li>
              <li><Link to="/page/about" className="hover:text-foreground transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold mb-3 text-sm text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link></li>
              <li><Link to="/page/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Important Disclaimer:</strong> This platform provides information only and does not constitute investment advice. Past performance is not indicative of future results. All investments carry risk. Please consult with a qualified financial advisor before making any investment decisions.
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All funds listed are regulated by the <strong>Capital Markets Authority (CMA) of Kenya</strong>. Yields shown are gross annual effective yields before 15% withholding tax. Data may not reflect real-time values.
          </p>
          <p className="text-xs text-muted-foreground text-center mt-6">
            © {new Date().getFullYear()} Kenya Fund Finder. All rights reserved. Not affiliated with any fund manager or the CMA.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;