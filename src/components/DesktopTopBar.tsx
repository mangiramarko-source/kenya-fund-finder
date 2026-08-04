import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { 
  Moon, Sun, User, LogOut, Shield, Settings, Bell, 
  TrendingUp, Sparkles, Briefcase, Calculator, GraduationCap, 
  FileText, Scale 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup 
} from "@/components/ui/dropdown-menu";
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
      return; 
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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => 
    `text-[13px] font-semibold transition-colors hover:text-foreground py-1.5 px-3 rounded-md ${
      isActive(path) ? "text-foreground bg-accent/15" : "text-muted-foreground"
    }`;

  return (
    <header className="hidden md:flex items-center gap-6 h-14 px-6 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-30">
      {/* 1. Logo */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-2 group">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-accent-foreground shrink-0 shadow-sm transition-transform group-hover:scale-105">
          <TrendingUp className="h-4 w-4" />
        </div>
        <span className="font-heading text-base font-bold text-foreground tracking-tight">
          KenyaFundFinder
        </span>
      </Link>

      {/* 2. Main Navigation Links */}
      <nav className="flex items-center gap-1 shrink-0">
        <Link to="/" className={navLinkClass("/")}>Overview</Link>
        <Link to="/ai-lab" className={navLinkClass("/ai-lab")}>AI Lab</Link>
        <Link to="/stocks" className={navLinkClass("/stocks")}>Stocks</Link>
        <Link to="/funds" className={navLinkClass("/funds")}>Unit Trusts</Link>
        <Link to="/rates" className={navLinkClass("/rates")}>FX Rates</Link>
        <Link to="/commodities" className={navLinkClass("/commodities")}>Commodities</Link>
      </nav>

      {/* 3. Search and Actions */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <div className="w-[280px] lg:w-[320px]">
          <SearchDialog variant="topbar" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationBell />

        {/* 4. User Profile / Tools Dropdown */}
        <div className="flex items-center ml-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-transparent hover:ring-border transition-all">
                <Avatar className="h-8 w-8 border border-border bg-muted">
                  {user ? (
                    <>
                      <AvatarImage src={avatarUrl} alt={displayName || user.email || ""} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                        {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-transparent text-muted-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-medium">
              {user ? (
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold truncate">{displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              ) : (
                <DropdownMenuItem onClick={() => navigate("/auth")} className="gap-2.5 cursor-pointer">
                  <User className="h-4 w-4 text-accent" /> Sign In / Register
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/ai-lab")} className="gap-2.5 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-accent" /> AI Lab
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/portfolio")} className="gap-2.5 cursor-pointer">
                  <Briefcase className="h-4 w-4 text-muted-foreground" /> Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/calculator")} className="gap-2.5 cursor-pointer">
                  <Calculator className="h-4 w-4 text-muted-foreground" /> Calculator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/learn")} className="gap-2.5 cursor-pointer">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" /> Learn
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2.5 cursor-pointer text-accent focus:text-accent">
                    <Shield className="h-4 w-4" /> Admin Panel
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate("/alerts")} className="gap-2.5 cursor-pointer">
                      <Bell className="h-4 w-4 text-muted-foreground" /> My Alerts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2.5 cursor-pointer">
                      <Settings className="h-4 w-4 text-muted-foreground" /> Profile Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/privacy")} className="gap-2.5 cursor-pointer text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Privacy Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/terms")} className="gap-2.5 cursor-pointer text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" /> Terms of Use
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2.5 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DesktopTopBar;
