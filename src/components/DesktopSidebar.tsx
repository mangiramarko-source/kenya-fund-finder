import { Link, useLocation } from "react-router-dom";
import {
  BarChart3, Calculator, Newspaper, GraduationCap, Bell,
  TrendingUp, Shield, LogOut, ChevronLeft, ChevronRight, LayoutDashboard,
  FileText, Scale, DollarSign, Gem,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const mainNavItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/stocks", label: "Stocks", icon: TrendingUp },
  { to: "/funds", label: "Unit Trusts", icon: BarChart3 },
  { to: "/rates", label: "FX Rates", icon: DollarSign },
  { to: "/commodities", label: "Commodities", icon: Gem },
];

const utilityNavItems = [
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/alerts", label: "Alerts", icon: Bell },
];

const legalNavItems = [
  { to: "/privacy", label: "Privacy Policy", icon: FileText },
  { to: "/terms", label: "Terms of Use", icon: Scale },
];

const DesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("avatar_url, display_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) { setAvatarUrl(data.avatar_url || ""); setDisplayName(data.display_name || ""); }
        });
    } else { setAvatarUrl(""); setDisplayName(""); }
  }, [user]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: { to: string; label: string; icon: any }, size: "normal" | "small" = "normal") => {
    const Icon = item.icon;
    const active = isActive(item.to);
    const py = size === "small" ? "py-1.5" : "py-2";
    const textSize = size === "small" ? "text-[12px]" : "text-[13px]";
    const iconSize = size === "small" ? "h-3.5 w-3.5" : "h-4 w-4";

    const linkContent = (
      <Link to={item.to} className={`flex items-center gap-2.5 px-2.5 ${py} rounded-lg ${textSize} font-medium transition-all group ${active ? "bg-accent/15 text-accent" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}>
        <Icon className={`${iconSize} shrink-0 ${active ? "text-accent" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
      </Link>
    );
    if (collapsed) return <Tooltip key={item.to} delayDuration={0}><TooltipTrigger asChild>{linkContent}</TooltipTrigger><TooltipContent side="right" className="text-xs">{item.label}</TooltipContent></Tooltip>;
    return <div key={item.to}>{linkContent}</div>;
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

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {mainNavItems.map((item) => renderNavItem(item))}

        <div className="!my-2 mx-2 h-px bg-sidebar-border" />
        {!collapsed && <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">Tools</p>}

        {utilityNavItems.map((item) => renderNavItem(item))}

        <div className="!my-2 mx-2 h-px bg-sidebar-border" />
        {!collapsed && <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">Legal</p>}

        {legalNavItems.map((item) => renderNavItem(item, "small"))}
      </nav>

      {/* Admin link */}
      {isAdmin && (
        <div className="px-2 py-1">
          <Link
            to="/admin"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-accent hover:bg-accent/10 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        </div>
      )}


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
