import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportIssueDialogProps {
  fundId: string;
  fundName: string;
}

const ReportIssueDialog = ({ fundId, fundName }: ReportIssueDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.info("Please sign in to report a data issue.");
      navigate("/auth");
      return;
    }
    const text = message.trim();
    if (text.length < 10) {
      toast.error("Please describe the issue in a little more detail.");
      return;
    }
    setSaving(true);
    const payload = `[Fund data issue] ${fundName} (id: ${fundId})\n\n${text}`;
    const { error } = await supabase.from("suggestions").insert({
      user_id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      message: payload,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    toast.success("Thanks — our team will review the report.");
    setMessage("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[11px] h-7 gap-1.5 text-muted-foreground hover:text-foreground">
          <Flag className="h-3 w-3" /> Report incorrect data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base">Report a data issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground">Fund</p>
            <p className="text-sm font-semibold">{fundName}</p>
          </div>
          <Textarea
            placeholder="Describe what looks wrong (e.g. yield, minimum investment, fee, withdrawal period, fund name)…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="text-[16px] sm:text-sm"
          />
          <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            Reports go to the KenyaFundFinder team for review. We will not contact you unless we need clarification.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Sending…" : "Send report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;
