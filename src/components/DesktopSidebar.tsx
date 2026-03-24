import { Link, useLocation } from "react-router-dom";
import {
  BarChart3, LineChart, Calculator, Newspaper, GraduationCap, Bell,
  TrendingUp, Search, User, Settings, Shield, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Moon, Sun,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";

const mainNavItems = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/stocks", label: "Stocks", icon: TrendingUp },
  { to: "/", label: "Unit Trusts", icon: BarChart3 },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/rates", label: "FX Rates", icon: LineChart },
];

const utilityNavItems = [
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/alerts", label: "Alerts", icon: Bell },
];

const DesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") return false;
    return true;
  });
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-200 z-40 ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border shrink-0">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-accent-foreground shrink-0">
          <TrendingUp className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="font-heading text-sm font-bold text-sidebar-foreground truncate">
            Kenya Fund Finder
          </span>
        )}
      </div>

      {/* Search trigger */}
      <div className="px-2 py-2 border-b border-sidebar-border">
        {collapsed ? (
          <SearchDialog />
        ) : (
          <SearchDialog />
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);

          const linkContent = (
            <Link
              to={item.to}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.to}>{linkContent}</div>;
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className="px-2 py-1">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setDark(!dark)}
                className="flex items-center justify-center w-full px-2.5 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{dark ? "Light Mode" : "Dark Mode"}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        )}
      </div>

      {/* Notification bell */}
      <div className="px-2 py-1">
        <div className={`flex items-center ${collapsed ? "justify-center" : "px-2.5"}`}>
          <NotificationBell />
        </div>
      </div>

      {/* Admin link */}
      {isAdmin && (
        <div className="px-2 py-1">
          <Link
            to="/admin"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-accent hover:bg-accent/10 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        {user ? (
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "px-2.5"}`}>
            <Link to="/profile">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
                  {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName || "User"}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut()}
                className="text-sidebar-foreground/40 hover:text-destructive transition-colors shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Link
            to="/auth"
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign In</span>}
          </Link>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-8 border-t border-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
};

export default DesktopSidebar;
