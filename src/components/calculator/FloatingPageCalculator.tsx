import { useState, useEffect } from "react";
import { Calculator, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";
import { useCompare } from "@/hooks/useCompare";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface FloatingPageCalculatorProps {
  buttonLabel: string;
  title: string;
  description: string;
  badge?: string;
  icon?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

export const FloatingPageCalculator = ({
  buttonLabel,
  title,
  description,
  icon: Icon = Calculator,
  className = "",
  children,
}: FloatingPageCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const universalCompare = useUniversalCompare();
  const legacyCompare = useCompare();

  const isComparing = (universalCompare?.selected?.length ?? 0) > 0 || (legacyCompare?.selected?.length ?? 0) > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Floating Action Button (FAB)
          - Hidden on mobile when comparing items so it never overlaps the Compare bar
          - Exactly matching Banking (/savings) in size, padding, typography, shadow, and positioning on mobile & desktop */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${title}`}
        className={`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-8 right-4 md:right-8 z-40 items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs md:text-sm font-bold border border-emerald-400/30 cursor-pointer ${
          isComparing ? "hidden md:flex" : "flex"
        } ${className}`}
      >
        <Icon className="h-4 w-4 stroke-[2.5]" />
        <span>{buttonLabel}</span>
      </button>

      {/* Render popups only on client and only when triggered */}
      {mounted && (
        isMobile ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent
              side="bottom"
              className="inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden z-50"
              aria-label={title}
            >
              {/* Grab handle indicator */}
              <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />

              {/* Clean, simple text header without badge pills or icon boxes */}
              <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5 gap-3">
                <div className="text-left min-w-0 flex-1">
                  <SheetTitle className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                    {title}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {description}
                  </SheetDescription>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  type="button"
                  aria-label="Close calculator"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Calculator Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {children}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col bg-background border-border/80">
              <DialogHeader className="p-5 pb-3.5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left min-w-0 flex-1">
                    <DialogTitle className="text-lg font-black text-foreground">
                      {title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </DialogContent>
          </Dialog>
        )
      )}
    </>
  );
};

export default FloatingPageCalculator;
