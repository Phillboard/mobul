/**
 * Broadcast Builder Wizard
 * 
 * Enhanced wizard for creating broadcasts with:
 * - Multi-message sequences
 * - Custom content OR templates
 * - Delays between messages
 * - A/B testing
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Mail, MessageSquare, Send, Users, Calendar, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { CampaignType, MarketingMessage } from "@/features/marketing/types";
import { MessageSequenceTimeline } from "./MessageSequenceTimeline";
import { AudienceSelector } from "../CampaignBuilder/AudienceSelector";
import { ScheduleSelector } from "../CampaignBuilder/ScheduleSelector";
import { useCreateMarketingCampaign } from "@/features/marketing/hooks";
import { toast } from "sonner";

type WizardStep = 'basics' | 'audience' | 'messages' | 'schedule' | 'review';

interface BroadcastFormData {
  name: string;
  description?: string;
  broadcast_type: CampaignType;
  audience_type: 'all_contacts' | 'contact_list' | 'segment' | 'manual';
  audience_config: any;
  messages: Partial<MarketingMessage>[];
  schedule_type: 'immediate' | 'scheduled';
  scheduled_at?: Date;
}

export function BroadcastBuilderWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [formData, setFormData] = useState<BroadcastFormData>({
    name: '',
    description: '',
    broadcast_type: 'email',
    audience_type: 'all_contacts',
    audience_config: {},
    messages: [],
    schedule_type: 'immediate',
  });

  const createMutation = useCreateMarketingCampaign();

  const steps: { id: WizardStep; label: string; icon: any }[] = [
    { id: 'basics', label: 'Basics', icon: Send },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'review', label: 'Review', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleMessagesChange = (messages: Partial<MarketingMessage>[]) => {
    setFormData(prev => ({ ...prev, messages }));
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Please enter a broadcast name');
        setCurrentStep('basics');
        return;
      }

      if (!formData.messages || formData.messages.length === 0) {
        toast.error('Please add at least one message');
        setCurrentStep('messages');
        return;
      }

      // Create the broadcast campaign
      const campaignData = {
        name: formData.name,
        description: formData.description,
        campaign_type: formData.broadcast_type,
        audience_type: formData.audience_type,
        audience_config: formData.audience_config,
        messages: formData.messages || [],
        scheduled_at: formData.schedule_type === 'scheduled' && formData.scheduled_at 
          ? formData.scheduled_at.toISOString() 
          : undefined,
        status: formData.schedule_type === 'scheduled' ? 'scheduled' : 'draft',
      };

      await createMutation.mutateAsync(campaignData as any);
      
      toast.success('Broadcast created successfully!');
      navigate('/marketing/broadcasts');
    } catch (error: any) {
      console.error('Error creating broadcast:', error);
      toast.error(error?.message || 'Failed to create broadcast');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Broadcast</h1>
          <p className="text-muted-foreground">
            Send one-time email or SMS to your contacts
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/marketing/broadcasts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive ? 'border-primary bg-primary text-primary-foreground' :
                  isCompleted ? 'border-primary bg-primary/10 text-primary' :
                  'border-muted text-muted-foreground'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-sm mt-2 ${isActive ? 'font-semibold' : ''}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <Separator className="flex-1 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 'basics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Broadcast Details</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Broadcast Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Monthly Newsletter, Product Launch Announcement"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this broadcast..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Broadcast Type *</Label>
                    <RadioGroup 
                      value={formData.broadcast_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, broadcast_type: value as CampaignType }))}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="email" id="type-email" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Email Only</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Send email message(s) to your contacts
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="sms" id="type-sms" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              <span className="font-medium">SMS Only</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Send SMS message(s) to your contacts
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="both" id="type-both" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex">
                                <Mail className="h-4 w-4 text-blue-500" />
                                <MessageSquare className="h-4 w-4 text-green-500 -ml-1" />
                              </div>
                              <span className="font-medium">Email + SMS</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Send both email and SMS (with optional delay)
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="sequence" id="type-sequence" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Send className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">Custom Sequence</span>
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Build your own multi-message sequence
                            </p>
                          </div>
                        </label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'audience' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Audience</h2>
              <AudienceSelector
                audienceType={formData.audience_type}
                audienceConfig={formData.audience_config}
                onChange={(type, config) => setFormData(prev => ({
                  ...prev,
                  audience_type: type,
                  audience_config: config,
                }))}
              />
            </div>
          )}

          {currentStep === 'messages' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Configure Messages</h2>
              <MessageSequenceTimeline
                broadcastType={formData.broadcast_type}
                messages={formData.messages}
                onMessagesChange={handleMessagesChange}
              />
            </div>
          )}

          {currentStep === 'schedule' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Schedule Broadcast</h2>
              <ScheduleSelector
                scheduleType={formData.schedule_type}
                scheduledAt={formData.scheduled_at}
                isFollowUp={false}
                onChange={(updates) => setFormData(prev => ({
                  ...prev,
                  ...updates,
                  schedule_type: updates.schedule_type || prev.schedule_type,
                  scheduled_at: updates.scheduled_at !== undefined ? updates.scheduled_at : prev.scheduled_at,
                }))}
              />
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review & Send</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Broadcast Details</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p><strong>Name:</strong> {formData.name}</p>
                    {formData.description && <p><strong>Description:</strong> {formData.description}</p>}
                    <p><strong>Type:</strong> <Badge>{formData.broadcast_type}</Badge></p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Messages</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p>{formData.messages.length} message(s) configured</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Schedule</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p>
                      {formData.schedule_type === 'immediate' ? 'Send immediately' : 
                       `Scheduled for ${formData.scheduled_at?.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep !== 'review' ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Broadcast'}
          </Button>
        )}
      </div>
    </div>
  );
}
