import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, TrendingUp, BarChart3, Calculator, Newspaper, GraduationCap, Home, Moon, Sun, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/compare", label: "Compare", icon: BarChart3 },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learn", label: "Learn", icon: GraduationCap },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const location = useLocation();
  const navigate = useNavigate();
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
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDark(true);
    else if (saved === "light") setDark(false);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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

        {/* Desktop nav */}
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

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="rounded-full"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold">
              <Link to="/auth"><User className="mr-1.5 h-3.5 w-3.5" /> Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile: center icon nav */}
        <nav className="flex md:hidden items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center justify-center h-9 w-9 rounded-full transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                aria-label={link.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center justify-center h-9 w-9 rounded-full transition-all ${
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-accent hover:bg-muted"
              }`}
              aria-label="Admin"
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="rounded-full h-9 w-9"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full h-9 w-9" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link
              to="/auth"
              className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              aria-label="Sign In"
            >
              <User className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
