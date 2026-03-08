import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type FundType } from "@/lib/api";

interface ParsedFund {
  name: string;
  currency: string;
  daily_yield: number;
  annual_yield: number;
  fund_type: FundType;
  yield_unit: string;
}

interface ImportResult {
  updated: string[];
  created: string[];
  errors: string[];
}

const CATEGORY_MAP: Record<string, FundType> = {
  "money market": "money_market",
  "call rates": "money_market",
  "fixed income": "fixed_income",
  "balanced": "balanced",
  "equity": "equity",
  "bond": "bond",
  "other": "money_market",
  "specialized": "money_market",
};

function detectCategory(heading: string): FundType {
  const lower = heading.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "money_market";
}

function parseNumber(val: string): number {
  return parseFloat(val.replace(/[%,]/g, "").trim()) || 0;
}

function detectYieldUnit(currency: string, dailyStr: string, annualStr: string): string {
  if (currency === "USD") return "USD";
  if (currency === "GBP") return "GBP";
  // If values have % sign, unit is %
  if (dailyStr.includes("%") || annualStr.includes("%")) return "%";
  // If values > 100, likely KES (NAV-based)
  const daily = parseNumber(dailyStr);
  const annual = parseNumber(annualStr);
  if (daily > 100 || annual > 100) return "KES";
  return "%";
}

function generateSlug(name: string, currency: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (currency !== "KES") return `${base}-${currency.toLowerCase()}`;
  return base;
}

