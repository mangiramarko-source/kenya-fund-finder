import {
  BarChart3,
  Check,
  ChevronDown,
  Coins,
  Fuel,
  Landmark,
  Layers,
  PieChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MobileNavPickerOption } from "@/lib/mobileNavSections";

const ICON_MAP: Record<MobileNavPickerOption["iconName"], React.ElementType> = {
  Landmark,
  TrendingUp,
  ShieldCheck,
  PieChart,
  BarChart3,
  Layers,
  Sparkles,
  Users,
  Coins,
  Fuel,
};

export function SectionIconBadge({
  iconName,
  size = 22,
  active = false,
}: {
  iconName: MobileNavPickerOption["iconName"];
  size?: number;
  active?: boolean;
}) {
  const Icon = ICON_MAP[iconName] ?? Landmark;
  const iconSize = Math.max(12, Math.round(size * 0.56));

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
          : "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
      }`}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: iconSize, height: iconSize }} />
    </span>
  );
}

export function MobileNavPickerTrigger({
  iconName,
  label,
  ariaLabel,
  onClick,
  testId = "mobile-section-trigger",
}: {
  iconName: MobileNavPickerOption["iconName"];
  label: string;
  ariaLabel: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={ariaLabel}
      className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full border border-border/80 bg-muted/60 dark:bg-muted/70 pl-2.5 pr-3 text-sm font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs"
    >
      <SectionIconBadge iconName={iconName} size={22} />
      <span className="truncate">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

interface MobileSectionPickerSheetProps<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  headerIcon: MobileNavPickerOption["iconName"];
  ariaLabel: string;
  closeAriaLabel: string;
  options: MobileNavPickerOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
}

export default function MobileSectionPickerSheet<T extends string>({
  open,
  onOpenChange,
  title,
  subtitle,
  headerIcon,
  ariaLabel,
  closeAriaLabel,
  options,
  selectedId,
  onSelect,
}: MobileSectionPickerSheetProps<T>) {
  const HeaderIcon = ICON_MAP[headerIcon] ?? Landmark;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        aria-label={ariaLabel}
      >
        {/* Drag handle pill */}
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
        />

        {/* Sheet header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <HeaderIcon className="h-4 w-4 text-emerald-500" />
              {title}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-muted-foreground">
              {subtitle}
            </SheetDescription>
          </SheetHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            aria-label={closeAriaLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Option list */}
        <div className="overflow-y-auto px-4 pt-3 pb-2 space-y-2">
          {options.map((option) => {
            const active = selectedId === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option.id);
                  onOpenChange(false);
                }}
                aria-pressed={active}
                data-testid={`section-option-${option.id}`}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs"
                    : "border-border/70 bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <SectionIconBadge iconName={option.iconName} size={36} active={active} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-foreground">
                        {option.title}
                      </span>
                      {option.tag && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                            active
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {option.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {option.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {(option.countText || option.metaText) && (
                    <div className="text-right">
                      {option.countText && (
                        <span className="block text-xs font-bold tabular-nums text-foreground">
                          {option.countText}
                        </span>
                      )}
                      {option.metaText && (
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {option.metaText}
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border/70 bg-transparent text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.75]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
