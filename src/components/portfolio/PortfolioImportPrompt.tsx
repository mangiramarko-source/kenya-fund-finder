import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { portfolioStorage } from "@/lib/portfolioStorage";
import { supabase } from "@/integrations/supabase/client";

const promptKey = (userId: string) => `kff_portfolio_import_prompt_v1:${userId}`;

/** Offers to move a browser-only guest portfolio into the newly signed-in account. */
export default function PortfolioImportPrompt() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const localItems = userId ? portfolioStorage.list() : [];

  useEffect(() => {
    if (authLoading || !userId) {
      setOpen(false);
      return;
    }
    setOpen(localItems.length > 0 && localStorage.getItem(promptKey(userId)) !== "dismissed");
  }, [authLoading, localItems.length, userId]);

  const dismiss = () => {
    if (userId) localStorage.setItem(promptKey(userId), "dismissed");
    setOpen(false);
  };

  const importPortfolio = async () => {
    if (!userId || localItems.length === 0) return dismiss();
    setImporting(true);
    const rows = localItems.map((item) => ({
      user_id: userId,
      client_source_id: item.id,
      asset_type: item.asset_type,
      asset_name: item.asset_name,
      ticker: item.ticker,
      asset_id: item.asset_id ?? null,
      units: item.units,
      buy_price: item.buy_price,
      current_price: item.current_price,
      current_yield: item.current_yield,
      buy_date: item.buy_date,
      notes: item.notes,
    }));
    const { error } = await supabase
      .from("mock_portfolios")
      .upsert(rows, { onConflict: "user_id,client_source_id", ignoreDuplicates: true });

    setImporting(false);
    if (error) {
      toast.error("Could not import this device's portfolio. Please try again.");
      return;
    }

    portfolioStorage.removeMany(localItems.map((item) => item.id));
    localStorage.setItem(promptKey(userId), "dismissed");
    await queryClient.invalidateQueries({ queryKey: ["mock_portfolios", userId] });
    setOpen(false);
    toast.success(`${localItems.length} holding${localItems.length === 1 ? "" : "s"} imported to your account.`);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import this device’s portfolio?</DialogTitle>
          <DialogDescription>
            {localItems.length} guest holding{localItems.length === 1 ? "" : "s"} can be added to your account and kept in sync across devices. Existing account holdings will not be changed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={dismiss} disabled={importing}>Not now</Button>
          <Button onClick={() => void importPortfolio()} disabled={importing}>
            {importing ? "Importing…" : "Import holdings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
