import { useState } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SuggestionBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) {
      toast.info("Please sign in to send a suggestion");
      navigate("/auth");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a suggestion");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("suggestions" as any).insert({
      user_id: user.id,
      display_name: profile?.display_name || user.email?.split("@")[0] || "User",
      message: message.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast.error("Failed to send suggestion");
    } else {
      toast.success("Suggestion sent! Thank you 🎉");
      setMessage("");
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="Send a suggestion"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
      </button>

      {/* Suggestion panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-xl border border-border bg-card p-4 shadow-xl md:bottom-24 md:right-8">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Send a Suggestion</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Have an idea or feedback? Let us know!
          </p>
          <Textarea
            placeholder="Type your suggestion here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mb-3 min-h-[100px] resize-none text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length}/1000</span>
            <Button size="sm" onClick={handleSubmit} disabled={sending || !message.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default SuggestionBox;
