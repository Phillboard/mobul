/**
 * Marketing Hub Page
 * 
 * Main dashboard for email & SMS marketing features.
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Mail, MessageSquare, Zap, BarChart3, Send, Users, TrendingUp } from "lucide-react";
import { useMarketingCampaigns } from "@/features/marketing/hooks/useMarketingCampaigns";
import { useMarketingAutomations } from "@/features/marketing/hooks/useMarketingAutomations";
import { MarketingCampaignList } from "@/features/marketing/components/MarketingCampaignList";
import { AutomationList } from "@/features/marketing/components/AutomationList";

export default function Marketing() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/automations')) return 'automations';
    if (location.pathname.includes('/analytics')) return 'analytics';
    if (location.pathname.includes('/campaigns')) return 'campaigns';
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  const { data: campaigns = [], isLoading: campaignsLoading } = useMarketingCampaigns();
  const { data: automations = [], isLoading: automationsLoading } = useMarketingAutomations();
  
  // Calculate stats
  const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const activeAutomations = automations.filter(a => a.is_active).length;
  const totalEnrolled = automations.reduce((sum, a) => sum + a.total_enrolled, 0);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      navigate('/marketing');
    } else {
      navigate(`/marketing/${tab}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Marketing</h1>
            <p className="text-muted-foreground">
              Email & SMS campaigns and automation workflows
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/marketing/automations/new')}>
              <Zap className="h-4 w-4 mr-2" />
              New Automation
            </Button>
            <Button onClick={() => navigate('/marketing/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">
                {campaigns.length} total campaigns
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
                Email & SMS combined
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Mail className="h-4 w-4" />
              Campaigns
              {campaigns.length > 0 && (
                <Badge variant="secondary" className="ml-1">{campaigns.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-2">
              <Zap className="h-4 w-4" />
              Automations
              {automations.length > 0 && (
                <Badge variant="secondary" className="ml-1">{automations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/marketing/campaigns/new')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    Create Email Campaign
                  </CardTitle>
                  <CardDescription>
                    Send marketing emails to your contact lists
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/marketing/campaigns/new')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    Create SMS Campaign
                  </CardTitle>
                  <CardDescription>
                    Send text message campaigns to your contacts
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Campaigns</CardTitle>
                  <CardDescription>Your latest email & SMS campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaignsLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No campaigns yet</p>
                      <Button onClick={() => navigate('/marketing/campaigns/new')}>
                        Create First Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.slice(0, 5).map(campaign => (
                        <div 
                          key={campaign.id} 
                          className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/marketing/campaigns/${campaign.id}`)}
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
                          <Badge variant={
                            campaign.status === 'sent' ? 'default' :
                            campaign.status === 'sending' ? 'secondary' :
                            campaign.status === 'scheduled' ? 'outline' :
                            'secondary'
                          }>
                            {campaign.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Active Automations</CardTitle>
                  <CardDescription>Your running automation workflows</CardDescription>
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
                          <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                            {automation.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <MarketingCampaignList />
          </TabsContent>

          <TabsContent value="automations">
            <AutomationList />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Analytics</CardTitle>
                <CardDescription>Overall performance metrics for your marketing efforts</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
