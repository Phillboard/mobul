import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { supabase } from "@core/services/supabase";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, ArrowLeft, Package } from "lucide-react";
import { useToast } from '@/shared/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { QRAnalytics } from "@/features/campaigns/components/QRAnalytics";
import { ApprovalsTab } from "@/features/campaigns/components/ApprovalsTab";
import { CommentsTab } from "@/features/campaigns/components/CommentsTab";
import { CallAnalyticsTab } from "@/features/campaigns/components/CallAnalyticsTab";
import { RewardsTab } from "@/features/campaigns/components/RewardsTab";
import { CallLogTable } from "@/features/campaigns/components/CallLogTable";
import { ConditionsDisplay } from "@/features/campaigns/components/ConditionsDisplay";
import { GiftCardInventoryPanel } from "@/features/campaigns/components/GiftCardInventoryPanel";
import { DeliveryTimelinePanel } from "@/features/campaigns/components/DeliveryTimelinePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, template:templates(*), audience:audiences(*)')
        .eq('id', id!)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['print-batches', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_batches')
        .select('*')
        .eq('campaign_id', id!)
        .order('batch_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading campaign...</div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-500",
      proofed: "bg-blue-500",
      approved: "bg-green-500",
      in_production: "bg-orange-500",
      mailed: "bg-purple-500",
      completed: "bg-emerald-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getBatchStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-slate-500",
      printing: "bg-blue-500",
      mailed: "bg-purple-500",
      delivered: "bg-green-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{campaign.name}</h1>
            <p className="text-muted-foreground">Campaign Details & Tracking</p>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience:</span>
                <span className="font-medium">{campaign.audience?.name} ({campaign.audience?.valid_count} recipients)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mail Size:</span>
                <span className="font-medium">{campaign.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Postage:</span>
                <span className="font-medium">{campaign.postage?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mail Date:</span>
                <span className="font-medium">{campaign.mail_date ? new Date(campaign.mail_date).toLocaleDateString() : 'Not set'}</span>
              </div>
            </CardContent>
          </Card>

        </div>

        <Tabs defaultValue="conditions" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="calls">Call Analytics</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="call-log">Call Log</TabsTrigger>
            <TabsTrigger value="qr">QR Analytics</TabsTrigger>
            <TabsTrigger value="batches">Print Batches</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="conditions">
            <ConditionsDisplay campaignId={id!} />
          </TabsContent>

          <TabsContent value="qr">
            <QRAnalytics campaignId={id!} />
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            {batches && batches.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Print Batches
                  </CardTitle>
                  <CardDescription>View production batches for this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">Batch {batch.batch_number}</TableCell>
                          <TableCell>{batch.recipient_count?.toLocaleString()}</TableCell>
                          <TableCell>{batch.vendor}</TableCell>
                          <TableCell>
                            <Badge className={getBatchStatusColor(batch.status || 'pending')}>
                              {batch.status?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDistanceToNow(new Date(batch.created_at!), { addSuffix: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">No print batches yet</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calls">
            <CallAnalyticsTab campaignId={id!} />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="space-y-6">
              <GiftCardInventoryPanel campaignId={id!} />
              <RewardsTab campaignId={id!} />
              <DeliveryTimelinePanel campaignId={id!} />
            </div>
          </TabsContent>

          <TabsContent value="call-log">
            <CallLogTable campaignId={id!} />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab campaignId={id!} />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsTab campaignId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
