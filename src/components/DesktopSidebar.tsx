import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, LineChart, Calculator, Newspaper, GraduationCap, BookOpen, Info, Mail, Scale } from "lucide-react";

const mainLinks = [
  { to: "/", label: "Funds", icon: BarChart3 },
  { to: "/stocks", label: "Stocks", icon: LineChart },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: GraduationCap },
];

const infoLinks = [
  { to: "/page/about", label: "About", icon: Info },
  { to: "/page/contact", label: "Contact", icon: Mail },
  { to: "/page/legal", label: "Legal", icon: Scale },
];

const DesktopSidebar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 sticky top-0 h-screen border-r border-border bg-sidebar overflow-y-auto">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5 font-heading text-base font-bold text-foreground">
        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-accent-foreground shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
        <span className="truncate">Kenya Fund Finder</span>
      </Link>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Menu</p>
        {mainLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}

        <div className="h-px bg-border my-3" />

        <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Info</p>
        {infoLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          © {new Date().getFullYear()} Kenya Fund Finder
        </p>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
