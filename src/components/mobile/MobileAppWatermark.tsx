import { openMobileLegalSheet } from "./MobileLegalSheet";

export default function MobileAppWatermark() {
  return (
    <footer
      className="md:hidden pt-6 pb-8 px-4 text-center select-none"
      aria-label="Mobile app legal notice"
    >
      <p className="text-[11px] font-semibold text-muted-foreground/80 tracking-tight">
        Kenya Fund Finder · CMA-Regulated Data
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] text-muted-foreground/60">
        <span>Operated by Elyon Innovation LTD</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={openMobileLegalSheet}
          className="text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer"
        >
          Legal & Disclaimers
        </button>
      </div>
    </footer>
  );
}
