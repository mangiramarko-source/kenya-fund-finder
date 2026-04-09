import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Save, Trash2, DollarSign, Gem, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminSocialLinks from "./AdminSocialLinks";

interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  is_active: boolean;
  sort_order: number;
}

interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
  is_active: boolean;
  sort_order: number;
}

const AdminMarkets = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New item forms
  const [newRate, setNewRate] = useState({ currency_code: "", currency_name: "", rate: "" });
  const [newCommodity, setNewCommodity] = useState({ name: "", symbol: "", price: "", unit: "USD" });

  const fetchData = async () => {
    setLoading(true);
    const [ratesRes, comRes] = await Promise.all([
      supabase.from("exchange_rates").select("*").order("sort_order"),
      supabase.from("commodities").select("*").order("sort_order"),
    ]);
    setRates((ratesRes.data as ExchangeRate[]) || []);
    setCommodities((comRes.data as Commodity[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateRate = (id: string, field: string, value: string | number | boolean) => {
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateCommodity = (id: string, field: string, value: string | number | boolean) => {
    setCommodities((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const saveAllRates = async () => {
    setSaving(true);
    try {
      for (const r of rates) {
        const { error } = await supabase.from("exchange_rates").update({
          currency_code: r.currency_code,
          currency_name: r.currency_name,
          rate: r.rate,
          previous_rate: r.previous_rate,
          is_active: r.is_active,
          sort_order: r.sort_order,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }).eq("id", r.id);
        if (error) throw error;
      }
      toast.success("Exchange rates saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const saveAllCommodities = async () => {
    setSaving(true);
    try {
      for (const c of commodities) {
        const { error } = await supabase.from("commodities").update({
          name: c.name,
          symbol: c.symbol,
          price: c.price,
          previous_price: c.previous_price,
          unit: c.unit,
          is_active: c.is_active,
          sort_order: c.sort_order,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);
        if (error) throw error;
      }
      toast.success("Commodities saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const addRate = async () => {
    if (!newRate.currency_code || !newRate.rate) return toast.error("Fill code & rate");
    const { error } = await supabase.from("exchange_rates").insert({
      currency_code: newRate.currency_code.toUpperCase(),
      currency_name: newRate.currency_name,
      rate: parseFloat(newRate.rate),
      sort_order: rates.length + 1,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewRate({ currency_code: "", currency_name: "", rate: "" });
    toast.success("Currency added");
    fetchData();
  };

  const addCommodity = async () => {
    if (!newCommodity.name || !newCommodity.price) return toast.error("Fill name & price");
    const { error } = await supabase.from("commodities").insert({
      name: newCommodity.name,
      symbol: newCommodity.symbol.toUpperCase(),
      price: parseFloat(newCommodity.price),
      unit: newCommodity.unit,
      sort_order: commodities.length + 1,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewCommodity({ name: "", symbol: "", price: "", unit: "USD" });
    toast.success("Commodity added");
    fetchData();
  };

  const deleteRate = async (id: string) => {
    const { error } = await supabase.from("exchange_rates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchData();
  };

  const deleteCommodity = async (id: string) => {
    const { error } = await supabase.from("commodities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchData();
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>;

  const callFetchFunction = async (fetchType?: string) => {
    setSaving(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const body: Record<string, unknown> = {};
      if (fetchType) body.fetch_type = fetchType;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-market-data`,
        { method: "POST", headers, body: JSON.stringify(body) }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(`Fetch complete! ${(result.results || []).join(', ')}`);
        fetchData();
      } else {
        toast.error(result.error || "Fetch failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const triggerAutoFetch = () => callFetchFunction();
  const triggerStocksFetch = () => callFetchFunction("stocks");

  return (
    <div className="space-y-8">
      {/* Auto-fetch triggers */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
        <RefreshCw className="h-5 w-5 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Automated Data Updates</p>
          <p className="text-xs text-muted-foreground">FX rates, crypto, commodities &amp; NSE stocks update hourly. Stocks use Yahoo Finance with NSE fallback.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={triggerStocksFetch} disabled={saving}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Fetch Stocks
          </Button>
          <Button size="sm" onClick={triggerAutoFetch} disabled={saving}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Fetch All
          </Button>
        </div>
      </div>

      {/* Exchange Rates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-accent" /> Exchange Rates (vs KES)</h2>
          <Button size="sm" onClick={saveAllRates} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" /> Save All</Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/70 text-xs">
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-right px-3 py-2">Rate</th>
                <th className="text-right px-3 py-2">Prev Rate</th>
                <th className="text-center px-3 py-2">Order</th>
                <th className="text-center px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Input value={r.currency_code} onChange={(e) => updateRate(r.id, "currency_code", e.target.value)} className="h-7 w-16 text-xs" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={r.currency_name} onChange={(e) => updateRate(r.id, "currency_name", e.target.value)} className="h-7 text-xs" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input type="number" step="0.01" value={r.rate} onChange={(e) => updateRate(r.id, "rate", parseFloat(e.target.value) || 0)} className="h-7 w-24 text-xs text-right ml-auto" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input type="number" step="0.01" value={r.previous_rate ?? ""} onChange={(e) => updateRate(r.id, "previous_rate", parseFloat(e.target.value) || 0)} className="h-7 w-24 text-xs text-right ml-auto" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input type="number" value={r.sort_order} onChange={(e) => updateRate(r.id, "sort_order", parseInt(e.target.value) || 0)} className="h-7 w-14 text-xs text-center mx-auto" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={r.is_active} onChange={(e) => updateRate(r.id, "is_active", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {r.currency_code}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove this currency rate.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRate(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add new rate */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Input placeholder="Code (USD)" value={newRate.currency_code} onChange={(e) => setNewRate((p) => ({ ...p, currency_code: e.target.value }))} className="h-8 w-20 text-xs" />
          <Input placeholder="Name" value={newRate.currency_name} onChange={(e) => setNewRate((p) => ({ ...p, currency_name: e.target.value }))} className="h-8 w-36 text-xs" />
          <Input type="number" placeholder="Rate" value={newRate.rate} onChange={(e) => setNewRate((p) => ({ ...p, rate: e.target.value }))} className="h-8 w-24 text-xs" />
          <Button size="sm" variant="outline" onClick={addRate} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
      </section>

      {/* Commodities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Gem className="h-5 w-5 text-accent" /> Commodities & Crypto</h2>
          <Button size="sm" onClick={saveAllCommodities} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" /> Save All</Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/70 text-xs">
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Symbol</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-right px-3 py-2">Prev Price</th>
                <th className="text-left px-3 py-2">Unit</th>
                <th className="text-center px-3 py-2">Order</th>
                <th className="text-center px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {commodities.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Input value={c.name} onChange={(e) => updateCommodity(c.id, "name", e.target.value)} className="h-7 text-xs" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={c.symbol} onChange={(e) => updateCommodity(c.id, "symbol", e.target.value)} className="h-7 w-16 text-xs" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input type="number" step="0.01" value={c.price} onChange={(e) => updateCommodity(c.id, "price", parseFloat(e.target.value) || 0)} className="h-7 w-28 text-xs text-right ml-auto" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input type="number" step="0.01" value={c.previous_price ?? ""} onChange={(e) => updateCommodity(c.id, "previous_price", parseFloat(e.target.value) || 0)} className="h-7 w-28 text-xs text-right ml-auto" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={c.unit} onChange={(e) => updateCommodity(c.id, "unit", e.target.value)} className="h-7 w-24 text-xs" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input type="number" value={c.sort_order} onChange={(e) => updateCommodity(c.id, "sort_order", parseInt(e.target.value) || 0)} className="h-7 w-14 text-xs text-center mx-auto" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={c.is_active} onChange={(e) => updateCommodity(c.id, "is_active", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove this commodity.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCommodity(c.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add new commodity */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Input placeholder="Name (Gold)" value={newCommodity.name} onChange={(e) => setNewCommodity((p) => ({ ...p, name: e.target.value }))} className="h-8 w-28 text-xs" />
          <Input placeholder="Symbol" value={newCommodity.symbol} onChange={(e) => setNewCommodity((p) => ({ ...p, symbol: e.target.value }))} className="h-8 w-16 text-xs" />
          <Input type="number" placeholder="Price" value={newCommodity.price} onChange={(e) => setNewCommodity((p) => ({ ...p, price: e.target.value }))} className="h-8 w-28 text-xs" />
          <Input placeholder="Unit" value={newCommodity.unit} onChange={(e) => setNewCommodity((p) => ({ ...p, unit: e.target.value }))} className="h-8 w-24 text-xs" />
        <Button size="sm" variant="outline" onClick={addCommodity} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
      </section>

      {/* Social Links */}
      <AdminSocialLinks />
    </div>
  );
};

export default AdminMarkets;
