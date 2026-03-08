import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, History, Upload, CalendarDays, X, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type FundType, FUND_TYPE_LABELS, YIELD_UNITS } from "@/lib/api";
import AdminYieldHistory from "./AdminYieldHistory";
import BulkFundImport from "@/components/admin/BulkFundImport";

interface FundRow {
  id: string;
  slug: string;
  name: string;
  manager: string;
  cma_licensed: boolean;
  annual_yield: number;
  daily_yield: number;
  fund_type: FundType;
  minimum_investment: number;
  management_fee: number;
  withdrawal_time: string;
  description: string;
  website: string;
  fact_sheet_date: string | null;
  source_url: string | null;
  yield_unit: string;
  is_published: boolean;
  updated_at: string;
}

const emptyFund = {
  slug: "", name: "", manager: "", cma_licensed: true,
  annual_yield: 0, daily_yield: 0, fund_type: "money_market" as FundType,
  minimum_investment: 0, management_fee: 0, withdrawal_time: "",
  description: "", website: "", fact_sheet_date: "", source_url: "", yield_unit: "%", is_published: true,
};

const AdminFunds = () => {
  const [funds, setFunds] = useState<FundRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortByViews, setSortByViews] = useState<"none" | "asc" | "desc">("none");
  const [editingFund, setEditingFund] = useState<typeof emptyFund & { id?: string }>(emptyFund);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fundViews, setFundViews] = useState<Record<string, number>>({});
  const [historyFund, setHistoryFund] = useState<{ id: string; name: string; yield_unit: string } | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string>("");
  const [snapshotYields, setSnapshotYields] = useState<Record<string, { annual_yield: number; daily_yield: number }>>({});
  const [editedYields, setEditedYields] = useState<Record<string, { annual_yield: string; daily_yield: string }>>({});
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [fundsRes, viewsRes] = await Promise.all([
      supabase.from("funds").select("*").order("name"),
      supabase.from("page_views").select("page_path").like("page_path", "/compare/%"),
    ]);
    if (fundsRes.data) setFunds(fundsRes.data as FundRow[]);

    // Count views per fund slug
    const counts: Record<string, number> = {};
    (viewsRes.data || []).forEach((v) => {
      const match = v.page_path.match(/^\/compare\/(.+)$/);
      if (match) counts[match[1]] = (counts[match[1]] || 0) + 1;
    });
    setFundViews(counts);
  };

  useEffect(() => { load(); }, []);

  // Load snapshot yields when date filter changes
  useEffect(() => {
    if (!snapshotDate) {
      setSnapshotYields({});
      setEditedYields({});
      return;
    }
    supabase
      .from("fund_yield_snapshots")
      .select("fund_id, annual_yield, daily_yield")
      .eq("snapshot_date", snapshotDate)
      .then(({ data }) => {
        const map: Record<string, { annual_yield: number; daily_yield: number }> = {};
        const edits: Record<string, { annual_yield: string; daily_yield: string }> = {};
        (data || []).forEach((s) => {
          map[s.fund_id] = { annual_yield: Number(s.annual_yield), daily_yield: Number(s.daily_yield) };
          edits[s.fund_id] = { annual_yield: String(Number(s.annual_yield)), daily_yield: String(Number(s.daily_yield)) };
        });
        setSnapshotYields(map);
        setEditedYields(edits);
      });
  }, [snapshotDate]);

  const updateEditedYield = (fundId: string, field: "annual_yield" | "daily_yield", value: string) => {
    setEditedYields((prev) => ({
      ...prev,
      [fundId]: { annual_yield: "", daily_yield: "", ...prev[fundId], [field]: value },
    }));
  };

  const hasEdits = () => {
    for (const [fundId, edited] of Object.entries(editedYields)) {
      const original = snapshotYields[fundId];
      if (!original) {
        if (edited.annual_yield || edited.daily_yield) return true;
        continue;
      }
      if (String(original.annual_yield) !== edited.annual_yield || String(original.daily_yield) !== edited.daily_yield) return true;
    }
    return false;
  };

  const handleSaveSnapshots = async () => {
    if (!snapshotDate) return;
    setSavingSnapshot(true);
    let saved = 0;
    let errors = 0;
    for (const [fundId, edited] of Object.entries(editedYields)) {
      const annual = parseFloat(edited.annual_yield);
      const daily = parseFloat(edited.daily_yield);
      if (isNaN(annual)) continue;
      const dailyVal = isNaN(daily) ? parseFloat((annual / 365).toFixed(4)) : daily;
      const { error } = await supabase.from("fund_yield_snapshots").upsert(
        { fund_id: fundId, snapshot_date: snapshotDate, annual_yield: annual, daily_yield: dailyVal },
        { onConflict: "fund_id,snapshot_date" }
      );
      if (error) errors++;
      else saved++;
    }
    setSavingSnapshot(false);
    toast({ title: "Snapshots saved", description: `${saved} updated${errors ? `, ${errors} errors` : ""}.` });
    // Reload snapshot data
    setSnapshotDate((d) => { const v = d; setSnapshotDate(""); setTimeout(() => setSnapshotDate(v), 50); return d; });
  };

  const filtered = funds
    .filter((f) =>
      (filterType === "all" || f.fund_type === filterType) &&
      (f.name.toLowerCase().includes(search.toLowerCase()) ||
       f.manager.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortByViews === "desc") return (fundViews[b.slug] || 0) - (fundViews[a.slug] || 0);
      if (sortByViews === "asc") return (fundViews[a.slug] || 0) - (fundViews[b.slug] || 0);
      return 0;
    });

  const isOutdated = (date: string) => {
    const d = new Date(date);
    const ago = new Date();
    ago.setDate(ago.getDate() - 30);
    return d < ago;
  };

  const validate = () => {
    if (!editingFund.name || !editingFund.slug || !editingFund.manager) return "Name, slug, and manager are required.";
    const isPercentUnit = editingFund.yield_unit === "%";
    if (isPercentUnit && (editingFund.annual_yield < 0 || editingFund.annual_yield > 100)) return "Annual rate must be 0-100% for percentage unit.";
    if (!isPercentUnit && editingFund.annual_yield < 0) return "Annual rate must be non-negative.";
    if (editingFund.daily_yield < 0) return "Daily yield must be non-negative.";
    if (editingFund.management_fee < 0 || editingFund.management_fee > 100) return "Fee must be 0-100%.";
    if (editingFund.website && !/^https?:\/\//.test(editingFund.website)) return "Website must be a valid URL.";
    return null;
  };

  const logChange = async (entityId: string, action: string, oldValues: any, newValues: any) => {
    await supabase.from("change_log").insert({
      entity_type: "fund",
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_by: user?.id,
    });
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast({ title: "Validation Error", description: err, variant: "destructive" }); return; }

    const payload = {
      slug: editingFund.slug,
      name: editingFund.name,
      manager: editingFund.manager,
      cma_licensed: editingFund.cma_licensed,
      fund_type: editingFund.fund_type,
      annual_yield: editingFund.annual_yield,
      daily_yield: editingFund.daily_yield,
      seven_day_yield: 0,
      thirty_day_yield: 0,
      minimum_investment: editingFund.minimum_investment,
      management_fee: editingFund.management_fee,
      withdrawal_time: editingFund.withdrawal_time,
      description: editingFund.description,
      website: editingFund.website,
      fact_sheet_date: editingFund.fact_sheet_date || null,
      source_url: editingFund.source_url || null,
      is_published: editingFund.is_published,
      yield_unit: editingFund.yield_unit,
      updated_by: user?.id,
    };

    if (editingFund.id) {
      const oldFund = funds.find((f) => f.id === editingFund.id);
      const { error } = await supabase.from("funds").update(payload).eq("id", editingFund.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await logChange(editingFund.id, "update", oldFund, payload);
    } else {
      const { data, error } = await supabase.from("funds").insert({ ...payload, created_by: user?.id }).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      if (data) await logChange(data.id, "create", null, payload);
    }

    toast({ title: "Saved", description: "Fund saved successfully." });
    setDialogOpen(false);
    setEditingFund(emptyFund);
    load();
  };

  const handleDelete = async (fund: FundRow) => {
    if (!confirm(`Delete "${fund.name}"?`)) return;
    const { error } = await supabase.from("funds").delete().eq("id", fund.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logChange(fund.id, "delete", fund, null);
    toast({ title: "Deleted" });
    load();
  };

  const openEdit = (fund: FundRow) => {
    setEditingFund({
      id: fund.id,
      slug: fund.slug,
      name: fund.name,
      manager: fund.manager,
      cma_licensed: fund.cma_licensed,
      annual_yield: Number(fund.annual_yield),
      daily_yield: Number(fund.daily_yield),
      fund_type: fund.fund_type || "money_market",
      minimum_investment: Number(fund.minimum_investment),
      management_fee: Number(fund.management_fee),
      withdrawal_time: fund.withdrawal_time,
      description: fund.description,
      website: fund.website,
      fact_sheet_date: fund.fact_sheet_date || "",
      source_url: fund.source_url || "",
      yield_unit: fund.yield_unit || "%",
      is_published: fund.is_published,
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Fund Management</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingFund(emptyFund); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" /> Add Fund
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFund.id ? "Edit Fund" : "Add New Fund"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug (URL ID)</Label>
                  <Input value={editingFund.slug} onChange={(e) => setEditingFund({ ...editingFund, slug: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Fund Name</Label>
                  <Input value={editingFund.name} onChange={(e) => setEditingFund({ ...editingFund, name: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fund Manager</Label>
                  <Input value={editingFund.manager} onChange={(e) => setEditingFund({ ...editingFund, manager: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Fund Type</Label>
                  <Select value={editingFund.fund_type} onValueChange={(v) => setEditingFund({ ...editingFund, fund_type: v as FundType })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FUND_TYPE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Annual Rate</Label>
                  <Input type="number" step="0.1" value={editingFund.annual_yield} onChange={(e) => setEditingFund({ ...editingFund, annual_yield: Number(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Daily Yield</Label>
                  <Input type="number" step="0.0001" value={editingFund.daily_yield} onChange={(e) => setEditingFund({ ...editingFund, daily_yield: Number(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Yield Unit</Label>
                  <Select value={editingFund.yield_unit} onValueChange={(v) => setEditingFund({ ...editingFund, yield_unit: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YIELD_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Investment (KES)</Label>
                  <Input type="number" value={editingFund.minimum_investment} onChange={(e) => setEditingFund({ ...editingFund, minimum_investment: Number(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Management Fee (%)</Label>
                  <Input type="number" step="0.1" value={editingFund.management_fee} onChange={(e) => setEditingFund({ ...editingFund, management_fee: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Withdrawal Time</Label>
                <Input value={editingFund.withdrawal_time} onChange={(e) => setEditingFund({ ...editingFund, withdrawal_time: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editingFund.description} onChange={(e) => setEditingFund({ ...editingFund, description: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Website URL</Label>
                  <Input value={editingFund.website} onChange={(e) => setEditingFund({ ...editingFund, website: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Source URL</Label>
                  <Input value={editingFund.source_url} onChange={(e) => setEditingFund({ ...editingFund, source_url: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Fact Sheet Date</Label>
                <Input type="date" value={editingFund.fact_sheet_date} onChange={(e) => setEditingFund({ ...editingFund, fact_sheet_date: e.target.value })} className="mt-1" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingFund.cma_licensed} onCheckedChange={(v) => setEditingFund({ ...editingFund, cma_licensed: v })} />
                  <Label>CMA Licensed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingFund.is_published} onCheckedChange={(v) => setEditingFund({ ...editingFund, is_published: v })} />
                  <Label>Published</Label>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save Fund
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      <BulkFundImport open={bulkImportOpen} onOpenChange={setBulkImportOpen} onComplete={load} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search funds..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Fund Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(FUND_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              className="pl-9 w-[180px]"
              placeholder="Filter by date"
            />
          </div>
          {snapshotDate && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSnapshotDate("")} title="Clear date filter">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {snapshotDate && (
        <div className="mb-3 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent shrink-0" />
          <span>
            Showing yields for <strong>{new Date(snapshotDate + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</strong>.
            {Object.keys(snapshotYields).length === 0
              ? " No snapshots found for this date."
              : ` ${Object.keys(snapshotYields).length} fund snapshots found.`}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-3 py-2 font-semibold">Fund Name</th>
                <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Type</th>
                <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Manager</th>
                <th className={`text-right px-3 py-2 font-semibold ${snapshotDate ? "min-w-[120px]" : ""}`}>{snapshotDate ? "Annual" : "Rate"}</th>
                {snapshotDate && <th className="text-right px-3 py-2 font-semibold min-w-[100px]">Daily</th>}
                <th className="text-right px-3 py-2 font-semibold hidden md:table-cell">Fee</th>
                <th
                  className="text-right px-3 py-2 font-semibold hidden md:table-cell cursor-pointer select-none hover:bg-muted/80 transition-colors"
                  onClick={() => setSortByViews(s => s === "none" ? "desc" : s === "desc" ? "asc" : "none")}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Views
                    {sortByViews === "none" && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                    {sortByViews === "desc" && <ArrowDown className="h-3 w-3 text-accent" />}
                    {sortByViews === "asc" && <ArrowUp className="h-3 w-3 text-accent" />}
                  </span>
                </th>
                <th className="text-center px-3 py-2 font-semibold hidden md:table-cell">Status</th>
                <th className="text-center px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund, i) => (
                <tr key={fund.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      {isOutdated(fund.updated_at) && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                      {fund.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{FUND_TYPE_LABELS[fund.fund_type] || "Money Market"}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{fund.manager}</td>
                  {snapshotDate ? (
                    <>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 text-xs text-right w-[100px] ml-auto"
                          value={editedYields[fund.id]?.annual_yield ?? ""}
                          onChange={(e) => updateEditedYield(fund.id, "annual_yield", e.target.value)}
                          placeholder="Annual"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-7 text-xs text-right w-[90px] ml-auto"
                          value={editedYields[fund.id]?.daily_yield ?? ""}
                          onChange={(e) => updateEditedYield(fund.id, "daily_yield", e.target.value)}
                          placeholder="Daily"
                        />
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2 text-right font-semibold text-accent">
                      {Number(fund.annual_yield)}{fund.yield_unit === "%" ? "%" : ` ${fund.yield_unit}`}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right hidden md:table-cell">{Number(fund.management_fee)}%</td>
                  <td className="px-3 py-2 text-right hidden md:table-cell text-muted-foreground">{fundViews[fund.slug] || 0}</td>
                  <td className="px-3 py-2 text-center hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${fund.is_published ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {fund.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {new Date(fund.updated_at).toLocaleDateString("en-KE")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryFund({ id: fund.id, name: fund.name, yield_unit: fund.yield_unit })} title="Yield History">
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(fund)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(fund)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No funds found. Try adjusting your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {historyFund && (
        <AdminYieldHistory
          fundId={historyFund.id}
          fundName={historyFund.name}
          yieldUnit={historyFund.yield_unit}
          open={!!historyFund}
          onOpenChange={(open) => { if (!open) setHistoryFund(null); }}
        />
      )}
    </div>
  );
};

export default AdminFunds;
