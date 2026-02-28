import Navbar from "./Navbar";
import Footer from "./Footer";
import { usePageView } from "@/hooks/usePageView";

const Layout = ({ children }: { children: React.ReactNode }) => {
  usePageView();
  return (
    <div className="flex min-h-screen flex-col font-body">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
