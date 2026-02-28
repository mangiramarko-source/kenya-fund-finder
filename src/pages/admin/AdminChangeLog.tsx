import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: any;
  new_values: any;
  changed_by: string | null;
  changed_at: string;
}

const actionColors: Record<string, string> = {
  create: "bg-accent/10 text-accent",
  update: "bg-info/10 text-info",
  delete: "bg-destructive/10 text-destructive",
};

const AdminChangeLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    supabase
      .from("change_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setLogs(data as LogEntry[]); });
  }, []);

  const getChangedFields = (old: any, newV: any) => {
    if (!old || !newV) return [];
    return Object.keys(newV).filter((k) => JSON.stringify(old[k]) !== JSON.stringify(newV[k]));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Change Log</h2>
      <div className="space-y-2">
        {logs.map((log) => {
          const changedFields = getChangedFields(log.old_values, log.new_values);
          return (
            <div key={log.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className={actionColors[log.action] || ""}>
                  {log.action}
                </Badge>
                <Badge variant="outline">{log.entity_type}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(log.changed_at).toLocaleString("en-KE")}
                </span>
              </div>
              {log.action === "update" && changedFields.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  {changedFields.map((field) => (
                    <div key={field} className="flex gap-2">
                      <span className="font-medium text-foreground">{field}:</span>
                      <span className="text-destructive line-through">{JSON.stringify(log.old_values?.[field])}</span>
                      <span className="text-accent">{JSON.stringify(log.new_values?.[field])}</span>
                    </div>
                  ))}
                </div>
              )}
              {log.action === "create" && log.new_values?.name && (
                <p className="text-xs text-muted-foreground mt-1">Created: {log.new_values.name || log.new_values.title}</p>
              )}
              {log.action === "delete" && log.old_values?.name && (
                <p className="text-xs text-muted-foreground mt-1">Deleted: {log.old_values.name || log.old_values.title}</p>
              )}
            </div>
          );
        })}
        {logs.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No changes logged yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminChangeLog;
