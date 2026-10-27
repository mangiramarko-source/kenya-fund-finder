import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import DesktopTopBar from "./DesktopTopBar";
import OfflineBanner from "./OfflineBanner";
import MobileAiLabFab from "./MobileAiLabFab";
import DesktopAiLabChat from "@/components/ai-lab/DesktopAiLabChat";
import MobileBottomNav from "./mobile/MobileBottomNav";
import { isAiLabEnabled } from "@/lib/featureFlags";
import { usePageView } from "@/hooks/usePageView";

function shouldShowMobileAiLabFab(pathname: string): boolean {
  return [
    "/",
    "/portfolio",
    "/watchlist",
    "/stocks",
    "/funds",
    "/treasury",
    "/rates",
    "/commodities",
  ].includes(pathname);
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  const { pathname } = useLocation();
  const showDesktopTicker = pathname === "/" || pathname === "/stocks";
  const showMobileTicker = pathname === "/";
  // Immersive mobile view for news article pages: hide mobile navbar & footer
  const isNewsArticle = /^\/news\/[^/]+/.test(pathname);
  const isAuthPage = pathname === "/auth";
  const isMobilePreview = pathname === "/mobile-preview";
  // AI Lab uses its own floating composer — hide global footer entirely
  const isAiLab = pathname === "/ai-lab" || pathname.startsWith("/ai-lab/");
  const isOverview = pathname === "/" || pathname === "/overview";
  const showMobileAiLabFab = shouldShowMobileAiLabFab(pathname);

  if (isMobilePreview) {
    return (
      <div className="min-h-screen bg-slate-950">
        <SkipToContent />
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

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
        {showDesktopTicker && (
          <div
            className={`fixed inset-x-0 z-40 w-full top-14 ${
              showMobileTicker ? "block" : "hidden md:block"
            }`}
          >
            <CurrencyTicker />
          </div>
        )}
        {showDesktopTicker && (
          <div className={`${showMobileTicker ? "h-9" : "hidden md:block h-9"} shrink-0`} aria-hidden="true" />
        )}

        <main
          id="main-content"
          className={
            isAiLab
              ? "flex-1 min-h-0 flex flex-col overflow-hidden"
              : isOverview
                ? "flex-1 min-h-0 md:overflow-hidden pb-20 md:pb-0"
              : "flex-1 min-h-[80vh] pb-20 md:pb-0"
          }
        >
          {children}
        </main>
        {/* Footer hidden on mobile news article pages, auth page, and entirely on the AI Lab */}
        {!isAiLab && !isAuthPage && (
          <div className={`${isNewsArticle ? "hidden md:block" : ""}${isOverview ? " md:hidden" : ""}`}>
            <Footer />
          </div>
        )}
        {/* Mobile Bottom Navigation Bar (Android/iOS standard) */}
        {!isAiLab && !isAuthPage && !isNewsArticle && <MobileBottomNav />}

        {isAiLabEnabled() && showMobileAiLabFab && <MobileAiLabFab />}
        {isAiLabEnabled() && !isAiLab && !isAuthPage && <DesktopAiLabChat />}
      </div>
    </div>
  );
};

export default Layout;
