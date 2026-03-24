import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AlertsPage = () => {
  useDocumentTitle("Price Alerts | Kenya Fund Finder");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading, deleteAlert, toggleAlert } = usePriceAlerts();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to manage alerts</h1>
        <p className="text-muted-foreground mb-6">Create and manage price alerts for stocks, currencies, and commodities.</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);
  const pausedAlerts = alerts.filter(a => !a.is_active && !a.is_triggered);

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
    toast.success("Alert deleted");
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    await toggleAlert(id, !currentActive);
    toast.success(currentActive ? "Alert paused" : "Alert resumed");
  };

  const AlertCard = ({ alert }: { alert: typeof alerts[0] }) => {
    const isTriggered = alert.is_triggered;
    const isPaused = !alert.is_active && !isTriggered;

    return (
      <Card className={`transition-all ${isTriggered ? "border-accent/50 bg-accent/5" : isPaused ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground truncate">{alert.asset_name}</span>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {alert.asset_type}
                </Badge>
                {isTriggered && (
                  <Badge className="bg-accent text-accent-foreground text-xs shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" /> Triggered
                  </Badge>
                )}
                {isPaused && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <BellOff className="h-3 w-3 mr-1" /> Paused
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                {alert.condition === "above" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span>
                  When price goes <strong className="text-foreground">{alert.condition}</strong>{" "}
                  <strong className="text-foreground">{alert.target_price.toLocaleString()}</strong>
                </span>
              </div>

              {isTriggered && alert.triggered_price != null && (
                <p className="text-sm text-accent">
                  Triggered at {alert.triggered_price.toLocaleString()}
                  {alert.triggered_at && ` on ${format(new Date(alert.triggered_at), "MMM d, yyyy h:mm a")}`}
                </p>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                Created {format(new Date(alert.created_at), "MMM d, yyyy")}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isTriggered && (
                <Switch
                  checked={alert.is_active}
                  onCheckedChange={() => handleToggle(alert.id, alert.is_active)}
                  aria-label={alert.is_active ? "Pause alert" : "Resume alert"}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(alert.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/markets")}>
          + New Alert
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No alerts yet</h2>
            <p className="text-muted-foreground mb-6">
              Set price alerts on stocks, currencies, or commodities to get notified when they hit your target.
            </p>
            <Button onClick={() => navigate("/markets")}>Browse Markets</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
            <TabsTrigger value="triggered">Triggered ({triggeredAlerts.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeAlerts.length > 0 ? (
              activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={Bell} title="No active alerts" description="Create alerts from the Markets page" />
            )}
          </TabsContent>

          <TabsContent value="triggered" className="space-y-3">
            {triggeredAlerts.length > 0 ? (
              triggeredAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={CheckCircle} title="No triggered alerts" description="Alerts appear here once triggered" />
            )}
          </TabsContent>

          <TabsContent value="paused" className="space-y-3">
            {pausedAlerts.length > 0 ? (
              pausedAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            ) : (
              <EmptyState icon={BellOff} title="No paused alerts" description="Pause alerts to temporarily stop monitoring" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
};

export default AlertsPage;
