import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";

export type CompareAssetCategory = "fund" | "stock" | "currency" | "commodity";

export interface CompareItem {
  id: string;
  category: CompareAssetCategory;
  title: string;
  subtitle: string;
  avatarUrl?: string;
  badge?: string;
  data: any;
}

interface UniversalCompareContextType {
  selected: CompareItem[];
  category: CompareAssetCategory | null;
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const UniversalCompareContext = createContext<UniversalCompareContextType | null>(null);

const MAX_COMPARE = 4;

const CATEGORY_NAMES: Record<CompareAssetCategory, string> = {
  fund: "Funds",
  stock: "Stocks",
  currency: "FX Rates",
  commodity: "Commodities",
};

export const UniversalCompareProvider = ({ children }: { children: ReactNode }) => {
  const [selected, setSelected] = useState<CompareItem[]>([]);
  const [category, setCategory] = useState<CompareAssetCategory | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((item: CompareItem) => {
    setSelected((prev) => {
      // If switching category, clear previous category with a polite toast
      if (prev.length > 0 && prev[0].category !== item.category) {
        toast.info(`Switched to ${CATEGORY_NAMES[item.category]} comparison`, {
          description: `Previous ${CATEGORY_NAMES[prev[0].category].toLowerCase()} selection was replaced.`,
          duration: 2800,
        });
        setCategory(item.category);
        return [item];
      }

      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }

      if (prev.length >= MAX_COMPARE) {
        toast.warning(`Maximum of ${MAX_COMPARE} items can be compared at once.`);
        return prev;
      }

      setCategory(item.category);
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelected((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) {
        setCategory(null);
        setIsOpen(false);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setCategory(null);
    setIsOpen(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selected.some((i) => i.id === id),
    [selected]
  );

  return (
    <UniversalCompareContext.Provider
      value={{
        selected,
        category,
        add,
        remove,
        clear,
        isSelected,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </UniversalCompareContext.Provider>
  );
};

const DEFAULT_COMPARE_CONTEXT: UniversalCompareContextType = {
  selected: [],
  category: null,
  add: () => {},
  remove: () => {},
  clear: () => {},
  isSelected: () => false,
  isOpen: false,
  setIsOpen: () => {},
};

export const useUniversalCompare = () => {
  const ctx = useContext(UniversalCompareContext);
  return ctx || DEFAULT_COMPARE_CONTEXT;
};
