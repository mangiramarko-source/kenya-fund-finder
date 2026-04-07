import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Trash2, Inbox, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Suggestion {
  id: string;
  user_id: string;
  display_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("suggestions" as any).select("*").order("created_at", { ascending: false });
    if (filter === "unread") query = query.eq("is_read", false);
    if (filter === "read") query = query.eq("is_read", true);
    const { data } = await query;
    setSuggestions((data as any as Suggestion[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markRead = async (id: string, read: boolean) => {
    await supabase.from("suggestions" as any).update({ is_read: read } as any).eq("id", id);
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, is_read: read } : s)));
  };

  const deleteSuggestion = async (id: string) => {
    await supabase.from("suggestions" as any).delete().eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Suggestion deleted");
  };

  const unreadCount = suggestions.filter((s) => !s.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Suggestion Inbox</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={load} className="h-8 w-8">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && suggestions.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">No suggestions yet</p>
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className={`rounded-lg border p-4 transition-colors ${s.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{s.display_name}</span>
                {!s.is_read && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="mb-3 text-sm text-foreground/90 whitespace-pre-wrap">{s.message}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => markRead(s.id, !s.is_read)}
              >
                <Check className="h-3 w-3" />
                {s.is_read ? "Mark unread" : "Mark read"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={() => deleteSuggestion(s.id)}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSuggestions;
