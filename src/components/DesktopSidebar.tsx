import { Link, useLocation } from "react-router-dom";
import {
  BarChart3, Newspaper, GraduationCap, Bell,
  TrendingUp, Shield, ChevronLeft, ChevronRight, LayoutDashboard,
  FileText, Scale, DollarSign, Gem, Briefcase, Calculator,
} from "lucide-react";
import { useState, useEffect } from "react";
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
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
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
  // Default: collapsed on tablet (md → lg), expanded on desktop (≥ lg)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023.98px)").matches;
  });

  // Auto-collapse when entering tablet range, auto-expand when leaving it.
  // Only applies on initial breakpoint crossing — user can still toggle manually.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023.98px)");
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
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
          flex items-center gap-2.5 rounded-md font-medium transition-all duration-150 group relative
          ${isSmall ? "py-1 text-[11.5px]" : "py-1.5 text-[12.5px]"}
          ${collapsed ? "justify-center px-0 mx-auto w-9 h-9" : "px-2.5"}
          ${active
            ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.18)]"
            : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          }
        `}
      >
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-r-full bg-accent" />
        )}
        <Icon className={`${isSmall ? "h-3.5 w-3.5" : "h-[15px] w-[15px]"} shrink-0 transition-colors ${active ? "text-accent" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70"}`} strokeWidth={active ? 2.25 : 1.75} />
        {!collapsed && <span className="truncate tracking-tight">{item.label}</span>}
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
      <p className="px-2.5 pt-2.5 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
        {children}
      </p>
    );

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-gradient-to-b from-sidebar via-sidebar to-sidebar/92 transition-[width] duration-200 z-40 ${
        collapsed ? "w-[56px]" : "w-[188px]"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2 h-14 border-b border-sidebar-border/70 shrink-0 ${collapsed ? "justify-center px-2" : "px-3"}`}>
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-gradient-to-br from-accent to-accent/75 text-accent-foreground shrink-0 shadow-sm ring-1 ring-accent/25">
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-heading text-[13px] font-bold text-sidebar-foreground truncate tracking-tight">
            KenyaFundFinder
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-px">
        {/* Markets section */}
        <SectionLabel>Markets</SectionLabel>
        {mainNavItems.map((item) => renderNavItem(item))}

        {/* Tools section */}
        <div className="my-1.5 mx-2 h-px bg-sidebar-border/60" />
        <SectionLabel>Tools</SectionLabel>
        {utilityNavItems.map((item) => renderNavItem(item))}

        {/* Legal section */}
        <div className="my-1.5 mx-2 h-px bg-sidebar-border/60" />
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
