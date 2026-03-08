import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompareProvider } from "@/hooks/useCompare";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import { Navigate } from "react-router-dom";
import FundDetailPage from "./pages/FundDetailPage";
import CalculatorPage from "./pages/CalculatorPage";
import NewsPage from "./pages/NewsPage";
import LearnPage from "./pages/LearnPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import ChecklistPage from "./pages/ChecklistPage";
import SitePage from "./pages/SitePage";
import NotFound from "./pages/NotFound";
import { ScrollToTop } from "./components/ScrollToTop";
import CompareBar from "./components/compare/CompareBar";
import CompareModal from "./components/compare/CompareModal";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompareProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Layout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/compare" element={<Navigate to="/" replace />} />
                  <Route path="/compare/:id" element={<FundDetailPage />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/learn" element={<LearnPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfUsePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/checklist" element={<ChecklistPage />} />
                  <Route path="/page/:slug" element={<SitePage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
              <CompareBar />
              <CompareModal />
            </BrowserRouter>
          </CompareProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
