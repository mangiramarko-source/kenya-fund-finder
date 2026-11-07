import { useState, useEffect } from "react";
import { Calculator, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  badge,
  icon: Icon = Calculator,
  className = "",
  children,
}: FloatingPageCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Floating Action Button (FAB)
          - On mobile: bottom-[calc(8.25rem+env(safe-area-inset-bottom))] right-4 stacks cleanly above MobileAiLabFab
          - On desktop: md:bottom-5 md:right-24 sits neatly beside DesktopAiLabChat without collision */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${title}`}
        className={`fixed bottom-[calc(8.25rem+env(safe-area-inset-bottom))] md:bottom-5 right-4 md:right-24 z-40 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs sm:text-sm font-bold border border-emerald-400/30 cursor-pointer ${className}`}
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

              {/* Header with Eyebrow Badge (guaranteed zero encroachment on close button) */}
              <div className="flex items-start justify-between border-b border-border/80 px-5 py-3 gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    {badge && (
                      <div className="mb-0.5">
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          {badge}
                        </span>
                      </div>
                    )}
                    <SheetTitle className="text-base font-bold text-foreground leading-tight truncate">
                      {title}
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {description}
                    </SheetDescription>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  type="button"
                  aria-label="Close calculator"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0 mt-0.5"
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
              <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    {badge && (
                      <div className="mb-1">
                        <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          {badge}
                        </span>
                      </div>
                    )}
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
