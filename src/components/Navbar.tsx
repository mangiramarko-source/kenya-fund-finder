import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, TrendingUp, BarChart3, Calculator, Newspaper, GraduationCap, Home, Moon, Sun, User, LogOut, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";

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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

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
      <div className="container flex h-16 items-center justify-between relative">
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
          <SearchDialog />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-border hover:ring-accent transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} alt={displayName || user.email || ""} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs">
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
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold">
              <Link to="/auth"><User className="mr-1.5 h-3.5 w-3.5" /> Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile: centered nav links with labels */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex md:hidden items-center gap-0.5 bg-muted/60 rounded-full px-1 py-1">
          {navLinks.filter(l => ["/compare", "/calculator", "/news"].includes(l.to)).map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-accent hover:bg-muted"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger on right */}
        <div className="flex md:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className="rounded-full h-9 w-9"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile search bar below nav */}
      <div className="md:hidden px-4 pb-2 pt-1 border-b border-border bg-card/95">
        <SearchDialog />
      </div>

      {/* Mobile hamburger dropdown */}
      {open && (
        <nav className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2 space-y-1">
          <button
            onClick={() => { setDark(!dark); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                <Settings className="h-5 w-5" /> Profile Settings
              </Link>
              <button
                onClick={async () => { await signOut(); setOpen(false); navigate("/"); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-5 w-5" /> Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              <User className="h-5 w-5" /> Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
