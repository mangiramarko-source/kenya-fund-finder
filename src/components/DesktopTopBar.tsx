import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Moon, Sun, User, LogOut, Shield, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";

const DesktopTopBar = () => {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Don't persist on mount — preserves system-preference following
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setDark(e.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("avatar_url, display_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) { setAvatarUrl(data.avatar_url || ""); setDisplayName(data.display_name || ""); }
        });
    } else { setAvatarUrl(""); setDisplayName(""); }
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <header className="hidden md:flex items-center gap-4 h-14 px-5 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-30">
      {/* Left spacer */}
      <div className="w-4" />

      {/* Center: Large search bar */}
      <div className="flex-1 max-w-xl mx-auto">
        <SearchDialog variant="topbar" />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          className="rounded-full h-8 w-8"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationBell />

        {user ? (
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Link to="/admin" className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1 mr-1 px-2 py-1 rounded-lg bg-accent/10">
                <Shield className="h-3 w-3" /> Admin
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-1 ring-border hover:ring-accent transition-all">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl} alt={displayName || user.email || ""} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
                      {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/alerts")} className="gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" /> My Alerts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" /> Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg font-semibold h-7 text-xs px-3">
            <Link to="/auth"><User className="mr-1 h-3 w-3" /> Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default DesktopTopBar;
