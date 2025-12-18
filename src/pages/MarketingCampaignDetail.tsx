/**
 * Marketing Campaign Detail Page
 * 
 * Shows detailed view of a marketing campaign with analytics.
 */

import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Progress } from "@/shared/components/ui/progress";
import { 
  ArrowLeft, Edit, Copy, Trash2, Play, Pause, X,
  Mail, MessageSquare, Users, Send, CheckCircle, 
  Eye, MousePointerClick, AlertCircle, UserMinus
} from "lucide-react";
import { 
  useMarketingCampaign, 
  useDeleteMarketingCampaign,
  useDuplicateMarketingCampaign,
  useSendMarketingCampaign,
  usePauseMarketingCampaign,
  useCancelMarketingCampaign
} from "@/features/marketing/hooks/useMarketingCampaigns";
import { useMarketingSendStats, useCampaignRecipients } from "@/features/marketing/hooks/useMarketingSends";
import { CampaignAnalytics } from "@/features/marketing/components/Analytics/CampaignAnalytics";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  draft: 'secondary',
  scheduled: 'outline',
  sending: 'default',
  sent: 'default',
  paused: 'secondary',
  cancelled: 'destructive',
};

export default function MarketingCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: campaign, isLoading } = useMarketingCampaign(id);
  const { data: stats } = useMarketingSendStats(id);
  const { data: recipients } = useCampaignRecipients(id);
  
  const deleteMutation = useDeleteMarketingCampaign();
  const duplicateMutation = useDuplicateMarketingCampaign();
  const sendMutation = useSendMarketingCampaign();
  const pauseMutation = usePauseMarketingCampaign();
  const cancelMutation = useCancelMarketingCampaign();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">Loading campaign...</div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Campaign not found</h2>
            <Button onClick={() => navigate('/marketing')}>Back to Marketing</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(campaign.id);
    navigate('/marketing');
  };

  const handleDuplicate = async () => {
    const newCampaign = await duplicateMutation.mutateAsync(campaign.id);
    navigate(`/marketing/campaigns/${newCampaign.id}/edit`);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketing')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {campaign.campaign_type === 'email' ? (
                  <Mail className="h-5 w-5 text-blue-500" />
                ) : campaign.campaign_type === 'sms' ? (
                  <MessageSquare className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="flex">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <MessageSquare className="h-5 w-5 text-green-500 -ml-1" />
                  </div>
                )}
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <Badge variant={statusColors[campaign.status] as any}>
                  {campaign.status}
                </Badge>
              </div>
              {campaign.description && (
                <p className="text-muted-foreground mt-1">{campaign.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/marketing/campaigns/${campaign.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={() => sendMutation.mutate(campaign.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              </>
            )}
            {campaign.status === 'sending' && (
              <Button variant="outline" onClick={() => pauseMutation.mutate(campaign.id)}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {campaign.status === 'paused' && (
              <Button onClick={() => sendMutation.mutate(campaign.id)}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            {['draft', 'scheduled', 'sending', 'paused'].includes(campaign.status) && (
              <Button variant="outline" onClick={() => cancelMutation.mutate(campaign.id)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this campaign? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.total_recipients.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.sent_count.toLocaleString()}</div>
              <Progress value={stats?.sent_percentage || 0} className="mt-2 h-1" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.delivery_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{campaign.delivered_count.toLocaleString()} delivered</p>
            </CardContent>
          </Card>
          
          {campaign.campaign_type !== 'sms' && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Opened
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.open_rate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">{campaign.opened_count.toLocaleString()} opens</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" />
                    Clicked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.click_rate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">{campaign.clicked_count.toLocaleString()} clicks</p>
                </CardContent>
              </Card>
            </>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Bounced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.bounce_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{campaign.bounced_count.toLocaleString()} bounces</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recipients">
              Recipients
              <Badge variant="secondary" className="ml-2">{recipients?.total || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{campaign.campaign_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audience Type</span>
                    <span className="font-medium capitalize">{campaign.audience_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{format(new Date(campaign.created_at), 'PPp')}</span>
                  </div>
                  {campaign.scheduled_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span className="font-medium">{format(new Date(campaign.scheduled_at), 'PPp')}</span>
                    </div>
                  )}
                  {campaign.started_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started</span>
                      <span className="font-medium">{format(new Date(campaign.started_at), 'PPp')}</span>
                    </div>
                  )}
                  {campaign.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{format(new Date(campaign.completed_at), 'PPp')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Message Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {campaign.messages && campaign.messages.length > 0 ? (
                    <div className="space-y-4">
                      {campaign.messages.map((msg, idx) => (
                        <div key={msg.id} className="p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            {msg.message_type === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-medium capitalize">{msg.message_type}</span>
                            {campaign.messages.length > 1 && (
                              <Badge variant="outline">Step {idx + 1}</Badge>
                            )}
                          </div>
                          {msg.subject && (
                            <p className="font-medium">{msg.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {msg.body_text || 'No preview available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No messages configured</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipients">
            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>All contacts who received this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <CampaignAnalytics campaignId={campaign.id} view="recipients" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics campaignId={campaign.id} view="charts" />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Messages</CardTitle>
                <CardDescription>Email and SMS content for this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.messages && campaign.messages.length > 0 ? (
                  <div className="space-y-6">
                    {campaign.messages.map((msg, idx) => (
                      <div key={msg.id} className="border rounded-lg overflow-hidden">
                        <div className="p-4 bg-muted flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {msg.message_type === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-500" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-medium capitalize">{msg.message_type} Message</span>
                            {campaign.messages.length > 1 && (
                              <Badge variant="outline">Step {idx + 1}</Badge>
                            )}
                          </div>
                          {msg.delay_minutes > 0 && (
                            <span className="text-sm text-muted-foreground">
                              +{msg.delay_minutes} minutes delay
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          {msg.subject && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">Subject</p>
                              <p className="font-medium">{msg.subject}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Content</p>
                            <div className="mt-2 p-4 rounded bg-muted/50 whitespace-pre-wrap">
                              {msg.body_text || msg.body_html || 'No content'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No messages configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
