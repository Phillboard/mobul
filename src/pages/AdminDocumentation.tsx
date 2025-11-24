import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDocsList } from "@/components/documentation/AdminDocsList";
import { AdminDocsAnalytics } from "@/components/documentation/AdminDocsAnalytics";
import { AdminDocsFeedback } from "@/components/documentation/AdminDocsFeedback";
import { SeedDocsButton } from "@/components/documentation/SeedDocsButton";

export default function AdminDocumentation() {
  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Documentation Management</h1>
          <SeedDocsButton />
        </div>

        <Tabs defaultValue="pages">
          <TabsList>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            <AdminDocsList />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminDocsAnalytics />
          </TabsContent>

          <TabsContent value="feedback">
            <AdminDocsFeedback />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
