import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopTopBar from "./DesktopTopBar";
import OfflineBanner from "./OfflineBanner";
import MobileAiLabFab from "./MobileAiLabFab";
import { usePageView } from "@/hooks/usePageView";

function shouldShowMobileAiLabFab(pathname: string): boolean {
  return pathname === "/" || pathname === "/overview";
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const showTicker = pathname === "/" || pathname === "/stocks";
  // Immersive mobile view for news article pages: hide mobile navbar & footer
  const isNewsArticle = /^\/news\/[^/]+/.test(pathname);
  const isAuthPage = pathname === "/auth";
  // AI Lab uses its own floating composer — hide global footer entirely
  const isAiLab = pathname === "/ai-lab" || pathname.startsWith("/ai-lab/");
  const showMobileAiLabFab = shouldShowMobileAiLabFab(pathname);

  return (
    <div className={`flex min-h-screen font-body bg-background overflow-x-hidden${isAiLab ? " h-dvh max-h-dvh overflow-hidden" : ""}`}>
      <SkipToContent />

      {/* Main column */}
      <div className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden bg-background${isAiLab ? " min-h-0 overflow-hidden" : ""}`}>
        <DesktopTopBar />
        {!isAiLab && <div className="hidden md:block h-14 shrink-0" aria-hidden="true" />}
        
        <OfflineBanner />

        {!isNewsArticle && !isAiLab && !isAuthPage && (
          <div className="md:hidden">
            <Navbar />
          </div>
        )}
        {showTicker && (
          <div className="fixed inset-x-0 top-14 z-40 hidden w-full md:block">
            <CurrencyTicker />
          </div>
        )}
        {showTicker && <div className="hidden md:block h-9 shrink-0" aria-hidden="true" />}

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
        {/* Footer hidden on mobile news article pages, auth page, and entirely on the AI Lab */}
        {!isAiLab && !isAuthPage && (
          <div className={isNewsArticle ? "hidden md:block" : ""}>
            <Footer />
          </div>
        )}
        {showMobileAiLabFab && <MobileAiLabFab />}
      </div>
    </div>
  );
};

export default Layout;
