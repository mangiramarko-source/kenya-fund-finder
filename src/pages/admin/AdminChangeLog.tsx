import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  bulk_paste_sync: "bg-emerald-500/10 text-emerald-600",
  bulk_paste_revert: "bg-amber-500/10 text-amber-600",
};

const AdminChangeLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [reverting, setReverting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("change_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data as LogEntry[]);
  };

  useEffect(() => { load(); }, []);

  const lastBulkSync = useMemo(
    () => logs.find((l) => l.action === "bulk_paste_sync"),
    [logs],
  );
  const lastIsAlreadyReverted = useMemo(() => {
    if (!lastBulkSync) return false;
    // If a revert exists newer than this sync that points to it, treat as reverted
    return logs.some(
      (l) => l.action === "bulk_paste_revert" &&
        l.old_values?.reverted_log_id === lastBulkSync.id,
    );
  }, [logs, lastBulkSync]);

  const handleRevert = async () => {
    setReverting(true);
    try {
      const { data, error } = await supabase.rpc("revert_last_bulk_sync");
      if (error) throw error;
      const r = data as { restored: string[]; deleted: string[]; skipped: string[] };
      toast.success(`Reverted: restored ${r.restored?.length || 0}, deleted ${r.deleted?.length || 0}` + (r.skipped?.length ? `, skipped ${r.skipped.length} (no snapshot)` : ""));
      setConfirmRevert(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Revert failed");
    } finally {
      setReverting(false);
    }
  };

  const getChangedFields = (old: any, newV: any) => {
    if (!old || !newV) return [];
    return Object.keys(newV).filter((k) => JSON.stringify(old[k]) !== JSON.stringify(newV[k]));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Change Log</h2>
        {lastBulkSync && !lastIsAlreadyReverted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRevert(true)}
            className="gap-2"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Revert Last Sync
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {logs.map((log) => {
          const changedFields = getChangedFields(log.old_values, log.new_values);
          const isBulkSync = log.action === "bulk_paste_sync";
          const isRevert = log.action === "bulk_paste_revert";
          return (
            <div key={log.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className={actionColors[log.action] || ""}>
                  {log.action.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline">{log.entity_type}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(log.changed_at).toLocaleString("en-KE")}
                </span>
              </div>
              {isBulkSync && (
                <div className="text-xs text-muted-foreground mt-1">
                  Updated <b className="text-foreground">{log.new_values?.updated_count ?? 0}</b> ·
                  Created <b className="text-foreground">{log.new_values?.created_count ?? 0}</b>
                </div>
              )}
              {isRevert && (
                <div className="text-xs text-muted-foreground mt-1">
                  Restored <b className="text-foreground">{log.new_values?.restored_count ?? 0}</b> ·
                  Deleted <b className="text-foreground">{log.new_values?.deleted_count ?? 0}</b>
                  {log.new_values?.skipped_count ? <> · Skipped <b className="text-foreground">{log.new_values.skipped_count}</b></> : null}
                </div>
              )}
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

      <AlertDialog open={confirmRevert} onOpenChange={setConfirmRevert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert last bulk sync?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  This will roll back <b>{lastBulkSync?.new_values?.updated_count ?? 0} update{lastBulkSync?.new_values?.updated_count === 1 ? "" : "s"}</b>
                  {" "}and delete <b>{lastBulkSync?.new_values?.created_count ?? 0} newly-created fund{lastBulkSync?.new_values?.created_count === 1 ? "" : "s"}</b>
                  {" "}from the sync at{" "}
                  <b>{lastBulkSync ? new Date(lastBulkSync.changed_at).toLocaleString("en-KE") : ""}</b>.
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Updates are restored from the most recent yield snapshot for each fund. If a fund has no snapshot,
                  it will be skipped (you'll be told how many).
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting} className="gap-2">
              {reverting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminChangeLog;
