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
  tiktok: Globe, // fallback
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link to="/" className="flex items-center gap-2 font-heading text-base font-bold text-foreground mb-3 group">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-accent-foreground">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="tracking-tight">Kenya Fund Finder</span>
                <span className="text-[9px] font-normal text-muted-foreground tracking-wider uppercase">Market Intelligence</span>
              </div>
            </Link>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Your trusted platform for comparing Money Market Funds in Kenya. All funds listed are regulated by the Capital Markets Authority.
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                {socialLinks.map((link) => {
                  const IconComponent = ICON_MAP[link.icon_name.toLowerCase()] || Globe;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      aria-label={link.platform}
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Links</h4>
            <ul className="space-y-1.5">
              {[
                { to: "/", label: "Funds" },
                { to: "/stocks", label: "NSE Stocks" },
                { to: "/calculator", label: "Calculator" },
                { to: "/news", label: "News" },
                { to: "/learn", label: "Learn" },
                { to: "/page/about", label: "About" },
                { to: "/page/contact", label: "Contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Legal</h4>
            <ul className="space-y-1.5">
              <li><Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Use</Link></li>
            </ul>
          </div>

          {/* Market Data */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Markets</h4>
            <ul className="space-y-1.5">
              <li><Link to="/rates" className="text-xs text-muted-foreground hover:text-foreground transition-colors">FX Rates</Link></li>
              <li><Link to="/commodities" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Commodities</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-border/60">
          <div className="flex items-start gap-2.5 mb-4 rounded-lg bg-muted/30 p-3 border border-border/40">
            <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/70">Disclaimer:</strong> This platform provides information only and does not constitute investment advice. Past performance is not indicative of future results. All investments carry risk. Please consult with a qualified financial advisor before making any investment decisions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <p>All funds regulated by the <strong>Capital Markets Authority (CMA) of Kenya</strong>. Yields are gross annual effective yields before 15% withholding tax.</p>
            <p className="shrink-0">© {new Date().getFullYear()} Kenya Fund Finder</p>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
