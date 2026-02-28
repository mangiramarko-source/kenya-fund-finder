import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import ComparePage from "./pages/ComparePage";
import FundDetailPage from "./pages/FundDetailPage";
import CalculatorPage from "./pages/CalculatorPage";
import NewsPage from "./pages/NewsPage";
import LearnPage from "./pages/LearnPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/compare/:id" element={<FundDetailPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
