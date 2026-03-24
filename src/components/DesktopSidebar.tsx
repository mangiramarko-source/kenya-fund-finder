import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  TrendingUp, BarChart3, LineChart, Calculator, Newspaper, BookOpen,
  DollarSign, Gem, Moon, Sun, User, LogOut, Shield, Settings, Search,
  ChevronDown, ChevronRight, Info, Mail
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const mainNav = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/stocks", label: "NSE Stocks", icon: LineChart },
  { to: "/rates", label: "FX Rates", icon: DollarSign },
  { to: "/commodities", label: "Commodities", icon: Gem },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: BookOpen },
];

interface TopFund {
  name: string;
  slug: string;
  annual_yield: number;
  daily_yield: number;
}

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [topFunds, setTopFunds] = useState<TopFund[]>([]);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== "light";
  });

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setAvatarUrl(data.avatar_url || "");
            setDisplayName(data.display_name || "");
          }
        });
    } else {
      setAvatarUrl("");
      setDisplayName("");
    }
  }, [user]);

  // Fetch top 3 funds for watchlist
  useEffect(() => {
    supabase
      .from("funds_public" as any)
      .select("name, slug, annual_yield, daily_yield")
      .eq("fund_type", "money_market")
      .order("annual_yield", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setTopFunds(data as any as TopFund[]);
      });
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[240px] border-r border-border bg-card shrink-0 h-screen sticky top-0 overflow-y-auto scrollbar-hide">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-accent-foreground transition-transform group-hover:scale-105">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-sm font-bold text-foreground tracking-tight">Fund Finder</span>
            <span className="text-[9px] font-normal text-muted-foreground tracking-wider uppercase mt-0.5">Kenya</span>
          </div>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-4 mb-4">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/60 border border-border/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[9px] font-mono bg-background px-1.5 py-0.5 rounded border border-border/60">⌘K</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-0.5 flex-1">
        {mainNav.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Top Funds Watchlist */}
      {topFunds.length > 0 && (
        <div className="px-4 mt-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Funds</h3>
            <Link to="/compare?type=money_market" className="text-[10px] text-accent hover:underline">All</Link>
          </div>
          <div className="space-y-1.5">
            {topFunds.map((fund) => (
              <Link
                key={fund.slug}
                to={`/compare/${fund.slug}`}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/10 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground truncate group-hover:text-accent transition-colors">{fund.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground tabular-nums">{fund.annual_yield}%</span>
                    <span className="text-[10px] text-accent font-semibold tabular-nums bg-accent/10 px-1.5 py-0 rounded-full">
                      +{fund.daily_yield}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="mt-auto border-t border-border">
        {/* Info links */}
        <div className="px-3 py-2 space-y-0.5">
          <Link to="/page/about" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Info className="h-3.5 w-3.5" /> About
          </Link>
          <Link to="/page/contact" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Mail className="h-3.5 w-3.5" /> Contact
          </Link>
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {/* User profile */}
        <div className="px-3 py-3 border-t border-border">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
                  {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{displayName || "User"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {isAdmin && (
                  <Link to="/admin" className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Admin">
                    <Shield className="h-3.5 w-3.5 text-accent" />
                  </Link>
                )}
                <Link to="/profile" className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Settings">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <button
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
            >
              <User className="h-4 w-4" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
