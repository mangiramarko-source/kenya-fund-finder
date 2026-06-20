import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopSidebar from "./DesktopSidebar";
import DesktopTopBar from "./DesktopTopBar";
import OfflineBanner from "./OfflineBanner";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const showTicker = pathname === "/";
  // Immersive mobile view for news article pages: hide mobile navbar & footer
  const isNewsArticle = /^\/news\/[^/]+/.test(pathname);
  // AI Lab uses its own floating composer — hide global footer entirely
  const isAiLab = pathname === "/ai-lab" || pathname.startsWith("/ai-lab/");

  return (
    <div className={`flex min-h-screen font-body${isAiLab ? " h-dvh max-h-dvh overflow-hidden" : ""}`}>
      <SkipToContent />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main column */}
      <div className={`flex-1 flex flex-col min-w-0${isAiLab ? " min-h-0 overflow-hidden" : ""}`}>
        {/* Desktop top bar */}
        <DesktopTopBar />

        <OfflineBanner />

        {/* Mobile-only navbar — hidden on news article pages and AI Lab (immersive chat) */}
        {!isNewsArticle && !isAiLab && (
          <div className="md:hidden">
            <Navbar />
          </div>
        )}
        {showTicker && (
          <div className="md:hidden">
            <CurrencyTicker />
          </div>
        )}
        <main
          id="main-content"
          className={
            isAiLab
              ? "flex-1 min-h-0 flex flex-col overflow-hidden"
              : "flex-1 min-h-[80vh]"
          }
        >
          {children}
        </main>
        {/* Footer hidden on mobile news article pages and entirely on the AI Lab */}
        {!isAiLab && (
          <div className={isNewsArticle ? "hidden md:block" : ""}>
            <Footer />
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
