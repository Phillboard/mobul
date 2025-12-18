/**
 * Automation Builder
 * 
 * Visual builder for marketing automation workflows.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/shared/components/ui/select";
import { 
  ArrowLeft, Plus, Trash2, Save, Loader2, Mail, 
  MessageSquare, Clock, Zap, Gift, FileText, UserCheck, 
  GripVertical, ArrowDown
} from "lucide-react";
import { TriggerSelector } from "./TriggerSelector";
import { useCreateAutomation, useUpdateAutomation } from "../../hooks/useMarketingAutomations";
import { useMessageTemplates } from "@/features/settings/hooks/useMessageTemplates";
import type { 
  MarketingAutomationWithSteps, 
  TriggerType, 
  StepType, 
  AutomationTriggerConfig,
  AutomationStepConfig,
  AutomationBuilderFormData 
} from "../../types";

interface Props {
  automation?: MarketingAutomationWithSteps | null;
  isEdit?: boolean;
}

const stepTypeOptions: { type: StepType; icon: React.ReactNode; title: string }[] = [
  { type: 'send_email', icon: <Mail className="h-4 w-4 text-blue-500" />, title: 'Send Email' },
  { type: 'send_sms', icon: <MessageSquare className="h-4 w-4 text-green-500" />, title: 'Send SMS' },
  { type: 'wait', icon: <Clock className="h-4 w-4 text-orange-500" />, title: 'Wait' },
];

interface StepFormData {
  step_type: StepType;
  template_id?: string;
  config: AutomationStepConfig;
}

export function AutomationBuilder({ automation, isEdit }: Props) {
  const navigate = useNavigate();
  
  const [name, setName] = useState(automation?.name || '');
  const [description, setDescription] = useState(automation?.description || '');
  const [triggerType, setTriggerType] = useState<TriggerType>(automation?.trigger_type || 'mail_campaign_sent');
  const [triggerConfig, setTriggerConfig] = useState<AutomationTriggerConfig>(automation?.trigger_config || {});
  const [steps, setSteps] = useState<StepFormData[]>(
    automation?.steps?.map(s => ({
      step_type: s.step_type,
      template_id: s.template_id || undefined,
      config: s.config,
    })) || []
  );

  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  
  const { templates: emailTemplates } = useMessageTemplates('email');
  const { templates: smsTemplates } = useMessageTemplates('sms');

  const addStep = (type: StepType) => {
    setSteps([...steps, { 
      step_type: type, 
      config: type === 'wait' ? { delayMinutes: 60 } : {} 
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<StepFormData>) => {
    setSteps(steps.map((step, i) => i === index ? { ...step, ...updates } : step));
  };

  const handleSubmit = async () => {
    try {
      if (isEdit && automation) {
        await updateMutation.mutateAsync({
          id: automation.id,
          name,
          description,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          steps: steps.map((step, index) => ({
            step_order: index + 1,
            step_type: step.step_type,
            template_id: step.template_id,
            config: step.config,
          })),
        });
      }
      navigate('/marketing/automations');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isValid = name && triggerType && steps.length > 0;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/automations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? 'Edit Automation' : 'Create Automation'}
            </h1>
            <p className="text-muted-foreground">
              Build an automated marketing workflow
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Automation
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Sequence"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this automation does..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
          <CardDescription>What starts this automation?</CardDescription>
        </CardHeader>
        <CardContent>
          <TriggerSelector
            triggerType={triggerType}
            triggerConfig={triggerConfig}
            onChange={(type, config) => {
              setTriggerType(type);
              setTriggerConfig(config);
            }}
          />
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
          <CardDescription>Add actions to execute in sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Steps List */}
          {steps.length > 0 && (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index}>
                  {/* Connector */}
                  {index > 0 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Step Card */}
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            {step.step_type === 'send_email' && <Mail className="h-4 w-4 text-blue-500" />}
                            {step.step_type === 'send_sms' && <MessageSquare className="h-4 w-4 text-green-500" />}
                            {step.step_type === 'wait' && <Clock className="h-4 w-4 text-orange-500" />}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {step.step_type === 'send_email' && 'Send Email'}
                              {step.step_type === 'send_sms' && 'Send SMS'}
                              {step.step_type === 'wait' && 'Wait'}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeStep(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          {/* Step Configuration */}
                          {step.step_type === 'send_email' && (
                            <div className="space-y-2">
                              <Label>Email Template</Label>
                              <Select
                                value={step.template_id}
                                onValueChange={(value) => updateStep(index, { template_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {emailTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {step.step_type === 'send_sms' && (
                            <div className="space-y-2">
                              <Label>SMS Template</Label>
                              <Select
                                value={step.template_id}
                                onValueChange={(value) => updateStep(index, { template_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select template..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {smsTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {step.step_type === 'wait' && (
                            <div className="flex items-center gap-3">
                              <div className="space-y-2">
                                <Label>Duration</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={step.config.delayMinutes || 60}
                                  onChange={(e) => updateStep(index, { 
                                    config: { ...step.config, delayMinutes: parseInt(e.target.value) || 60 }
                                  })}
                                  className="w-24"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select
                                  value={
                                    (step.config.delayMinutes || 60) >= 1440 ? 'days' :
                                    (step.config.delayMinutes || 60) >= 60 ? 'hours' : 'minutes'
                                  }
                                  onValueChange={(unit) => {
                                    const baseValue = step.config.delayMinutes || 60;
                                    let minutes = baseValue;
                                    if (unit === 'days') minutes = Math.round(baseValue / 1440) * 1440 || 1440;
                                    else if (unit === 'hours') minutes = Math.round(baseValue / 60) * 60 || 60;
                                    else minutes = baseValue < 60 ? baseValue : Math.round(baseValue / 60) || 1;
                                    updateStep(index, { config: { ...step.config, delayMinutes: minutes }});
                                  }}
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Add Step Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            <span className="text-sm text-muted-foreground mr-2">Add step:</span>
            {stepTypeOptions.map((option) => (
              <Button
                key={option.type}
                variant="outline"
                size="sm"
                onClick={() => addStep(option.type)}
              >
                {option.icon}
                <span className="ml-2">{option.title}</span>
              </Button>
            ))}
          </div>

          {steps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Add steps to your automation workflow</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
