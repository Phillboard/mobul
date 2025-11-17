import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Send, 
  Users, 
  Gift, 
  Phone, 
  BarChart3, 
  Mail,
  Calendar,
  ExternalLink
} from "lucide-react";

interface ZapTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  trigger: string;
  actions: string[];
  useCases: string[];
  tier: 'free' | 'starter' | 'professional';
  difficulty: 'easy' | 'medium' | 'advanced';
}

const templates: ZapTemplate[] = [
  {
    id: 'lead-to-crm',
    name: 'Lead to CRM',
    description: 'Automatically create leads in your CRM when someone submits a form',
    icon: Users,
    trigger: 'lead.submitted',
    actions: ['Create lead in Salesforce', 'Create contact in HubSpot', 'Add to Pipedrive'],
    useCases: ['Sync leads to CRM', 'Update contact records', 'Trigger sales workflows'],
    tier: 'free',
    difficulty: 'easy',
  },
  {
    id: 'campaign-notifications',
    name: 'Campaign Notifications',
    description: 'Get instant notifications when campaigns are launched or completed',
    icon: Send,
    trigger: 'campaign.launched',
    actions: ['Send Slack message', 'Send Teams notification', 'Email team'],
    useCases: ['Team notifications', 'Campaign tracking', 'Status updates'],
    tier: 'free',
    difficulty: 'easy',
  },
  {
    id: 'gift-card-email',
    name: 'Gift Card Delivery',
    description: 'Send confirmation emails when gift cards are redeemed',
    icon: Gift,
    trigger: 'gift_card.redeemed',
    actions: ['Send Gmail', 'Send via SendGrid', 'Log in spreadsheet'],
    useCases: ['Customer confirmations', 'Redemption tracking', 'Thank you emails'],
    tier: 'starter',
    difficulty: 'easy',
  },
  {
    id: 'deal-tracking',
    name: 'Deal Pipeline Sync',
    description: 'Create deals automatically when appointments are set',
    icon: Phone,
    trigger: 'call.completed',
    actions: ['Create deal in CRM', 'Update contact status', 'Assign to sales rep'],
    useCases: ['Pipeline management', 'Sales automation', 'Lead qualification'],
    tier: 'starter',
    difficulty: 'medium',
  },
  {
    id: 'analytics-sheets',
    name: 'Analytics to Sheets',
    description: 'Track campaign performance in Google Sheets automatically',
    icon: BarChart3,
    trigger: 'campaign.completed',
    actions: ['Add row to Google Sheets', 'Update dashboard', 'Calculate ROI'],
    useCases: ['Reporting', 'Data analysis', 'Performance tracking'],
    tier: 'free',
    difficulty: 'easy',
  },
  {
    id: 'contact-sync',
    name: 'Two-Way Contact Sync',
    description: 'Keep contacts synchronized between ACE Engage and your CRM',
    icon: Users,
    trigger: 'Multiple events',
    actions: ['Bidirectional sync', 'Update both systems', 'Prevent duplicates'],
    useCases: ['Data consistency', 'CRM integration', 'Contact management'],
    tier: 'professional',
    difficulty: 'advanced',
  },
  {
    id: 'sms-notifications',
    name: 'SMS Notifications',
    description: 'Send SMS notifications when important conditions are met',
    icon: Send,
    trigger: 'condition.met',
    actions: ['Send SMS via Twilio', 'Send WhatsApp message', 'Queue message'],
    useCases: ['Customer notifications', 'Appointment reminders', 'Alerts'],
    tier: 'starter',
    difficulty: 'medium',
  },
  {
    id: 'calendar-appointments',
    name: 'Calendar Integration',
    description: 'Create calendar events when leads are qualified',
    icon: Calendar,
    trigger: 'lead.qualified',
    actions: ['Create Google Calendar event', 'Send Outlook invite', 'Block time'],
    useCases: ['Meeting scheduling', 'Appointment booking', 'Calendar management'],
    tier: 'starter',
    difficulty: 'medium',
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free': return 'default';
    case 'starter': return 'secondary';
    case 'professional': return 'outline';
    default: return 'default';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'default';
    case 'medium': return 'secondary';
    case 'advanced': return 'destructive';
    default: return 'default';
  }
};

export default function ZapierTemplates() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zapier Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Pre-built automation templates to connect ACE Engage with 6,000+ apps
          </p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Getting Started with Zapier</CardTitle>
                <CardDescription>
                  Choose a template below and follow the setup guide
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Select a template that matches your use case</li>
              <li>Click "Use This Template" to open setup instructions</li>
              <li>Create a free Zapier account if you don't have one</li>
              <li>Follow the step-by-step guide to connect your apps</li>
              <li>Test your Zap and turn it on</li>
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getTierColor(template.tier)}>
                        {template.tier}
                      </Badge>
                      <Badge variant={getDifficultyColor(template.difficulty)}>
                        {template.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">TRIGGER</p>
                    <Badge variant="outline" className="text-xs">
                      {template.trigger}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">ACTIONS</p>
                    <div className="flex flex-wrap gap-1">
                      {template.actions.map((action, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">USE CASES</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {template.useCases.map((useCase, idx) => (
                        <li key={idx}>• {useCase}</li>
                      ))}
                    </ul>
                  </div>

                  <Button className="w-full" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Resources to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto p-4" asChild>
                <a href="https://zapier.com" target="_blank" rel="noopener noreferrer">
                  <div className="text-left">
                    <div className="font-semibold">Zapier Documentation</div>
                    <div className="text-sm text-muted-foreground">Learn how Zapier works</div>
                  </div>
                </a>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4" asChild>
                <a href="/settings?tab=integrations" target="_blank" rel="noopener noreferrer">
                  <div className="text-left">
                    <div className="font-semibold">Manage Connections</div>
                    <div className="text-sm text-muted-foreground">View your active Zaps</div>
                  </div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
