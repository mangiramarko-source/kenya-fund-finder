import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConsent } from "@/hooks/useConsent";
import { setConsent, clearConsent } from "@/lib/consent";
import { useToast } from "@/hooks/use-toast";

/**
 * Re-entry point so users can update or revoke their cookie choice at any time
 * (e.g. inside the Profile / Settings page).
 */
const CookiePreferences = () => {
  const { preferences } = useConsent();
  const [analytics, setAnalytics] = useState(preferences.analytics);
  const [ads, setAds] = useState(preferences.ads);
  const { toast } = useToast();

  const save = () => {
    const choice = analytics && ads ? "accepted" : !analytics && !ads ? "rejected" : "custom";
    setConsent(choice, { analytics, ads });
    toast({ title: "Cookie preferences saved" });
  };

  const reset = () => {
    clearConsent();
    setAnalytics(false);
    setAds(false);
    toast({ title: "Cookie consent cleared", description: "You'll be asked again on next page load." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cookie preferences</CardTitle>
        <CardDescription>Choose which categories of cookies you allow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Necessary</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Required for sign-in and core functionality. Always active.
            </p>
          </div>
          <Switch checked disabled />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Analytics</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Helps us understand how the site is used.
            </p>
          </div>
          <Switch checked={analytics} onCheckedChange={setAnalytics} />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Advertising</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used to deliver relevant ads and measure performance.
            </p>
          </div>
          <Switch checked={ads} onCheckedChange={setAds} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={save} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Save preferences
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset / re-show banner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CookiePreferences;
