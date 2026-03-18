import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Save, Trash2, TrendingUp } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  is_active: boolean;
  sort_order: number;
}

const AdminStocks = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: "", name: "", sector: "Other", price: "", volume: "" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("stocks").select("*").order("sort_order");
    setStocks((data as Stock[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const update = (id: string, field: string, value: string | number | boolean) => {
    setStocks((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      // Auto-calculate change when price updates
      if (field === "price" && s.previous_price != null) {
        const newPrice = typeof value === "number" ? value : parseFloat(value as string) || 0;
        updated.day_change = parseFloat((newPrice - s.previous_price).toFixed(4));
        updated.day_change_percent = s.previous_price > 0 ? parseFloat(((newPrice - s.previous_price) / s.previous_price * 100).toFixed(4)) : 0;
      }
      return updated;
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const s of stocks) {
        const { error } = await supabase.from("stocks").update({
          symbol: s.symbol,
          name: s.name,
          sector: s.sector,
          price: s.price,
          previous_price: s.previous_price,
          day_change: s.day_change,
          day_change_percent: s.day_change_percent,
          volume: s.volume,
          market_cap: s.market_cap,
          year_high: s.year_high,
          year_low: s.year_low,
          pe_ratio: s.pe_ratio,
          dividend_yield: s.dividend_yield,
          is_active: s.is_active,
          sort_order: s.sort_order,
          updated_by: user?.id,
        }).eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Stocks saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const addStock = async () => {
    if (!newStock.symbol || !newStock.name) return toast.error("Fill symbol & name");
    const { error } = await supabase.from("stocks").insert({
      symbol: newStock.symbol.toUpperCase(),
      name: newStock.name,
      sector: newStock.sector,
      price: parseFloat(newStock.price) || 0,
      volume: parseInt(newStock.volume) || 0,
      sort_order: stocks.length + 1,
      created_by: user?.id,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewStock({ symbol: "", name: "", sector: "Other", price: "", volume: "" });
    toast.success("Stock added");
    fetchData();
  };

  const deleteStock = async (id: string) => {
    const { error } = await supabase.from("stocks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchData();
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" /> NSE Stocks
        </h2>
        <Button size="sm" onClick={saveAll} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save All
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/70 text-xs">
              <th className="text-left px-2 py-2">Symbol</th>
              <th className="text-left px-2 py-2">Name</th>
              <th className="text-left px-2 py-2">Sector</th>
              <th className="text-right px-2 py-2">Price</th>
              <th className="text-right px-2 py-2">Prev</th>
              <th className="text-right px-2 py-2">Change</th>
              <th className="text-right px-2 py-2">Chg %</th>
              <th className="text-right px-2 py-2">Volume</th>
              <th className="text-right px-2 py-2">Mkt Cap</th>
              <th className="text-right px-2 py-2">P/E</th>
              <th className="text-right px-2 py-2">Div %</th>
              <th className="text-right px-2 py-2">52H</th>
              <th className="text-right px-2 py-2">52L</th>
              <th className="text-center px-2 py-2">Ord</th>
              <th className="text-center px-2 py-2">Active</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-2 py-1.5"><Input value={s.symbol} onChange={(e) => update(s.id, "symbol", e.target.value)} className="h-7 w-16 text-xs" /></td>
                <td className="px-2 py-1.5"><Input value={s.name} onChange={(e) => update(s.id, "name", e.target.value)} className="h-7 w-32 text-xs" /></td>
                <td className="px-2 py-1.5"><Input value={s.sector} onChange={(e) => update(s.id, "sector", e.target.value)} className="h-7 w-24 text-xs" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.price} onChange={(e) => update(s.id, "price", parseFloat(e.target.value) || 0)} className="h-7 w-20 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.previous_price ?? ""} onChange={(e) => update(s.id, "previous_price", parseFloat(e.target.value) || 0)} className="h-7 w-20 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.day_change} onChange={(e) => update(s.id, "day_change", parseFloat(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.day_change_percent} onChange={(e) => update(s.id, "day_change_percent", parseFloat(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" value={s.volume} onChange={(e) => update(s.id, "volume", parseInt(e.target.value) || 0)} className="h-7 w-20 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" value={s.market_cap ?? ""} onChange={(e) => update(s.id, "market_cap", parseFloat(e.target.value) || 0)} className="h-7 w-24 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.1" value={s.pe_ratio ?? ""} onChange={(e) => update(s.id, "pe_ratio", parseFloat(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.1" value={s.dividend_yield ?? ""} onChange={(e) => update(s.id, "dividend_yield", parseFloat(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.year_high ?? ""} onChange={(e) => update(s.id, "year_high", parseFloat(e.target.value) || 0)} className="h-7 w-20 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" step="0.01" value={s.year_low ?? ""} onChange={(e) => update(s.id, "year_low", parseFloat(e.target.value) || 0)} className="h-7 w-20 text-xs text-right" /></td>
                <td className="px-2 py-1.5"><Input type="number" value={s.sort_order} onChange={(e) => update(s.id, "sort_order", parseInt(e.target.value) || 0)} className="h-7 w-12 text-xs text-center" /></td>
                <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={s.is_active} onChange={(e) => update(s.id, "is_active", e.target.checked)} /></td>
                <td className="px-2 py-1.5">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {s.symbol}?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this stock.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteStock(s.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Symbol (SCOM)" value={newStock.symbol} onChange={(e) => setNewStock((p) => ({ ...p, symbol: e.target.value }))} className="h-8 w-20 text-xs" />
        <Input placeholder="Company Name" value={newStock.name} onChange={(e) => setNewStock((p) => ({ ...p, name: e.target.value }))} className="h-8 w-40 text-xs" />
        <Input placeholder="Sector" value={newStock.sector} onChange={(e) => setNewStock((p) => ({ ...p, sector: e.target.value }))} className="h-8 w-24 text-xs" />
        <Input type="number" placeholder="Price" value={newStock.price} onChange={(e) => setNewStock((p) => ({ ...p, price: e.target.value }))} className="h-8 w-24 text-xs" />
        <Input type="number" placeholder="Volume" value={newStock.volume} onChange={(e) => setNewStock((p) => ({ ...p, volume: e.target.value }))} className="h-8 w-24 text-xs" />
        <Button size="sm" variant="outline" onClick={addStock} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
      </div>
    </div>
  );
};

export default AdminStocks;
