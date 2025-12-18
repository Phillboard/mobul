/**
 * Marketing Automation Detail Page
 */

import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  ArrowLeft, Edit, Trash2, Zap, Mail, MessageSquare, 
  Clock, Users, CheckCircle, XCircle, PlayCircle, Gift, FileText, UserCheck
} from "lucide-react";
import { 
  useMarketingAutomation, 
  useDeleteAutomation,
  useToggleAutomation,
  useAutomationStats,
  useAutomationEnrollments
} from "@/features/marketing/hooks/useMarketingAutomations";
import type { TriggerType, StepType } from "@/features/marketing/types";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";

const triggerLabels: Record<TriggerType, string> = {
  mail_campaign_sent: 'Mail Campaign Sent',
  mail_campaign_delivered: 'Mail Delivered',
  gift_card_redeemed: 'Gift Card Redeemed',
  form_submitted: 'Form Submitted',
  recipient_approved: 'Recipient Approved',
  manual: 'Manual Trigger',
};

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  mail_campaign_sent: <Mail className="h-4 w-4" />,
  mail_campaign_delivered: <Mail className="h-4 w-4" />,
  gift_card_redeemed: <Gift className="h-4 w-4" />,
  form_submitted: <FileText className="h-4 w-4" />,
  recipient_approved: <UserCheck className="h-4 w-4" />,
  manual: <Zap className="h-4 w-4" />,
};

const stepTypeLabels: Record<StepType, string> = {
  send_email: 'Send Email',
  send_sms: 'Send SMS',
  wait: 'Wait',
  condition: 'Condition',
};

const stepTypeIcons: Record<StepType, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4 text-blue-500" />,
  send_sms: <MessageSquare className="h-4 w-4 text-green-500" />,
  wait: <Clock className="h-4 w-4 text-orange-500" />,
  condition: <Zap className="h-4 w-4 text-purple-500" />,
};

export default function MarketingAutomationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: automation, isLoading } = useMarketingAutomation(id);
  const { data: stats } = useAutomationStats(id);
  const { data: enrollments } = useAutomationEnrollments(id);
  
  const deleteMutation = useDeleteAutomation();
  const toggleMutation = useToggleAutomation();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">Loading automation...</div>
        </div>
      </Layout>
    );
  }

  if (!automation) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Automation not found</h2>
            <Button onClick={() => navigate('/marketing')}>Back to Marketing</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(automation.id);
    navigate('/marketing/automations');
  };

  const handleToggle = () => {
    toggleMutation.mutate({ id: automation.id, isActive: !automation.is_active });
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/automations')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Zap className={`h-5 w-5 ${automation.is_active ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <h1 className="text-2xl font-bold">{automation.name}</h1>
                <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                  {automation.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {automation.description && (
                <p className="text-muted-foreground mt-1">{automation.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active</span>
              <Switch
                checked={automation.is_active}
                onCheckedChange={handleToggle}
              />
            </div>
            <Button variant="outline" onClick={() => navigate(`/marketing/automations/${automation.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
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
                  <AlertDialogTitle>Delete Automation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this automation? This will stop all active enrollments.
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
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Enrolled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automation.total_enrolled.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_count || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automation.total_completed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.completion_rate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.failed_count || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.cancelled_count || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="workflow">
          <TabsList>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="enrollments">
              Enrollments
              <Badge variant="secondary" className="ml-2">{enrollments?.total || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Trigger */}
              <Card>
                <CardHeader>
                  <CardTitle>Trigger</CardTitle>
                  <CardDescription>When this automation starts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                    <div className="p-2 rounded-full bg-primary/10">
                      {triggerIcons[automation.trigger_type]}
                    </div>
                    <div>
                      <p className="font-medium">{triggerLabels[automation.trigger_type]}</p>
                      <p className="text-sm text-muted-foreground">
                        {automation.trigger_config.allCampaigns 
                          ? 'All campaigns'
                          : automation.trigger_config.campaignId 
                            ? 'Specific campaign'
                            : 'Configured trigger'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{format(new Date(automation.created_at), 'PPp')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{format(new Date(automation.updated_at), 'PPp')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Steps</span>
                    <span className="font-medium">{automation.steps?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
                <CardDescription>Actions performed in sequence</CardDescription>
              </CardHeader>
              <CardContent>
                {automation.steps && automation.steps.length > 0 ? (
                  <div className="relative">
                    {automation.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-start gap-4 pb-8 last:pb-0">
                        {/* Connector line */}
                        {idx < automation.steps.length - 1 && (
                          <div className="absolute left-5 top-10 w-0.5 h-[calc(100%-3rem)] bg-border" style={{ top: `${idx * 80 + 40}px`, height: '60px' }} />
                        )}
                        
                        {/* Step indicator */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 bg-background flex items-center justify-center z-10">
                          {stepTypeIcons[step.step_type]}
                        </div>
                        
                        {/* Step content */}
                        <div className="flex-1 p-4 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stepTypeLabels[step.step_type]}</span>
                              <Badge variant="outline">Step {idx + 1}</Badge>
                            </div>
                            {step.step_type === 'wait' && step.config.delayMinutes && (
                              <span className="text-sm text-muted-foreground">
                                Wait {step.config.delayMinutes >= 1440 
                                  ? `${Math.floor(step.config.delayMinutes / 1440)} day(s)`
                                  : step.config.delayMinutes >= 60
                                    ? `${Math.floor(step.config.delayMinutes / 60)} hour(s)`
                                    : `${step.config.delayMinutes} minute(s)`
                                }
                              </span>
                            )}
                          </div>
                          {(step.step_type === 'send_email' || step.step_type === 'send_sms') && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {step.template_id ? 'Using template' : 'Custom message'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No steps configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments">
            <Card>
              <CardHeader>
                <CardTitle>Enrollments</CardTitle>
                <CardDescription>Contacts currently in this automation</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments && enrollments.enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {enrollments.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">
                              {enrollment.contacts?.first_name} {enrollment.contacts?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {enrollment.contacts?.email || enrollment.contacts?.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">Step {enrollment.current_step + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              Enrolled {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant={
                            enrollment.status === 'completed' ? 'default' :
                            enrollment.status === 'active' ? 'secondary' :
                            enrollment.status === 'failed' ? 'destructive' :
                            'outline'
                          }>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No enrollments yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Recent automation activity</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Activity log coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
