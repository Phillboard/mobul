import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeal, useDealActivities } from "@/hooks/useDeals";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Calendar, 
  User, 
  Building2, 
  Mail, 
  Phone,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useDeal(id || null);
  const { data: activities } = useDealActivities(id || null);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!deal) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Deal not found</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{deal.deal_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={deal.status === 'won' ? 'default' : deal.status === 'lost' ? 'destructive' : 'secondary'}>
                    {deal.status}
                  </Badge>
                  {deal.pipelines && (
                    <Badge variant="outline">{deal.pipelines.pipeline_name}</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                {deal.amount && (
                  <p className="text-3xl font-bold">
                    ${deal.amount.toLocaleString()} {deal.currency}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Weighted: ${(deal.weighted_value || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Deal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <p className="font-medium">
                    {deal.pipelines?.stages?.find((s: any) => s.id === deal.stage_id)?.name || deal.stage_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="font-medium">{deal.probability}%</p>
                </div>
                {deal.expected_close_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Close</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(deal.expected_close_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {deal.deal_source && (
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-medium">{deal.deal_source}</p>
                  </div>
                )}
              </div>

              {deal.profiles && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Deal Owner</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{deal.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{deal.profiles.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact & Company Card */}
          <Card>
            <CardHeader>
              <CardTitle>Related Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.contacts && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Primary Contact</p>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {deal.contacts.first_name} {deal.contacts.last_name}
                    </p>
                    {deal.contacts.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{deal.contacts.email}</span>
                      </div>
                    )}
                    {deal.contacts.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{deal.contacts.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {deal.companies && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Company</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{deal.companies.company_name}</p>
                  </div>
                  {deal.companies.website && (
                    <a
                      href={deal.companies.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-1 block"
                    >
                      {deal.companies.website}
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="activities">
              <TabsList>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
              <TabsContent value="activities" className="space-y-4">
                {activities && activities.length > 0 ? (
                  activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-4 py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{activity.activity_type}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No activities yet
                  </p>
                )}
              </TabsContent>
              <TabsContent value="notes">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Notes feature coming soon
                </p>
              </TabsContent>
              <TabsContent value="files">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Files feature coming soon
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
