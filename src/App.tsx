import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RESEARCH_ARTICLES, articlePath } from "./data/seoGrowthContent";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompareProvider, useCompare } from "@/hooks/useCompare";
import { UniversalCompareProvider } from "@/hooks/useUniversalCompare";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import CompareBar from "./components/compare/CompareBar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import AnalyticsTracker from "./components/AnalyticsTracker";
import MarketPageLoader from "./components/MarketPageLoader";
import { getPageLoadingMessage } from "./lib/pageLoadingMessage";
// CookieConsent loaded eagerly: it's the LCP element on first visit;
// lazy-loading it delays paint and tanks the LCP score.
import CookieConsent from "./components/CookieConsent";
import SeoRoutePolicy from "./components/SeoRoutePolicy";
import { NotificationProvider } from "./components/alerts/NotificationProvider";
import PortfolioAccountSync from "./components/portfolio/PortfolioAccountSync";
import PortfolioImportPrompt from "./components/portfolio/PortfolioImportPrompt";

// Defer heavy/non-critical UI to shrink initial JS bundle
const CompareModal = lazyWithRetry(() => import("./components/compare/CompareModal"), "CompareModal");

/**
 * Host component for CompareModal.
 * Only mounts and dynamically fetches the CompareModal bundle when the user has actually
 * opened the modal with 2 or more funds selected. This prevents unconditionally downloading
 * CompareModal on initial page load across the entire site.
 */
const CompareModalHost = () => {
  const { selected, isOpen } = useCompare();
  if (!isOpen || selected.length < 2) return null;
  return (
    <Suspense fallback={null}>
      <CompareModal />
    </Suspense>
  );
};

// Lazy-loaded routes with stale-chunk auto-retry
const Index = lazyWithRetry(() => import("./pages/Index"), "Index");
const ComparePage = lazyWithRetry(() => import("./pages/ComparePage"), "ComparePage");
const FundDetailPage = lazyWithRetry(() => import("./pages/FundDetailPage"), "FundDetailPage");