export function parseMarkdownData(text: string): ParsedFund[] {
  const lines = text.split("\n");
  const results: ParsedFund[] = [];
  let currentCategory: FundType = "money_market";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect category headings (# or ##)
    if (/^#{1,3}\s+/.test(line)) {
      const heading = line.replace(/^#{1,3}\s+/, "");
      currentCategory = detectCategory(heading);
      continue;
    }

    // Skip separator lines and header rows
    if (!line.startsWith("|") || /^[\|\s\-:]+$/.test(line)) continue;

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    // Skip header rows
    const firstLower = cells[0].toLowerCase();
    if (firstLower === "fund name" || firstLower === "fund / product") continue;

    const [nameRaw, currency, dailyStr, annualStr] = cells;
    const name = nameRaw.replace(/\\_/g, "_").trim();
    const cur = currency.toUpperCase().trim();
    const yieldUnit = detectYieldUnit(cur, dailyStr, annualStr);

    results.push({
      name,
      currency: cur,
      daily_yield: parseNumber(dailyStr),
      annual_yield: parseNumber(annualStr),
      fund_type: currentCategory,
      yield_unit: yieldUnit,
    });
  }

  return results;
}

export function parseCSVData(text: string): ParsedFund[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const results: ParsedFund[] = [];
  let currentCategory: FundType = "money_market";

  for (const line of lines) {
    // Check for category markers (lines that don't look like CSV data)
    if (!line.includes(",") && line.trim().length > 0) {
      currentCategory = detectCategory(line);
      continue;
    }

    const cells = line.split(",").map((c) => c.trim());
    if (cells.length < 4) continue;

    const firstLower = cells[0].toLowerCase();
    if (firstLower === "fund name" || firstLower === "fund / product") continue;

    const [name, currency, dailyStr, annualStr] = cells;
    if (!name || !currency) continue;
    const cur = currency.toUpperCase().trim();
    const yieldUnit = detectYieldUnit(cur, dailyStr, annualStr);

    results.push({
      name: name.trim(),
      currency: cur,
      daily_yield: parseNumber(dailyStr),
      annual_yield: parseNumber(annualStr),
      fund_type: currentCategory,
      yield_unit: yieldUnit,
    });
  }

  return results;
}

interface BulkFundImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const BulkFundImport = ({ open, onOpenChange, onComplete }: BulkFundImportProps) => {
  const [pastedData, setPastedData] = useState("");
  const [parsedFunds, setParsedFunds] = useState<ParsedFund[]>([]);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [snapshotDate, setSnapshotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const reset = () => {
    setPastedData("");
    setParsedFunds([]);
    setResult(null);
    setStep("input");
    setCreatedIds([]);
    setSnapshotDate(new Date().toISOString().split("T")[0]);
  };

  const handleParse = () => {
    const text = pastedData.trim();
    if (!text) {
      toast({ title: "No data", description: "Paste or upload data first.", variant: "destructive" });
      return;
    }
    // Auto-detect format: if has | it's markdown, otherwise CSV
    const funds = text.includes("|") ? parseMarkdownData(text) : parseCSVData(text);
    if (funds.length === 0) {
      toast({ title: "No funds found", description: "Could not parse any fund data from input.", variant: "destructive" });
      return;
    }
    setParsedFunds(funds);
    setStep("preview");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPastedData(text);
      toast({ title: "File loaded", description: `${file.name} loaded. Click "Parse Data" to preview.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (parsedFunds.length === 0) return;
    setImporting(true);

    const importResult: ImportResult = { updated: [], created: [], errors: [] };

    try {
      // Fetch existing funds for matching by name + yield_unit (currency)
      const { data: existingFunds } = await supabase.from("funds").select("id, name, slug, yield_unit");
      const existingMap = new Map(
        (existingFunds || []).map((f) => [
          `${f.name.toLowerCase()}|${(f.yield_unit || "%").toLowerCase()}`,
          f,
        ])
      );

      for (const fund of parsedFunds) {
        const compositeKey = `${fund.name.toLowerCase()}|${fund.yield_unit.toLowerCase()}`;
        const existing = existingMap.get(compositeKey);

        const payload = {
          annual_yield: fund.annual_yield,
          daily_yield: fund.daily_yield,
          yield_unit: fund.yield_unit,
          fund_type: fund.fund_type,
          updated_by: user?.id,
        };

        if (existing) {
          const { error } = await supabase
            .from("funds")
            .update(payload)
            .eq("id", existing.id);
          if (error) {
            importResult.errors.push(`${fund.name}: ${error.message}`);
          } else {
            importResult.updated.push(fund.name);
              await supabase.from("fund_yield_snapshots").upsert({
                fund_id: existing.id,
                annual_yield: fund.annual_yield,
                daily_yield: fund.daily_yield,
                snapshot_date: snapshotDate,
              }, { onConflict: "fund_id,snapshot_date" });
          }
        } else {
          const slug = generateSlug(fund.name, fund.currency);
          const { data: newFund, error } = await supabase.from("funds").insert({
            ...payload,
            name: fund.name,
            slug,
            manager: fund.name,
            minimum_investment: 0,
            management_fee: 0,
            seven_day_yield: 0,
            thirty_day_yield: 0,
            withdrawal_time: "T+1",
            is_published: true,
            created_by: user?.id,
          }).select("id").single();
          if (error) {
            importResult.errors.push(`${fund.name}: ${error.message}`);
          } else {
            importResult.created.push(fund.name);
            if (newFund) {
              createdFundIds.push(newFund.id);
              await supabase.from("fund_yield_snapshots").upsert({
                fund_id: newFund.id,
                annual_yield: fund.annual_yield,
                daily_yield: fund.daily_yield,
                snapshot_date: snapshotDate,
              }, { onConflict: "fund_id,snapshot_date" });
            }
          }
        }
      }

      setResult(importResult);
      setStep("done");

      await supabase.from("change_log").insert({
        entity_type: "fund",
        entity_id: "bulk-import",
        action: "bulk_import",
        old_values: null,
        new_values: {
          total: parsedFunds.length,
          updated: importResult.updated.length,
          created: importResult.created.length,
          errors: importResult.errors.length,
        },
        changed_by: user?.id,
      });

      onComplete();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const categoryGroups = parsedFunds.reduce<Record<string, ParsedFund[]>>((acc, f) => {
    const key = f.fund_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const FUND_TYPE_LABELS: Record<string, string> = {
    money_market: "Money Market",
    fixed_income: "Fixed Income",
    balanced: "Balanced",
    equity: "Equity",
    bond: "Bond",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Fund Import</DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste Markdown tables, CSV data, or upload a .csv/.txt/.md file. The system will detect fund categories and update existing records or create new ones.
            </p>

            <div className="rounded-lg border border-border p-3 space-y-1">
              <Label className="text-sm font-medium">Effective Date</Label>
              <p className="text-xs text-muted-foreground">The date these yields are effective — used for yield history.</p>
              <Input
                type="date"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                className="mt-1 w-48"
              />
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.md,.markdown"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" /> Upload File
              </Button>
            </div>

            <Textarea
              placeholder={`Paste your fund data here...\n\nExample:\n## Money Market Funds\n| Fund Name | Currency | Daily Yield | Annual Rate |\n|-----------|----------|-------------|-------------|\n| Britam    | KES      | 9.34%       | 9.79%       |`}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />

            <Button onClick={handleParse} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!pastedData.trim()}>
              <FileText className="mr-2 h-4 w-4" /> Parse Data
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Found <span className="text-accent">{parsedFunds.length}</span> funds in <span className="text-accent">{Object.keys(categoryGroups).length}</span> categories
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep("input")}>← Back</Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
              {Object.entries(categoryGroups).map(([type, funds]) => (
                <div key={type}>
                  <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0">
                    {FUND_TYPE_LABELS[type] || type} ({funds.length})
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-1 font-medium">Name</th>
                        <th className="text-center px-3 py-1 font-medium">Currency</th>
                        <th className="text-right px-3 py-1 font-medium">Daily</th>
                        <th className="text-right px-3 py-1 font-medium">Annual</th>
                        <th className="text-center px-3 py-1 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds.map((f, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-3 py-1">{f.name}</td>
                          <td className="px-3 py-1 text-center text-muted-foreground">{f.currency}</td>
                          <td className="px-3 py-1 text-right">{f.daily_yield}</td>
                          <td className="px-3 py-1 text-right font-medium text-accent">{f.annual_yield}</td>
                          <td className="px-3 py-1 text-center text-muted-foreground">{f.yield_unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border p-3 space-y-1">
              <Label className="text-sm font-medium">Yield Date</Label>
              <p className="text-xs text-muted-foreground">The effective date for these yields — saved as a snapshot for yield history tracking.</p>
              <Input
                type="date"
                value={snapshotDate}
                onChange={(e) => setSnapshotDate(e.target.value)}
                className="mt-1 w-48"
              />
            </div>

            <Button
              onClick={handleImport}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <>Import {parsedFunds.length} Funds — {snapshotDate}</>
              )}
            </Button>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="space-y-2">
              {result.updated.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{result.updated.length} updated:</span>{" "}
                    <span className="text-muted-foreground">{result.updated.join(", ")}</span>
                  </div>
                </div>
              )}
              {result.created.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{result.created.length} created:</span>{" "}
                    <span className="text-muted-foreground">{result.created.join(", ")}</span>
                  </div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{result.errors.length} errors:</span>{" "}
                    <span className="text-muted-foreground">{result.errors.join("; ")}</span>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkFundImport;
