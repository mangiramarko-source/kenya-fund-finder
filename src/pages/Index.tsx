import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { StatsGrid } from "@/components/StatsGrid";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero
          title="Kenya Fund Finder"
          subtitle="Real-time insights into the Nairobi Securities Exchange and Investment Funds."
        />
        <div className="container mx-auto px-4 py-12">
          <StatsGrid />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