const NewsPage = lazyWithRetry(() => import("./pages/NewsPage"), "NewsPage");
const NewsArchivePage = lazyWithRetry(() => import("./pages/NewsArchivePage"), "NewsArchivePage");
const NewsArticlePage = lazyWithRetry(() => import("./pages/NewsArticlePage"), "NewsArticlePage");
const LearnPage = lazyWithRetry(() => import("./pages/LearnPage"), "LearnPage");
const MmfGuidePage = lazyWithRetry(() => import("./pages/MmfGuidePage"), "MmfGuidePage");
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage"), "AuthPage");
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"), "AuthCallback");
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"), "ResetPasswordPage");
const AdminLoginPage = lazyWithRetry(() => import("./pages/AdminLoginPage"), "AdminLoginPage");
const AdminPage = lazyWithRetry(() => import("./pages/AdminPage"), "AdminPage");
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"), "ProfilePage");
const DeleteAccountPage = lazyWithRetry(() => import("./pages/DeleteAccountPage"), "DeleteAccountPage");
const SitePage = lazyWithRetry(() => import("./pages/SitePage"), "SitePage");
const RatesPage = lazyWithRetry(() => import("./pages/RatesPage"), "RatesPage");
const CommoditiesPage = lazyWithRetry(() => import("./pages/CommoditiesPage"), "CommoditiesPage");
const StocksPage = lazyWithRetry(() => import("./pages/StocksPage"), "StocksPage");
const TreasuryPage = lazyWithRetry(() => import("./pages/TreasuryPage"), "TreasuryPage");
const StockDetailPage = lazyWithRetry(() => import("./pages/StockDetailPage"), "StockDetailPage");
const MarketDashboardPage = lazyWithRetry(() => import("./pages/MarketDashboardPage"), "MarketDashboardPage");
const AlertsPage = lazyWithRetry(() => import("./pages/AlertsPage"), "AlertsPage");
const PortfolioPage = lazyWithRetry(() => import("./pages/PortfolioPage"), "PortfolioPage");
const PortfolioSummaryPage = lazyWithRetry(() => import("./pages/PortfolioSummaryPage"), "PortfolioSummaryPage");
const OverviewPage = lazyWithRetry(() => import("./pages/OverviewPage"), "OverviewPage");
const CalculatorPage = lazyWithRetry(() => import("./pages/CalculatorPage"), "CalculatorPage");
const MmfResearchPage = lazyWithRetry(() => import("./pages/MmfResearchPage"), "MmfResearchPage");
const MmfCalculatorPage = lazyWithRetry(() => import("./pages/MmfCalculatorPage"), "MmfCalculatorPage");
const SavingsPage = lazyWithRetry(() => import("./pages/SavingsPage"), "SavingsPage");
const ResearchArticlePage = lazyWithRetry(() => import("./pages/ResearchArticlePage"), "ResearchArticlePage");
const WatchlistPage = lazyWithRetry(() => import("./pages/WatchlistPage"), "WatchlistPage");
const AiLabPage = lazyWithRetry(() => import("./pages/AiLabPage"), "AiLabPage");
const DevMobilePreviewPage = lazyWithRetry(() => import("./pages/DevMobilePreviewPage"), "DevMobilePreviewPage");
const IntroPreviewPage = lazyWithRetry(() => import("./pages/preview/IntroPreviewPage"), "IntroPreviewPage");
import { isAiLabEnabled } from "@/lib/featureFlags";
const DevOnlyPages = import.meta.env.DEV
  ? {
      ChecklistPage: lazyWithRetry(() => import("./pages/ChecklistPage"), "ChecklistPage"),
      StocksDemoPage: lazyWithRetry(() => import("./pages/StocksDemoPage"), "StocksDemoPage"),
      DemoStocksPage: lazyWithRetry(() => import("./pages/DemoStocksPage"), "DemoStocksPage"),
      DemoStockFeedPage: lazyWithRetry(() => import("./pages/DemoStockFeedPage"), "DemoStockFeedPage"),
      StockDecisionFeedDemoPage: lazyWithRetry(() => import("./pages/StockDecisionFeedDemoPage"), "StockDecisionFeedDemoPage"),
      StocksMobileDesktopDemoPage: lazyWithRetry(() => import("./pages/StocksMobileDesktopDemoPage"), "StocksMobileDesktopDemoPage"),
      DevEmailPreviewPage: lazyWithRetry(() => import("./pages/DevEmailPreviewPage"), "DevEmailPreviewPage"),
      DevWelcomePreviewPage: lazyWithRetry(() => import("./pages/DevWelcomePreviewPage"), "DevWelcomePreviewPage"),
      DevNotificationPreviewPage: lazyWithRetry(() => import("./pages/DevNotificationPreviewPage"), "DevNotificationPreviewPage"),
      DevPortfolioChangePreviewPage: lazyWithRetry(() => import("./pages/DevPortfolioChangePreviewPage"), "DevPortfolioChangePreviewPage"),
      DevAiLabPopupPreviewPage: lazyWithRetry(() => import("./pages/DevAiLabPopupPreviewPage"), "DevAiLabPopupPreviewPage"),
      DevAiResultCardPreviewPage: lazyWithRetry(() => import("./pages/DevAiResultCardPreviewPage"), "DevAiResultCardPreviewPage"),
      DevCompareDemoPage: lazyWithRetry(() => import("./pages/DevCompareDemoPage"), "DevCompareDemoPage"),
    }
  : null;
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 min — data feels fresh, no refetch on revisit
      gcTime: 5 * 60_000,       // keep cache 5 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => {
  const { pathname } = useLocation();

  return <MarketPageLoader message={getPageLoadingMessage(pathname)} className="min-h-[60vh]" />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PortfolioAccountSync />
          <PortfolioImportPrompt />
          <CompareProvider>
            <UniversalCompareProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <NotificationProvider>
                <AnalyticsTracker />
                <ScrollToTop />
                <SeoRoutePolicy />
                <Layout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<OverviewPage />} />
                    <Route path="/funds" element={<Index />} />
                    <Route path="/savings" element={<SavingsPage />} />
                    <Route path="/fixed-deposits" element={<Navigate to="/savings" replace />} />
                    <Route path="/fixed-deposit" element={<Navigate to="/savings" replace />} />
                    <Route path="/saccos" element={<Navigate to="/savings?tab=saccos" replace />} />
                    <Route path="/sacco" element={<Navigate to="/savings?tab=saccos" replace />} />
                    <Route path="/money-market-funds-kenya" element={<MmfResearchPage />} />
                    <Route path="/mmf-calculator" element={<MmfCalculatorPage />} />
                    {RESEARCH_ARTICLES.map(article => <Route key={article.slug} path={articlePath(article)} element={<ResearchArticlePage />} />)}
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/compare/:id" element={<FundDetailPage />} />



                    
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/news/archive" element={<NewsArchivePage />} />
                    <Route path="/news/archive/:page" element={<NewsArchivePage />} />
                    <Route path="/news/:id" element={<NewsArticlePage />} />
                    <Route path="/learn" element={<LearnPage />} />
                    <Route path="/learn/how-to-invest-in-money-market-funds-kenya" element={<MmfGuidePage />} />
                    <Route path="/privacy" element={<SitePage />} />
                    <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
                    <Route path="/terms" element={<SitePage />} />
                    <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
                    <Route path="/contact" element={<Navigate to="/page/contact" replace />} />
                    <Route path="/about" element={<Navigate to="/page/about" replace />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/delete-account" element={<DeleteAccountPage />} />
                    <Route path="/account-deletion" element={<Navigate to="/delete-account" replace />} />
                    <Route path="/page/:slug" element={<SitePage />} />
                    <Route path="/treasury" element={<TreasuryPage />} />
                    <Route path="/tbills" element={<Navigate to="/treasury" replace />} />
                    <Route path="/bonds" element={<Navigate to="/treasury" replace />} />
                    <Route path="/rates" element={<RatesPage />} />
                    <Route path="/commodities" element={<CommoditiesPage />} />
                    <Route path="/stocks" element={<StocksPage />} />
                    <Route path="/stocks/:symbol" element={<StockDetailPage />} />
                    <Route path="/markets" element={<MarketDashboardPage />} />
                    <Route path="/overview" element={<Navigate to="/" replace />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/portfolio/summary" element={<PortfolioSummaryPage />} />
                    <Route path="/calculator" element={<CalculatorPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/ai-lab" element={isAiLabEnabled() ? <AiLabPage /> : <Navigate to="/funds" replace />} />
                    <Route path="/mobile-preview" element={<DevMobilePreviewPage />} />
                    <Route path="/preview/mobile-intros" element={<IntroPreviewPage />} />
                    <Route path="/preview/intro-lifestyle" element={<IntroPreviewPage initialOption="lifestyle" />} />
                    <Route path="/preview/intro-1" element={<IntroPreviewPage initialOption="1" />} />
                    <Route path="/preview/intro-2" element={<IntroPreviewPage initialOption="2" />} />
                    <Route path="/preview/intro-3" element={<IntroPreviewPage initialOption="3" />} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/mmf" element={<Navigate to="/admin?tab=mmf-inspect" replace />} />
                    <Route path="/admin/mmf-inspect" element={<Navigate to="/admin?tab=mmf-inspect" replace />} />
                    <Route path="/admin/mmf-inspection" element={<Navigate to="/admin?tab=mmf-inspect" replace />} />
                    {DevOnlyPages ? <>
                      <Route path="/checklist" element={<DevOnlyPages.ChecklistPage />} />
                      <Route path="/stocks-demo" element={<DevOnlyPages.StocksDemoPage />} />
                      <Route path="/demo-stocks-feed" element={<DevOnlyPages.DemoStocksPage />} />
                      <Route path="/demo-feed" element={<DevOnlyPages.DemoStockFeedPage />} />
                      <Route path="/demo-stock-insights" element={<DevOnlyPages.StockDecisionFeedDemoPage />} />
                      <Route path="/demo/stock-decision-feed" element={<DevOnlyPages.StockDecisionFeedDemoPage />} />
                      <Route path="/stocks/demo-2" element={<DevOnlyPages.StocksMobileDesktopDemoPage />} />
                      <Route path="/dev/email-preview" element={<DevOnlyPages.DevEmailPreviewPage />} />
                      <Route path="/dev/welcome-preview" element={<DevOnlyPages.DevWelcomePreviewPage />} />
                      <Route path="/dev/notification-preview" element={<DevOnlyPages.DevNotificationPreviewPage />} />
                      <Route path="/dev/portfolio-change-preview" element={<DevOnlyPages.DevPortfolioChangePreviewPage />} />
                      <Route path="/dev/ai-lab-popup-preview" element={<DevOnlyPages.DevAiLabPopupPreviewPage />} />
                      <Route path="/dev/ai-result-card-preview" element={<DevOnlyPages.DevAiResultCardPreviewPage />} />
                      <Route path="/dev/compare-demo" element={<DevOnlyPages.DevCompareDemoPage />} />
                    </> : null}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </Layout>
                <CompareBar />
                <ErrorBoundary fallback={null}>
                  <CompareModalHost />
                </ErrorBoundary>
                <CookieConsent />
                <Analytics />
                <SpeedInsights />
              </NotificationProvider>
            </BrowserRouter>
          </UniversalCompareProvider>
        </CompareProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
