import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { FundFromDB } from "@/lib/api";

interface CompareContextType {
  selected: FundFromDB[];
  add: (fund: FundFromDB) => void;
  remove: (fundId: string) => void;
  clear: () => void;
  isSelected: (fundId: string) => boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

const MAX_COMPARE = 4;

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [selected, setSelected] = useState<FundFromDB[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((fund: FundFromDB) => {
    setSelected((prev) => {
      if (prev.length >= MAX_COMPARE || prev.some((f) => f.id === fund.id)) return prev;
      return [...prev, fund];
    });
  }, []);

  const remove = useCallback((fundId: string) => {
    setSelected((prev) => prev.filter((f) => f.id !== fundId));
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setIsOpen(false);
  }, []);

  const isSelected = useCallback((fundId: string) => selected.some((f) => f.id === fundId), [selected]);

  return (
    <CompareContext.Provider value={{ selected, add, remove, clear, isSelected, isOpen, setIsOpen }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
