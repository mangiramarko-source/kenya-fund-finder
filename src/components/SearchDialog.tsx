import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BarChart3, Newspaper, Calculator, GraduationCap, TrendingUp } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";

interface SearchDialogProps {
  variant?: "default" | "topbar";
}

const SearchDialog = ({ variant = "default" }: SearchDialogProps) => {
  const [open, setOpen] = useState(false);
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const navigate = useNavigate();

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load data when opened
  useEffect(() => {
    if (!open) return;
    if (funds.length === 0) fetchFunds().then(setFunds).catch(() => {});
    if (news.length === 0) fetchPublishedNews().then(setNews).catch(() => {});
  }, [open]);

  const go = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <>
      {variant === "topbar" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 w-full px-4 py-1.5 h-8 rounded-lg bg-muted/60 border border-border text-muted-foreground text-sm hover:bg-muted/80 hover:border-accent/30 transition-all"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left text-xs">Search funds, stocks, news…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors w-full md:w-8 md:h-8 md:p-0 md:items-center md:justify-center md:rounded-lg"
        >
          <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="flex-1 text-left md:hidden">Search…</span>
        </button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search funds, news, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => go("/compare")}>
              <BarChart3 className="mr-2 h-4 w-4" /> Compare Funds
            </CommandItem>
            <CommandItem onSelect={() => go("/calculator")}>
              <Calculator className="mr-2 h-4 w-4" /> Investment Calculator
            </CommandItem>
            <CommandItem onSelect={() => go("/news")}>
              <Newspaper className="mr-2 h-4 w-4" /> News & Updates
            </CommandItem>
            <CommandItem onSelect={() => go("/learn")}>
              <GraduationCap className="mr-2 h-4 w-4" /> Learn
            </CommandItem>
          </CommandGroup>

          {funds.length > 0 && (
            <CommandGroup heading="Funds">
              {funds.map((f) => (
                <CommandItem key={f.id} onSelect={() => go(`/compare/${f.slug}`)}>
                  <TrendingUp className="mr-2 h-4 w-4 text-accent" />
                  <span className="flex-1">{f.name}</span>
                  <span className="text-xs text-accent font-semibold">{f.annual_yield}%</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {news.length > 0 && (
            <CommandGroup heading="News">
              {news.slice(0, 8).map((a) => (
                <CommandItem key={a.id} onSelect={() => go("/news")}>
                  <Newspaper className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{a.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default SearchDialog;
