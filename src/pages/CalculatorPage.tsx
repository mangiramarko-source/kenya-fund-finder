import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CurrencyConverter from "@/components/calculator/CurrencyConverter";
import PayeCalculator from "@/components/calculator/PayeCalculator";
import { Calculator as CalcIcon } from "lucide-react";

const CalculatorPage = () => {
  useEffect(() => {
    document.title = "Calculator | Kenya Fund Finder";
  }, []);

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <header className="mb-5 md:mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent/10 text-accent">
            <CalcIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Calculator</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Currency conversion and KRA PAYE estimates</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="currency" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="paye">PAYE</TabsTrigger>
        </TabsList>
        <TabsContent value="currency">
          <CurrencyConverter />
        </TabsContent>
        <TabsContent value="paye">
          <PayeCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalculatorPage;
