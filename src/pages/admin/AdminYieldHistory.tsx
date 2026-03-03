import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface YieldSnapshot {
  id: string;
  fund_id: string;
  annual_yield: number;
  daily_yield: number;
  snapshot_date: string;
  created_at: string;
}

interface AdminYieldHistoryProps {
  fundId: string;
  fundName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminYieldHistory = ({ fundId, fundName, open, onOpenChange }: AdminYieldHistoryProps) => {
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !fundId) return;
    setLoading(true);
    supabase
      .from("fund_yield_snapshots")
      .select("*")
      .eq("fund_id", fundId)
      .order("snapshot_date", { ascending: false })
      .then(({ data }) => {
        setSnapshots((data as YieldSnapshot[]) || []);
        setLoading(false);
      });
  }, [open, fundId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yield History — {fundName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No yield history yet. History is recorded automatically when you update annual rates or daily yields.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-right px-3 py-2 font-semibold">Annual Rate</th>
                  <th className="text-right px-3 py-2 font-semibold">Daily Yield</th>
                  <th className="text-center px-3 py-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap, i) => {
                  const prev = snapshots[i + 1];
                  const annualDiff = prev ? snap.annual_yield - prev.annual_yield : 0;
                  const isUp = annualDiff > 0;
                  const isDown = annualDiff < 0;
                  return (
                    <tr key={snap.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(snap.snapshot_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{Number(snap.annual_yield).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(snap.daily_yield).toFixed(4)}%</td>
                      <td className="px-3 py-2 text-center">
                        {prev ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs ${isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                            {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {annualDiff !== 0 ? `${annualDiff > 0 ? "+" : ""}${annualDiff.toFixed(2)}%` : "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminYieldHistory;
