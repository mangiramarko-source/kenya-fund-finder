import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopSidebar from "./DesktopSidebar";
import DesktopTopBar from "./DesktopTopBar";
import SuggestionBox from "./SuggestionBox";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const showTicker = pathname === "/" || pathname === "/funds";

  return (
    <div className="flex min-h-screen font-body">
      <SkipToContent />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop top bar */}
        <DesktopTopBar />

        {/* Mobile-only navbar */}
        <div className="md:hidden">
          <Navbar />
        </div>
        {showTicker && (
          <div className="md:hidden">
            <CurrencyTicker />
          </div>
        )}
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
        <SuggestionBox />
      </div>
    </div>
  );
};

export default Layout;
