import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ShieldAlert,
  AlertCircle,
  ShieldCheck,
  Percent,
  FileCheck2,
  Building2,
  ChevronRight,
  X,
  FileText,
  Lock,
  ExternalLink,
} from "lucide-react";

export const KFF_OPEN_LEGAL_SHEET_EVENT = "kff_open_legal_sheet";

export function openMobileLegalSheet() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(KFF_OPEN_LEGAL_SHEET_EVENT));
  }
}

interface MobileLegalSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function MobileLegalSheet({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: MobileLegalSheetProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    setControlledOpen?.(nextOpen);
  };

  useEffect(() => {
    const handleOpenEvent = () => {
      handleOpenChange(true);
    };

    window.addEventListener(KFF_OPEN_LEGAL_SHEET_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener(KFF_OPEN_LEGAL_SHEET_EVENT, handleOpenEvent);
    };
  }, []);

  const close = () => handleOpenChange(false);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-label="Legal and regulatory disclaimers"
      >
        {/* Drag pill indicator */}
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-base font-bold text-foreground">
                Legal & Disclaimers
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground font-medium">
                Regulatory compliance & risk disclosures
              </p>
            </SheetHeader>
          </div>
          <button
            onClick={close}
            type="button"
            aria-label="Close legal disclaimers"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {/* Card 1: Not Investment Advice */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                General Information Only
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kenya Fund Finder provides market intelligence, data tracking, and comparison tools for educational and informational purposes only. We are not a fund manager, broker-dealer, investment advisor, or bank. We do not hold client money or execute trades. Nothing on this platform constitutes personalized financial, tax, or investment advice.
            </p>
          </div>

          {/* Card 2: CMA Regulation */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                CMA-Regulated Unit Trusts
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All Collective Investment Schemes (Unit Trusts) profiled on this platform are registered and regulated by the Capital Markets Authority (CMA) of Kenya under the Capital Markets Act (Cap 485A). Listing or comparison does not imply an endorsement or recommendation by the CMA or Kenya Fund Finder.
            </p>
          </div>

          {/* Card 3: Returns & Withholding Tax */}
          <div className="rounded-2xl border border-border bg-card/60 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Percent className="h-4 w-4 text-blue-500 shrink-0" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Gross Yields & 15% Withholding Tax
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Annualized yields (e.g. Money Market Funds) represent gross annual effective yields before deduction of 15% statutory Withholding Tax (WHT) applicable to Kenyan individual residents. Past performance is not indicative of future returns. Unit prices and daily yields fluctuate with prevailing macroeconomic and interest rate conditions.
            </p>
          </div>

          {/* Card 4: Independent Due Diligence */}
          <div className="rounded-2xl border border-border bg-card/60 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <FileCheck2 className="h-4 w-4 text-purple-500 shrink-0" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Verification & Due Diligence
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please review the fund's official Information Memorandum / Fact Sheet and verify all details with the licensed fund manager or an independent qualified financial advisor before committing capital.
            </p>
          </div>

          {/* Statutory Links */}
          <div className="pt-2">
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Statutory Documentation
            </p>
            <div className="space-y-1.5 rounded-2xl border border-border bg-card/60 p-2">
              <Link
                to="/terms"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-xs font-semibold text-foreground">Terms of Use</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
              <Link
                to="/privacy"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="flex-1 text-xs font-semibold text-foreground">Privacy Policy</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
              <Link
                to="/page/financial-disclaimer"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="flex-1 text-xs font-semibold text-foreground">Full Financial Disclaimer Page</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Operator Information */}
          <div className="pt-2 pb-4 text-center space-y-1 border-t border-border/60">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <p className="text-[11px] font-semibold text-foreground">Operated by Elyon Innovation LTD</p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 leading-tight">
              A product of Elyon.ltd · Not affiliated with the CMA or the NSE.
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              © {new Date().getFullYear()} Kenya Fund Finder. All rights reserved.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
