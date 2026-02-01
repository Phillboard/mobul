/**
 * IntegrationsSettings Component
 * 
 * Consolidated integrations settings with 5 tabs:
 * - Overview - Grid of all integrations with status
 * - CRM Integration (Coming Soon)
 * - Zapier
 * - Mail Provider
 * - API Keys
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Plug, Database, Zap, Mail, Code, Check, ExternalLink, 
  ArrowRight, AlertCircle
} from "lucide-react";
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@core/auth/AuthProvider';
import { ComingSoon } from '@/shared/components/ComingSoon';
import { ComingSoonBadge } from '@/shared/components/ComingSoonBadge';
import { CRMIntegrationTab } from './CRMIntegrationTab';
import { ZapierIntegrationTab } from './ZapierIntegrationTab';
import { MailProviderSettings } from './MailProviderSettings';
import { APISettings } from './APISettings';
import {
  SettingsPageLayout,
  SettingsCard,
  SettingsEmptyState,
} from './ui';

interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'available' | 'coming_soon' | 'error';
  tab: string;
}

export function IntegrationsSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { currentClient } = useTenant();
  const { hasPermission } = useAuth();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Integration status data - in production this would come from hooks
  const integrations: IntegrationStatus[] = [
    {
      id: 'crm',
      name: 'CRM Integration',
      description: 'Sync contacts and leads with your CRM system',
      icon: Database,
      status: 'coming_soon',
      tab: 'crm',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automate workflows with 5000+ apps',
      icon: Zap,
      status: 'available',
      tab: 'zapier',
    },
    {
      id: 'mail-provider',
      name: 'Mail Provider',
      description: 'Configure direct mail fulfillment provider',
      icon: Mail,
      status: 'available',
      tab: 'mail-provider',
    },
    {
      id: 'api',
      name: 'API Access',
      description: 'Developer API for custom integrations',
      icon: Code,
      status: 'available',
      tab: 'api',
    },
  ];

  const getStatusBadge = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Connected</Badge>;
      case 'available':
        return <Badge variant="secondary">Available</Badge>;
      case 'coming_soon':
        return <ComingSoonBadge variant="coming_soon" size="sm" />;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <SettingsPageLayout 
      title="Integrations" 
      description="Connect external services and manage API access"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">
            <Plug className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="crm">
            <Database className="h-4 w-4 mr-2" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="zapier">
            <Zap className="h-4 w-4 mr-2" />
            Zapier
          </TabsTrigger>
          <TabsTrigger value="mail-provider">
            <Mail className="h-4 w-4 mr-2" />
            Mail Provider
          </TabsTrigger>
          <TabsTrigger value="api">
            <Code className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card 
                  key={integration.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    integration.status === 'coming_soon' ? 'opacity-75' : ''
                  }`}
                  onClick={() => {
                    if (integration.status !== 'coming_soon') {
                      setActiveTab(integration.tab);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {integration.description}
                    </p>
                    {integration.status !== 'coming_soon' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary p-0 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(integration.tab);
                        }}
                      >
                        Configure <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* External Integrations Section */}
          <SettingsCard
            title="Need Another Integration?"
            description="Request new integrations or use our API for custom solutions"
            icon={ExternalLink}
          >
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href="mailto:support@mobul.com?subject=Integration Request">
                  Request Integration
                </a>
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('api')}>
                <Code className="h-4 w-4 mr-2" />
                Use API
              </Button>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm">
          <ComingSoon featureKey="crm_integration">
            <CRMIntegrationTab />
          </ComingSoon>
        </TabsContent>

        {/* Zapier Tab */}
        <TabsContent value="zapier">
          <ZapierIntegrationTab />
        </TabsContent>

        {/* Mail Provider Tab */}
        <TabsContent value="mail-provider">
          <MailProviderSettings />
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api">
          <APISettings />
        </TabsContent>
      </Tabs>
    </SettingsPageLayout>
  );
}

export default IntegrationsSettings;
