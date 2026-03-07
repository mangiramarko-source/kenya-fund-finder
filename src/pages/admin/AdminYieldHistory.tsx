import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { YIELD_UNITS } from "@/lib/api";

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
  yieldUnit: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminYieldHistory = ({ fundId, fundName, open, onOpenChange }: AdminYieldHistoryProps) => {
  const [snapshots, setSnapshots] = useState<YieldSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newAnnual, setNewAnnual] = useState("");
  const [newDaily, setNewDaily] = useState("");
  const { toast } = useToast();

  const load = () => {
    if (!fundId) return;
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
  };

  useEffect(() => {
    if (open) load();
  }, [open, fundId]);

  const handleAdd = async () => {
    if (!newDate || !newAnnual) {
      toast({ title: "Missing fields", description: "Date and Annual Rate are required.", variant: "destructive" });
      return;
    }
    const annual = parseFloat(newAnnual);
    const daily = newDaily ? parseFloat(newDaily) : parseFloat((annual / 365).toFixed(4));
    if (isNaN(annual) || annual < 0 || annual > 100) {
      toast({ title: "Invalid rate", description: "Annual rate must be 0–100%.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("fund_yield_snapshots").upsert(
      { fund_id: fundId, snapshot_date: newDate, annual_yield: annual, daily_yield: daily },
      { onConflict: "fund_id,snapshot_date" }
    );
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Snapshot added" });
    setShowAdd(false);
    setNewDate("");
    setNewAnnual("");
    setNewDaily("");
    load();
  };

  const handleDelete = async (id: string, date: string) => {
    if (!confirm(`Delete snapshot for ${date}?`)) return;
    const { error } = await supabase.from("fund_yield_snapshots").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yield History — {fundName}</DialogTitle>
        </DialogHeader>

        {/* Add snapshot form */}
        {showAdd ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 mb-2">
            <p className="text-sm font-medium">Add Historical Snapshot</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Annual Rate (%)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 12.5" value={newAnnual} onChange={(e) => setNewAnnual(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Daily Yield (%)</Label>
                <Input type="number" step="0.0001" placeholder="auto" value={newDaily} onChange={(e) => setNewDaily(e.target.value)} className="mt-1" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave daily yield empty to auto-calculate from annual rate.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="mb-2">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Past Snapshot
          </Button>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No yield history yet. Add snapshots above or update the fund's rates to start tracking.
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
                  <th className="px-2 py-2"></th>
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
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(snap.id, snap.snapshot_date)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
