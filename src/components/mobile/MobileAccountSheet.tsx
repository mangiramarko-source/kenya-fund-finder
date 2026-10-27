import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  User,
  Moon,
  Sun,
  LogOut,
  Shield,
  Bell,
  Settings,
  X,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface MobileAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
  dark: boolean;
  setDark: (v: boolean) => void;
  signOut: () => Promise<void>;
  navigate: (to: string) => void;
}

export default function MobileAccountSheet({
  open,
  onOpenChange,
  user,
  displayName,
  avatarUrl,
  isAdmin,
  dark,
  setDark,
  signOut,
  navigate,
}: MobileAccountSheetProps) {
  const close = () => onOpenChange(false);

  const initials = user
    ? (displayName || user.email || "U").slice(0, 2).toUpperCase()
    : "";

  const handleSignOut = async () => {
    close();
    await signOut();
  };

  const handleNav = (path: string) => {
    close();
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-label="Account and settings"
      >
        {/* Android drag pill */}
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-base font-bold text-foreground">
              Account & Settings
            </SheetTitle>
          </SheetHeader>
          <button
            onClick={close}
            type="button"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* User profile card */}
          {user ? (
            <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card/60 p-3.5">
              <Avatar className="h-12 w-12 border border-emerald-500/40 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-emerald-600 text-white font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {displayName || "KFF Investor"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/60 p-4 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <User className="h-6 w-6 stroke-[1.8]" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Guest Account</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
                  Sign in to sync your portfolio, create personal watchlists, and set live price alerts.
                </p>
              </div>
              <Button
                onClick={() => handleNav("/auth")}
                className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-xs"
              >
                Sign In or Create Account
              </Button>
            </div>
          )}

          {/* Quick links & Preferences */}
          <div className="rounded-2xl border border-border bg-card/40 divide-y divide-border/60 overflow-hidden">
            {/* Theme switch row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                  {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Dark Appearance</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dark ? "Dark theme active" : "Light theme active"}
                  </p>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={setDark} />
            </div>

            {/* Profile page link (if signed in) */}
            {user && (
              <button
                type="button"
                onClick={() => handleNav("/profile")}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Profile & Preferences</p>
                    <p className="text-[11px] text-muted-foreground">Manage your credentials & security</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Price Alerts link */}
            <button
              type="button"
              onClick={() => handleNav("/alerts")}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Price Alerts</p>
                  <p className="text-[11px] text-muted-foreground">Manage notifications for NSE stocks & rates</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Admin Dashboard if applicable */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNav("/admin")}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors text-amber-600 dark:text-amber-400"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Admin Dashboard</p>
                    <p className="text-[11px] text-muted-foreground">Platform controls & data ingestion</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sign Out (if signed in) */}
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-semibold py-2.5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out of Account</span>
            </button>
          )}

          <div className="text-center pt-2 pb-1">
            <p className="text-[10px] text-muted-foreground font-mono">
              KenyaFundFinder v2.4 · Android Mobile
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
