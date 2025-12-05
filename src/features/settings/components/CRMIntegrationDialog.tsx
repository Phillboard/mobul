import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCRMIntegration, useUpdateCRMIntegration, useTestCRMWebhook } from "@/hooks/useCRMIntegrations";
import { useTenant } from '@app/providers/TenantProvider';
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const CRM_PROVIDERS = [
  { value: 'salesforce', label: 'Salesforce', icon: '🔷' },
  { value: 'hubspot', label: 'HubSpot', icon: '🟠' },
  { value: 'zoho', label: 'Zoho', icon: '🔴' },
  { value: 'gohighlevel', label: 'GoHighLevel', icon: '⚡' },
  { value: 'pipedrive', label: 'Pipedrive', icon: '🟢' },
  { value: 'custom', label: 'Custom Webhook', icon: '🔗' },
];

interface CRMIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: any;
}

export function CRMIntegrationDialog({ open, onOpenChange, integration }: CRMIntegrationDialogProps) {
  const { currentClient } = useTenant();
  const createIntegration = useCreateCRMIntegration();
  const updateIntegration = useUpdateCRMIntegration();
  const testWebhook = useTestCRMWebhook();

  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [fieldMappings, setFieldMappings] = useState({
    contact_id: 'Id',
    phone: 'Phone',
    email: 'Email',
    first_name: 'FirstName',
    last_name: 'LastName',
  });
  const [eventMappings, setEventMappings] = useState<any>({
    condition_2: {
      condition_number: 2,
      event_type: '',
      event_filter: {},
    },
    condition_3: {
      condition_number: 3,
      event_type: '',
      event_filter: {},
    },
  });
  const [generatedWebhookUrl, setGeneratedWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testPayload, setTestPayload] = useState('{}');

  useEffect(() => {
    if (integration) {
      setProvider(integration.crm_provider);
      setFieldMappings(integration.field_mappings);
      setEventMappings(integration.event_mappings);
      setGeneratedWebhookUrl(integration.webhook_url);
      setWebhookSecret(integration.webhook_secret);
    } else {
      // Reset for new integration
      setStep(1);
      setProvider('');
      setGeneratedWebhookUrl('');
      setWebhookSecret('');
    }
  }, [integration, open]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleCreate = async () => {
    if (!currentClient?.id) return;

    const result = await createIntegration.mutateAsync({
      client_id: currentClient.id,
      crm_provider: provider,
      field_mappings: fieldMappings,
      event_mappings: eventMappings,
    });

    setGeneratedWebhookUrl(result.webhook_url);
    setWebhookSecret(result.webhook_secret);
    setStep(5); // Go to test step
  };

  const handleUpdate = async () => {
    if (!integration?.id) return;

    await updateIntegration.mutateAsync({
      id: integration.id,
      updates: {
        field_mappings: fieldMappings,
        event_mappings: eventMappings,
      },
    });

    onOpenChange(false);
  };

  const handleTest = async () => {
    try {
      const payload = JSON.parse(testPayload);
      await testWebhook.mutateAsync({
        integrationId: integration?.id || generatedWebhookUrl.split('integration_id=')[1],
        testPayload: payload,
      });
    } catch (error) {
      toast.error('Invalid JSON payload');
    }
  };

  const getDefaultTestPayload = () => {
    const examples: Record<string, any> = {
      salesforce: {
        sobject: {
          Type: 'Event',
          WhoId: '003...',
          Phone: '555-123-4567',
          Email: 'test@example.com',
          Subject: 'Appointment',
          Status: 'Scheduled'
        }
      },
      hubspot: [{
        subscriptionType: 'deal.propertyChange',
        objectId: '12345',
        properties: {
          phone: '555-123-4567',
          email: 'test@example.com',
          dealstage: 'closedwon'
        }
      }],
      custom: {
        event_type: 'appointment.completed',
        contact_id: '123',
        phone: '555-123-4567',
        email: 'test@example.com'
      }
    };
    
    return JSON.stringify(examples[provider] || examples.custom, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {integration ? 'Edit CRM Integration' : 'Add CRM Integration'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Provider */}
        {step === 1 && (
          <div className="space-y-4">
            <Label>Select CRM Provider</Label>
            <div className="grid grid-cols-2 gap-3">
              {CRM_PROVIDERS.map((p) => (
                <Card
                  key={p.value}
                  className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                    provider === p.value ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setProvider(p.value);
                    setTestPayload(getDefaultTestPayload());
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                  </div>
                </Card>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!provider}
              className="w-full"
            >
              Next: Field Mapping
            </Button>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Map CRM Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the field names from your CRM that correspond to recipient data
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Contact ID Field</Label>
                <Input
                  value={fieldMappings.contact_id}
                  onChange={(e) => setFieldMappings({ ...fieldMappings, contact_id: e.target.value })}
                  placeholder="e.g., Id, contact_id"
                />
              </div>
              <div>
                <Label>Phone Field</Label>
                <Input
                  value={fieldMappings.phone}
                  onChange={(e) => setFieldMappings({ ...fieldMappings, phone: e.target.value })}
                  placeholder="e.g., Phone, phone_number"
                />
              </div>
              <div>
                <Label>Email Field</Label>
                <Input
                  value={fieldMappings.email}
                  onChange={(e) => setFieldMappings({ ...fieldMappings, email: e.target.value })}
                  placeholder="e.g., Email, email_address"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Next: Event Mapping
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Event Mapping */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Map Events to Conditions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure which CRM events trigger each condition
              </p>
            </div>
            
            <Card className="p-4">
              <Label className="text-base">Condition #2 Event</Label>
              <Input
                className="mt-2"
                value={eventMappings.condition_2?.event_type || ''}
                onChange={(e) => setEventMappings({
                  ...eventMappings,
                  condition_2: { ...eventMappings.condition_2, event_type: e.target.value }
                })}
                placeholder="e.g., Task Created, deal.propertyChange"
              />
              <Label className="text-sm text-muted-foreground mt-2">Event Filter (JSON)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                value={JSON.stringify(eventMappings.condition_2?.event_filter || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const filter = JSON.parse(e.target.value);
                    setEventMappings({
                      ...eventMappings,
                      condition_2: { ...eventMappings.condition_2, event_filter: filter }
                    });
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{ "Status": "Scheduled" }'
                rows={3}
              />
            </Card>

            <Card className="p-4">
              <Label className="text-base">Condition #3 Event</Label>
              <Input
                className="mt-2"
                value={eventMappings.condition_3?.event_type || ''}
                onChange={(e) => setEventMappings({
                  ...eventMappings,
                  condition_3: { ...eventMappings.condition_3, event_type: e.target.value }
                })}
                placeholder="e.g., Opportunity Updated, deal.won"
              />
              <Label className="text-sm text-muted-foreground mt-2">Event Filter (JSON)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                value={JSON.stringify(eventMappings.condition_3?.event_filter || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const filter = JSON.parse(e.target.value);
                    setEventMappings({
                      ...eventMappings,
                      condition_3: { ...eventMappings.condition_3, event_filter: filter }
                    });
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{ "StageName": "Closed Won" }'
                rows={3}
              />
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                {integration ? 'Save Changes' : 'Next: Webhook Setup'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Webhook Configuration */}
        {step === 4 && !integration && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Ready to Create Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click below to generate your webhook URL and secret
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleCreate} className="flex-1" disabled={createIntegration.isPending}>
                {createIntegration.isPending ? 'Creating...' : 'Create Integration'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Webhook Details & Test */}
        {(step === 5 || (step === 4 && integration)) && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Webhook Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add this webhook URL to your CRM
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={generatedWebhookUrl || integration?.webhook_url || ''}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedWebhookUrl || integration?.webhook_url, 'Webhook URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Webhook Secret</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={webhookSecret || integration?.webhook_secret || ''}
                    readOnly
                    type="password"
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookSecret || integration?.webhook_secret, 'Secret')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label>Test Webhook (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Send a test payload to verify the integration
              </p>
              <Textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="font-mono text-xs"
                rows={10}
              />
              <Button
                onClick={handleTest}
                className="w-full mt-2"
                variant="outline"
                disabled={testWebhook.isPending}
              >
                {testWebhook.isPending ? 'Sending...' : 'Send Test Webhook'}
              </Button>
            </div>

            <Button
              onClick={() => {
                if (integration) {
                  handleUpdate();
                } else {
                  onOpenChange(false);
                }
              }}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {integration ? 'Save Changes' : 'Complete Setup'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}