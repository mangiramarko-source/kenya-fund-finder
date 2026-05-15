import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopSidebar from "./DesktopSidebar";
import DesktopTopBar from "./DesktopTopBar";
import OfflineBanner from "./OfflineBanner";
import SeoBreadcrumbs from "./SeoBreadcrumbs";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const showTicker = pathname === "/";
  // Immersive mobile view for news article pages: hide mobile navbar & footer
  const isNewsArticle = /^\/news\/[^/]+/.test(pathname);

  return (
    <div className="flex min-h-screen font-body">
      <SkipToContent />
      <SeoBreadcrumbs />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <DesktopTopBar />

        <OfflineBanner />

        {/* Mobile-only navbar — hidden on news article pages */}
        {!isNewsArticle && (
          <div className="md:hidden">
            <Navbar />
          </div>
        )}
        {showTicker && (
          <div className="md:hidden">
            <CurrencyTicker />
          </div>
        )}
        <main id="main-content" className="flex-1 min-h-[80vh]">{children}</main>
        {/* Footer hidden on mobile news article pages for immersive view */}
        <div className={isNewsArticle ? "hidden md:block" : ""}>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Layout;
