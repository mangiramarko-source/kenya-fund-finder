import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompareProvider } from "@/hooks/useCompare";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import CompareBar from "./components/compare/CompareBar";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsTracker from "./components/AnalyticsTracker";
// CookieConsent loaded eagerly: it's the LCP element on first visit;
// lazy-loading it delays paint and tanks the LCP score.
import CookieConsent from "./components/CookieConsent";
import SeoRoutePolicy from "./components/SeoRoutePolicy";
import { NotificationProvider } from "./components/alerts/NotificationProvider";

// Defer heavy/non-critical UI to shrink initial JS bundle
const CompareModal = lazy(() => import("./components/compare/CompareModal"));
const HomeHero = lazy(() => import("./components/home/HomeHero"));

// Lazy-loaded routes
const Index = lazy(() => import("./pages/Index"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const FundDetailPage = lazy(() => import("./pages/FundDetailPage"));

const NewsPage = lazy(() => import("./pages/NewsPage"));
const NewsArchivePage = lazy(() => import("./pages/NewsArchivePage"));
const NewsArticlePage = lazy(() => import("./pages/NewsArticlePage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const MmfGuidePage = lazy(() => import("./pages/MmfGuidePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ChecklistPage = lazy(() => import("./pages/ChecklistPage"));
const SitePage = lazy(() => import("./pages/SitePage"));
const RatesPage = lazy(() => import("./pages/RatesPage"));
const CommoditiesPage = lazy(() => import("./pages/CommoditiesPage"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const StocksDemoPage = lazy(() => import("./pages/StocksDemoPage"));
const DemoStocksPage = lazy(() => import("./pages/DemoStocksPage"));
const DemoStockFeedPage = lazy(() => import("./pages/DemoStockFeedPage"));
const TreasuryPage = lazy(() => import("./pages/TreasuryPage"));
const StockDecisionFeedDemoPage = lazy(() => import("./pages/StockDecisionFeedDemoPage"));
const StockDetailPage = lazy(() => import("./pages/StockDetailPage"));
const StocksMobileDesktopDemoPage = lazy(() => import("./pages/StocksMobileDesktopDemoPage"));
const MarketDashboardPage = lazy(() => import("./pages/MarketDashboardPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const PortfolioSummaryPage = lazy(() => import("./pages/PortfolioSummaryPage"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const AiLabPage = lazy(() => import("./pages/AiLabPage"));
const DevEmailPreviewPage = lazy(() => import("./pages/DevEmailPreviewPage"));
const DevWelcomePreviewPage = lazy(() => import("./pages/DevWelcomePreviewPage"));
const NotFound = lazy(() => import("./pages/NotFound"));


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

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompareProvider>
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
                    <Route path="/checklist" element={<ChecklistPage />} />
                    <Route path="/page/:slug" element={<SitePage />} />
                    <Route path="/treasury" element={<TreasuryPage />} />
                    <Route path="/tbills" element={<Navigate to="/treasury" replace />} />
                    <Route path="/bonds" element={<Navigate to="/treasury" replace />} />
                    <Route path="/rates" element={<RatesPage />} />
                    <Route path="/commodities" element={<CommoditiesPage />} />
                    <Route path="/stocks" element={<StocksPage />} />
                    <Route path="/stocks-demo" element={<StocksDemoPage />} />
                    <Route path="/demo-stocks-feed" element={<DemoStocksPage />} />
                    <Route path="/demo-feed" element={<DemoStockFeedPage />} />
                    <Route path="/demo-stock-insights" element={<StockDecisionFeedDemoPage />} />
                    <Route path="/stocks/demo-2" element={<StocksMobileDesktopDemoPage />} />
                    <Route path="/stocks/:symbol" element={<StockDetailPage />} />
                    <Route path="/markets" element={<MarketDashboardPage />} />
                    <Route path="/overview" element={<Navigate to="/" replace />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/portfolio" element={<PortfolioPage />} />
                    <Route path="/portfolio/summary" element={<PortfolioSummaryPage />} />
                    <Route path="/calculator" element={<CalculatorPage />} />
                    <Route path="/watchlist" element={<WatchlistPage />} />
                    <Route path="/ai-lab" element={<AiLabPage />} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    {import.meta.env.DEV && (
                      <Route path="/dev/email-preview" element={<DevEmailPreviewPage />} />
                    )}
                    {import.meta.env.DEV && (
                      <Route path="/dev/welcome-preview" element={<DevWelcomePreviewPage />} />
                    )}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </Layout>
                <CompareBar />
                <Suspense fallback={null}>
                  <CompareModal />
                </Suspense>
                <Suspense fallback={null}>
                  <HomeHero />
                </Suspense>
                <CookieConsent />
                <Analytics />
              </NotificationProvider>
            </BrowserRouter>
          </CompareProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
