import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  itemType: "fund" | "stock" | "currency" | "commodity";
  itemId: string;
  itemName: string;
  variant?: "icon" | "button";
  className?: string;
  buttonLabel?: string;
  savedButtonLabel?: string;
}

const ANON_KEY = "kff_anon_save_clicks";

/**
 * Neutral "Save to watchlist" toggle. No advice copy.
 * Anonymous users see a sign-up nudge after 2 attempts.
 */
const SaveToWatchlistButton = ({
  itemType, itemId, itemName, variant = "icon", className, buttonLabel = "Save", savedButtonLabel = "Saved",
}: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavourite, toggle } = useAssetWatchlist(itemType);
  const saved = isFavourite(itemId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const count = Number(localStorage.getItem(ANON_KEY) || "0") + 1;
      localStorage.setItem(ANON_KEY, String(count));
      if (count >= 2) {
        toast.message("Create a free account to save your watchlist across devices.", {
          action: { label: "Sign in", onClick: () => navigate("/auth?redirect=/watchlist") },
        });
      } else {
        toast.info("Sign in to save items to your watchlist.");
      }
      return;
    }
    toggle(itemId, itemName);
  };

  const label = saved ? "Saved to watchlist" : "Save to watchlist";
  const Icon = saved ? BookmarkCheck : Bookmark;

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size="sm"
        className={cn("gap-1.5 text-xs", className)}
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5" />
        {saved ? savedButtonLabel : buttonLabel}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        saved && "text-accent hover:text-accent",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

export default SaveToWatchlistButton;
