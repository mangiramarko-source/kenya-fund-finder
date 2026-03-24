import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopSidebar from "./DesktopSidebar";
import SearchDialog from "./SearchDialog";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen font-body">
      {/* Desktop sidebar — hidden on mobile, hidden on admin */}
      {!isAdmin && <DesktopSidebar />}

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        <SkipToContent />
        {/* Mobile navbar only */}
        <div className="md:hidden">
          <Navbar />
        </div>

        {/* Desktop top bar */}
        {!isAdmin && (
          <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-heading font-bold text-foreground">
                {pathname === "/" ? "Dashboard" : pathname === "/stocks" ? "NSE Stocks" : pathname === "/rates" ? "FX Rates" : pathname === "/commodities" ? "Commodities" : pathname === "/calculator" ? "Calculator" : pathname === "/news" ? "News" : pathname === "/learn" ? "Learn" : pathname.startsWith("/compare") ? "Compare Funds" : "Kenya Fund Finder"}
              </h1>
              {pathname === "/" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                  </span>
                  Market Online
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SearchDialog />
            </div>
          </header>
        )}

        {pathname === "/" && <div className="md:hidden"><CurrencyTicker /></div>}

        <main id="main-content" className="flex-1">{children}</main>

        {/* Footer — only on mobile for desktop sidebar layout */}
        <div className="md:hidden">
          <Footer />
        </div>
        {/* Desktop: minimal footer */}
        <footer className="hidden md:flex items-center justify-between px-6 py-3 border-t border-border text-[10px] text-muted-foreground">
          <p>All funds regulated by the <strong>Capital Markets Authority (CMA) of Kenya</strong>. Yields are gross annual effective rates before 15% withholding tax.</p>
          <p className="shrink-0">© {new Date().getFullYear()} Kenya Fund Finder</p>
        </footer>
      </div>

      <CookieConsent />
      {/* Keep SearchDialog mounted for ⌘K */}
      <div className="hidden"><SearchDialog /></div>
    </div>
  );
};

export default Layout;
