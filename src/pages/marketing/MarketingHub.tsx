/**
 * Marketing Hub - Main Dashboard
 * 
 * Overview dashboard for email & SMS marketing with stats and quick actions.
 * This is a dedicated dashboard page (not tabs).
 */

import { useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Mail, MessageSquare, Zap, Send, Users, TrendingUp, FileText } from "lucide-react";
import { useMarketingCampaigns } from "@/features/marketing/hooks/useMarketingCampaigns";
import { useMarketingAutomations } from "@/features/marketing/hooks/useMarketingAutomations";

export default function MarketingHub() {
  const navigate = useNavigate();
  
  const { data: campaigns = [], isLoading: campaignsLoading } = useMarketingCampaigns();
  const { data: automations = [], isLoading: automationsLoading } = useMarketingAutomations();
  
  // Calculate stats
  const activeBroadcasts = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.total_recipients, 0);
  const activeAutomations = automations.filter(a => a.is_active).length;
  const totalEnrolled = automations.reduce((sum, a) => sum + a.total_enrolled, 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Marketing Hub</h1>
          <p className="text-muted-foreground">
            Email & SMS marketing overview and quick actions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Broadcasts</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBroadcasts}</div>
              <p className="text-xs text-muted-foreground">
                {campaigns.length} total broadcasts
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {totalRecipients > 0 && totalSent === 0 
                  ? `${totalRecipients.toLocaleString()} recipients targeted`
                  : totalRecipients > totalSent
                  ? `${totalRecipients.toLocaleString()} total recipients`
                  : 'Email & SMS combined'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAutomations}</div>
              <p className="text-xs text-muted-foreground">
                {automations.length} total workflows
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrolled.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Contacts in workflows
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            onClick={() => navigate('/marketing/broadcasts/new')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Create Broadcast
              </CardTitle>
              <CardDescription>
                Send one-time email or SMS to your contacts
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            onClick={() => navigate('/marketing/automations/new')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Create Automation
              </CardTitle>
              <CardDescription>
                Set up automated multi-step workflows
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            onClick={() => navigate('/marketing/content')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Content Library
              </CardTitle>
              <CardDescription>
                Manage email & SMS templates
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Broadcasts</CardTitle>
                <CardDescription>Your latest email & SMS broadcasts</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/marketing/broadcasts')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No broadcasts yet</p>
                  <Button onClick={() => navigate('/marketing/broadcasts/new')}>
                    Create First Broadcast
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map(campaign => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/marketing/broadcasts/${campaign.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {campaign.campaign_type === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : campaign.campaign_type === 'sms' ? (
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="flex">
                            <Mail className="h-4 w-4 text-blue-500" />
                            <MessageSquare className="h-4 w-4 text-green-500 -ml-1" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.sent_count.toLocaleString()} sent
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Automations</CardTitle>
                <CardDescription>Your running automation workflows</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/marketing/automations')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {automationsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : automations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No automations yet</p>
                  <Button onClick={() => navigate('/marketing/automations/new')}>
                    Create First Automation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {automations.slice(0, 5).map(automation => (
                    <div 
                      key={automation.id} 
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/marketing/automations/${automation.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className={`h-4 w-4 ${automation.is_active ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">{automation.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {automation.total_enrolled} enrolled
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
