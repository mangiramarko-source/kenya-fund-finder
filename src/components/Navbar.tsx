import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, TrendingUp, BarChart3, Calculator, Newspaper, GraduationCap, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/compare", label: "Compare", icon: BarChart3 },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: GraduationCap },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary shrink-0">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-accent-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">MMF Compare</span>
        </Link>

        {/* Desktop nav — icon + label pills */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full px-1.5 py-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <Button asChild size="sm" className="hidden md:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold">
          <Link to="/compare">Get Started</Link>
        </Button>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          <div className="mt-3 px-1">
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-semibold">
              <Link to="/compare" onClick={() => setOpen(false)}>Get Started</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
