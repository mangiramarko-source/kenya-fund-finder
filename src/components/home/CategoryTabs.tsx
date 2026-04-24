import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useCallback } from "react";

interface Tab {
  key: string;
  label: string;
}

interface CategoryTabsProps {
  tabs: Tab[];
  selectedCategory: string;
  categoryCount: Record<string, number>;
  onSelect: (key: string) => void;
  loading: boolean;
}

const CategoryTabs = ({ tabs, selectedCategory, categoryCount, onSelect, loading }: CategoryTabsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((key: string, el: HTMLButtonElement | null) => {
    onSelect(key);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [onSelect]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 pb-3 mb-3 -mx-1 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-1 px-1"
      style={{ scrollBehavior: "smooth" }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={(e) => handleSelect(key, e.currentTarget)}
          className={cn(
            "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
            selectedCategory === key
              ? "bg-accent text-accent-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
          <span className={cn(
            "ml-1.5 tabular-nums",
            selectedCategory === key ? "text-accent-foreground/70" : "text-muted-foreground/60"
          )}>
            {categoryCount[key] || 0}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
