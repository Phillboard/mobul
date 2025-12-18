/**
 * AdminMessagingTest
 * 
 * Admin page for testing SMS and Email delivery systems.
 * Provides diagnostic tools for verifying provider configuration,
 * testing message delivery, and troubleshooting issues.
 */

import { useState } from 'react';
import { Layout } from '@/shared/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { MessageSquare, Mail, Settings2 } from 'lucide-react';
import { SMSTestPanel } from '@/features/admin/components/messaging/SMSTestPanel';
import { EmailTestPanel } from '@/features/admin/components/messaging/EmailTestPanel';
import { SMSProviderSettingsPanel } from '@/features/admin/components/messaging/SMSProviderSettingsPanel';

export default function AdminMessagingTest() {
  const [activeTab, setActiveTab] = useState('sms');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Messaging Test</h1>
          <p className="text-muted-foreground mt-2">
            Test SMS and Email delivery systems, view provider status, and troubleshoot issues
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Testing
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Testing
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Provider Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="mt-6">
            <SMSTestPanel />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <EmailTestPanel />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SMSProviderSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
