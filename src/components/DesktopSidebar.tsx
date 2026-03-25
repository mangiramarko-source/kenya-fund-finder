import { Link, useLocation } from "react-router-dom";
import {
  BarChart3, Calculator, Newspaper, GraduationCap, Bell,
  TrendingUp, Shield, ChevronLeft, ChevronRight, LayoutDashboard,
  FileText, Scale, DollarSign, Gem,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: { to: string; label: string; icon: any }, size: "normal" | "small" = "normal") => {
    const Icon = item.icon;
    const active = isActive(item.to);
    const isSmall = size === "small";

    const linkContent = (
      <Link
        to={item.to}
        className={`
          flex items-center gap-3 rounded-lg font-medium transition-all group relative
          ${isSmall ? "py-1.5 text-[12px]" : "py-2 text-[13px]"}
          ${collapsed ? "justify-center px-2" : "px-3"}
          ${active
            ? "bg-accent/15 text-accent"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/80"
          }
        `}
      >
        {/* Active indicator bar */}
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent" />
        )}
        <Icon className={`${isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 transition-colors ${active ? "text-accent" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60"}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.to}>{linkContent}</div>;
  };

  const SectionLabel = ({ children }: { children: string }) =>
    collapsed ? null : (
      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
        {children}
      </p>
    );

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-200 z-40 ${
        collapsed ? "w-[52px]" : "w-[200px]"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 h-14 border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2" : "px-3"}`}>
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent text-accent-foreground shrink-0">
          <TrendingUp className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <span className="font-heading text-[13px] font-bold text-sidebar-foreground truncate">
            Fund Finder
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Markets section */}
        <SectionLabel>Markets</SectionLabel>
        {mainNavItems.map((item) => renderNavItem(item))}

        {/* Tools section */}
        <div className="my-2 mx-1 h-px bg-sidebar-border" />
        <SectionLabel>Tools</SectionLabel>
        {utilityNavItems.map((item) => renderNavItem(item))}

        {/* Legal section */}
        <div className="my-2 mx-1 h-px bg-sidebar-border" />
        <SectionLabel>Legal</SectionLabel>
        {legalNavItems.map((item) => renderNavItem(item, "small"))}
      </nav>

      {/* Admin link */}
      {isAdmin && (
        <div className={`px-2 py-1.5 border-t border-sidebar-border ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/admin"
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Admin</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/admin"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-accent hover:bg-accent/10 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-9 border-t border-sidebar-border text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
};

export default DesktopSidebar;
