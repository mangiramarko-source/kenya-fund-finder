import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SocialDashboard from "./SocialDashboard";
import SocialCreatePost from "./SocialCreatePost";
import SocialQueue from "./SocialQueue";
import SocialScheduler from "./SocialScheduler";
import SocialTemplates from "./SocialTemplates";
import SocialAccounts from "./SocialAccounts";
import SocialAnalytics from "./SocialAnalytics";

export default function SocialIndex() {
  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="flex w-full overflow-x-auto justify-start">
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="create">Create</TabsTrigger>
        <TabsTrigger value="queue">Queue</TabsTrigger>
        <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard"><SocialDashboard /></TabsContent>
      <TabsContent value="create"><SocialCreatePost /></TabsContent>
      <TabsContent value="queue"><SocialQueue /></TabsContent>
      <TabsContent value="scheduler"><SocialScheduler /></TabsContent>
      <TabsContent value="templates"><SocialTemplates /></TabsContent>
      <TabsContent value="accounts"><SocialAccounts /></TabsContent>
      <TabsContent value="analytics"><SocialAnalytics /></TabsContent>
    </Tabs>
  );
}
