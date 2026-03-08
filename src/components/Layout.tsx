import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import SkipToContent from "./SkipToContent";
import CurrencyTicker from "./CurrencyTicker";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  return (
    <div className="flex min-h-screen flex-col font-body">
      <SkipToContent />
      <Navbar />
      <CurrencyTicker />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
};

export default Layout;
