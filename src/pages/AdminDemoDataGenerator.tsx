/**
 * Admin Demo Data Generator Page
 * Main UI for generating complete client demo data scenarios
 */

import { useState } from 'react';
import { Layout } from '@/shared/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, Database, ExternalLink } from 'lucide-react';
import { useToast } from '@/shared/hooks';
import { useNavigate } from 'react-router-dom';
import type { DemoConfig, DemoGenerationResult, GenerationProgress } from '@/types/demo';
import { DEMO_TEMPLATES, getTemplate } from '@/features/admin/demo/demo-templates';
import { validateConfig, validateEnvironment } from '@/features/admin/demo/demo-validators';
import { DemoDataOrchestrator } from '@/features/admin/demo/demo-orchestrator';

export default function AdminDemoDataGenerator() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'config' | 'generating' | 'success'>('config');
  const [config, setConfig] = useState<Partial<DemoConfig>>({
    recipientCount: 15,
    mailDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    outcomes: {
      notCalled: 5,
      smsSent: 3,
      smsOptedIn: 2,
      redeemed: 2,
      declined: 3
    }
  });
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<DemoGenerationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleTemplateSelect = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setConfig({
        ...template.defaults,
        mailDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  };

  const handleGenerate = async () => {
    setErrors([]);

    // Validate environment
    const envValidation = await validateEnvironment();
    if (!envValidation.valid) {
      setErrors(envValidation.errors);
      return;
    }

    // Validate config
    const configValidation = validateConfig(config as DemoConfig);
    if (!configValidation.valid) {
      setErrors(configValidation.errors);
      return;
    }

    // Start generation
    setStep('generating');

    try {
      const orchestrator = new DemoDataOrchestrator(
        config as DemoConfig,
        (prog) => setProgress(prog)
      );

      const generationResult = await orchestrator.generate();
      setResult(generationResult);
      setStep('success');

      toast({
        title: 'Demo Data Generated!',
        description: `Successfully created ${generationResult.records.recipients} recipients for ${generationResult.clientName}`,
      });
    } catch (error: any) {
      setErrors([error.message]);
      setStep('config');
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateOutcome = (key: keyof typeof config.outcomes, value: number) => {
    const newOutcomes = { ...config.outcomes!, [key]: value };
    const total = Object.values(newOutcomes).reduce((sum, v) => sum + v, 0);
    
    setConfig({
      ...config,
      outcomes: newOutcomes,
      recipientCount: total
    });
  };

  if (step === 'generating' && progress) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Generating Demo Data...</h1>
            <p className="text-muted-foreground mt-2">Please wait while we create your demo scenario</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generation Progress</CardTitle>
              <CardDescription>Creating {config.clientName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress.overallProgress} className="h-2" />
              
              <div className="space-y-2">
                {progress.steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    {s.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {s.status === 'in_progress' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {s.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                    {s.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                    
                    <div className="flex-1">
                      <div className="font-medium">{s.label}</div>
                      {s.details && <div className="text-sm text-muted-foreground">{s.details}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 text-sm text-muted-foreground">
                Time Elapsed: {Math.floor(progress.timeElapsed / 1000)}s
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (step === 'success' && result) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Demo Data Generated Successfully!</h1>
            <p className="text-muted-foreground mt-2">Your test scenario is ready to use</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{result.clientName}</CardTitle>
              <CardDescription>{result.campaignName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">📊 What Was Created:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>Clients: <span className="font-bold">{result.records.clients}</span></div>
                  <div>Campaigns: <span className="font-bold">{result.records.campaigns}</span></div>
                  <div>Gift Card Pool: <span className="font-bold">{result.records.giftCardPools}</span></div>
                  <div>Gift Cards: <span className="font-bold">{result.records.giftCards}</span></div>
                  <div>Recipients: <span className="font-bold">{result.records.recipients}</span></div>
                  <div>Call Sessions: <span className="font-bold">{result.records.callSessions}</span></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">🎯 Test Codes You Can Use:</h3>
                <div className="space-y-4">
                  {result.testCodes.filter(c => c.status === 'not_contacted').slice(0, 3).length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Ready to Call:</div>
                      {result.testCodes.filter(c => c.status === 'not_contacted').slice(0, 3).map(code => (
                        <Badge key={code.code} variant="outline" className="mr-2 mb-2">
                          {code.code} - {code.firstName} {code.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {result.testCodes.filter(c => c.smsStatus === 'opted_in').length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-green-600">SMS Approved (Ready to Redeem):</div>
                      {result.testCodes.filter(c => c.smsStatus === 'opted_in').map(code => (
                        <Badge key={code.code} variant="default" className="mr-2 mb-2">
                          {code.code} - {code.firstName} {code.lastName} ✓
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">🚀 Next Steps:</div>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Call Center (/call-center)</li>
                    <li>Enter any code above</li>
                    <li>Walk through the complete workflow</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => navigate('/call-center')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Call Center
                </Button>
                <Button variant="outline" onClick={() => { setStep('config'); setResult(null); }}>
                  Generate More Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Demo Data Generator</h1>
          <p className="text-muted-foreground mt-2">Create realistic test data for specific clients</p>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Select Scenario Template</CardTitle>
            <CardDescription>Choose a pre-configured template or customize your own</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEMO_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-muted-foreground text-left mt-1">{template.description}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={config.clientName || ''}
                  onChange={(e) => setConfig({ ...config, clientName: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={config.campaignName || ''}
                  onChange={(e) => setConfig({ ...config, campaignName: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code Prefix</Label>
                  <Input
                    value={config.codePrefix || ''}
                    onChange={(e) => setConfig({ ...config, codePrefix: e.target.value.toUpperCase() })}
                    placeholder="PREM"
                  />
                </div>
                <div>
                  <Label>Gift Card Value</Label>
                  <Select
                    value={config.giftCardValue?.toString()}
                    onValueChange={(v) => setConfig({ ...config, giftCardValue: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">$25</SelectItem>
                      <SelectItem value="50">$50</SelectItem>
                      <SelectItem value="100">$100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Call Outcomes Distribution</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-xs">Not Called</Label>
                    <Input
                      type="number"
                      value={config.outcomes?.notCalled || 0}
                      onChange={(e) => updateOutcome('notCalled', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SMS Sent</Label>
                    <Input
                      type="number"
                      value={config.outcomes?.smsSent || 0}
                      onChange={(e) => updateOutcome('smsSent', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SMS Opted In</Label>
                    <Input
                      type="number"
                      value={config.outcomes?.smsOptedIn || 0}
                      onChange={(e) => updateOutcome('smsOptedIn', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Redeemed</Label>
                    <Input
                      type="number"
                      value={config.outcomes?.redeemed || 0}
                      onChange={(e) => updateOutcome('redeemed', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Total Recipients: {config.recipientCount}
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full" size="lg">
              <Database className="h-4 w-4 mr-2" />
              Generate Demo Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

