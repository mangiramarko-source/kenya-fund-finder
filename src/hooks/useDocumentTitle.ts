import { useEffect } from "react";

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      const prevDesc = meta?.getAttribute("content") || "";
      if (meta) meta.setAttribute("content", description);
      return () => {
        document.title = prev;
        if (meta) meta.setAttribute("content", prevDesc);
      };
    }

    return () => { document.title = prev; };
  }, [title, description]);
}
