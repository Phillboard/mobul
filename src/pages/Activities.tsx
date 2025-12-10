import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Plus, Phone, Mail, Calendar, MessageSquare, FileText } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useActivities } from '@/features/activities/hooks';
import { UniversalActivityFeed } from "@/features/activities/components/UniversalActivityFeed";
import { ActivityLogger } from "@/features/activities/components/ActivityLogger";

export default function Activities() {
  const { currentClient } = useTenant();
  const [showLogger, setShowLogger] = useState(false);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);

  const { data: activities, isLoading } = useActivities(currentClient?.id || null, {
    activityType: filterType,
  });

  const activityCounts = {
    all: activities?.length || 0,
    call: activities?.filter(a => a.activity_type === 'call').length || 0,
    email: activities?.filter(a => a.activity_type === 'email').length || 0,
    meeting: activities?.filter(a => a.activity_type === 'meeting').length || 0,
    note: activities?.filter(a => a.activity_type === 'note').length || 0,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activities</h1>
            <p className="text-muted-foreground mt-2">
              Track all customer interactions and communications
            </p>
          </div>
          <Button onClick={() => setShowLogger(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">All Activities</p>
                  <p className="text-2xl font-bold">{activityCounts.all}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Calls</p>
                  <p className="text-2xl font-bold">{activityCounts.call}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emails</p>
                  <p className="text-2xl font-bold">{activityCounts.email}</p>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meetings</p>
                  <p className="text-2xl font-bold">{activityCounts.meeting}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-2xl font-bold">{activityCounts.note}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={(v) => setFilterType(v === 'all' ? undefined : v)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="call">Calls</TabsTrigger>
                <TabsTrigger value="email">Emails</TabsTrigger>
                <TabsTrigger value="meeting">Meetings</TabsTrigger>
                <TabsTrigger value="note">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <UniversalActivityFeed activities={activities || []} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="call" className="mt-6">
                <UniversalActivityFeed activities={activities || []} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="email" className="mt-6">
                <UniversalActivityFeed activities={activities || []} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="meeting" className="mt-6">
                <UniversalActivityFeed activities={activities || []} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="note" className="mt-6">
                <UniversalActivityFeed activities={activities || []} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activity Logger Dialog */}
        <ActivityLogger 
          open={showLogger} 
          onOpenChange={setShowLogger}
          clientId={currentClient?.id || ''}
        />
      </div>
    </Layout>
  );
}
