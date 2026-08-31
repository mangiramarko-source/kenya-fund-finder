import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteAccountCardProps {
  isAdmin: boolean;
  onDelete: () => Promise<void>;
}

const DeleteAccountCard = ({ isAdmin, onDelete }: DeleteAccountCardProps) => {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleting) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmation("");
      setError("");
    }
  };

  const handleDelete = async () => {
    if (confirmation !== "DELETE" || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Account deletion failed. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <Card className="mt-6 border-destructive/50">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete your KenyaFundFinder account and private account data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Administrator accounts must be removed through the controlled support process.
          </p>
        ) : (
          <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile, portfolio, watchlist, alerts, notifications, preferences, and avatar will be permanently removed. Public activity will remain without your identity. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="delete-account-confirmation">
                  Type <span className="font-semibold text-foreground">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-account-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={deleting}
                  autoComplete="off"
                  spellCheck={false}
                />
                {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmation !== "DELETE" || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDelete();
                  }}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting…" : "Permanently Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};

export default DeleteAccountCard;
