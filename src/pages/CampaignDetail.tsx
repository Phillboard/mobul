import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Package, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { QRAnalytics } from "@/components/campaigns/QRAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: events } = useQuery({
    queryKey: ['campaign-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, recipient:recipients(*)')
        .eq('campaign_id', id!)
        .order('occurred_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const simulateTrackingMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('simulate-mail-tracking', {
        body: { campaignId: id },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Tracking Simulated",
        description: `Generated tracking for ${data.deliveredCount} delivered, ${data.returnedCount} returned`,
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-events', id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
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

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => simulateTrackingMutation.mutate()}
                disabled={simulateTrackingMutation.isPending}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Simulate Mail Tracking (Testing)
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tracking" className="w-full">
          <TabsList>
            <TabsTrigger value="tracking">Mail Tracking</TabsTrigger>
            <TabsTrigger value="qr">QR Analytics</TabsTrigger>
            <TabsTrigger value="batches">Print Batches</TabsTrigger>
          </TabsList>

          <TabsContent value="tracking" className="space-y-4">
            {events && events.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Mail Tracking Events</CardTitle>
                  <CardDescription>Recent delivery and tracking updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {event.recipient?.first_name} {event.recipient?.last_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {event.recipient?.address1}, {event.recipient?.city}, {event.recipient?.state}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {event.event_type.replace('imb_', '').replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={event.event_type === 'mail_returned' ? 'bg-red-500' : 'bg-green-500'}>
                              {event.event_type === 'mail_returned' ? 'Returned' : 'Success'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDistanceToNow(new Date(event.occurred_at!), { addSuffix: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">No tracking events yet</div>
                </CardContent>
              </Card>
            )}
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
        </Tabs>
      </div>
    </Layout>
  );
}
