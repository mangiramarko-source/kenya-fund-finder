import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Newspaper, ClipboardList, LayoutDashboard, FileText, Megaphone, Globe } from "lucide-react";
import AdminDashboard from "./admin/AdminDashboard";
import AdminFunds from "./admin/AdminFunds";
import AdminNews from "./admin/AdminNews";
import AdminChangeLog from "./admin/AdminChangeLog";
import AdminPages from "./admin/AdminPages";
import AdminAds from "./admin/AdminAds";
import AdminMarkets from "./admin/AdminMarkets";

const AdminPage = () => {
  const { isAdmin, loading, user } = useAuth();

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">Your account does not have admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
         <TabsList className="grid w-full grid-cols-7 max-w-4xl">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="funds" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Funds</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5">
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Ads</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pages</span>
          </TabsTrigger>
          <TabsTrigger value="markets" className="gap-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Markets</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="funds"><AdminFunds /></TabsContent>
        
        <TabsContent value="news"><AdminNews /></TabsContent>
        <TabsContent value="ads"><AdminAds /></TabsContent>
        <TabsContent value="pages"><AdminPages /></TabsContent>
        <TabsContent value="markets"><AdminMarkets /></TabsContent>
        <TabsContent value="log"><AdminChangeLog /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
