import { useLiveAssets } from "@/hooks/usePortfolio";
import { STARTER_PORTFOLIOS, resolveStarterPack, type StarterPortfolio } from "@/data/starterPortfolios";
import { portfolioStorage } from "@/lib/portfolioStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  onLoaded?: () => void;
}

const StarterPortfolios = ({ onLoaded }: Props) => {
  const { user } = useAuth();
  const { data: liveAssets, isLoading } = useLiveAssets();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const loadPack = async (pack: StarterPortfolio) => {
    const items = resolveStarterPack(pack, liveAssets);
    if (items.length === 0) {
      toast.error("Couldn't load this starter pack — try again in a moment.");
      return;
    }
    setBusy(pack.id);
    try {
      if (!user) {
        portfolioStorage.addMany(items);
      } else {
        const now = new Date().toISOString();
        const rows = items.map((i) => ({
          user_id: user.id,
          asset_type: i.asset_type,
          asset_name: i.asset_name,
          ticker: i.ticker ?? null,
          units: i.units,
          buy_price: i.buy_price,
          current_price: i.current_price,
          current_yield: i.current_yield ?? 0,
          buy_date: i.buy_date ?? now,
          notes: i.notes ?? "",
        }));
        const { error } = await supabase.from("mock_portfolios").insert(rows);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      toast.success(`Loaded "${pack.name}"`, {
        description: `${items.length} holdings added to your portfolio.`,
      });
      onLoaded?.();
    } catch (e) {
      toast.error("Failed to load pack", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-border bg-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Start with a ready-made portfolio
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            One click loads real Kenyan funds and stocks. You can edit or remove anything afterwards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STARTER_PORTFOLIOS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-2 hover:border-accent/40 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-xl leading-none">{pack.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-primary">{pack.name}</div>
                <div className="text-[11px] text-muted-foreground">{pack.tagline}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/90 leading-snug">{pack.description}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto h-8 text-xs"
              disabled={isLoading || busy === pack.id}
              onClick={() => loadPack(pack)}
            >
              {busy === pack.id ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Loading…
                </>
              ) : (
                "Load this portfolio"
              )}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default StarterPortfolios;
