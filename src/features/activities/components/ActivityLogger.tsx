import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateActivity } from "@/hooks/useActivities";
import { useAuth } from '@core/auth/AuthProvider';

interface ActivityLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  campaignId?: string;
}

export function ActivityLogger({ 
  open, 
  onOpenChange, 
  clientId,
  contactId,
  companyId,
  dealId,
  campaignId
}: ActivityLoggerProps) {
  const { user } = useAuth();
  const createActivity = useCreateActivity();
  const [formData, setFormData] = useState({
    activity_type: 'call' as const,
    subject: '',
    description: '',
    outcome: '',
    direction: 'outbound' as const,
    duration_minutes: '',
    disposition: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createActivity.mutateAsync({
      client_id: clientId,
      user_id: user?.id,
      contact_id: contactId,
      company_id: companyId,
      deal_id: dealId,
      campaign_id: campaignId,
      activity_type: formData.activity_type,
      subject: formData.subject,
      description: formData.description || undefined,
      outcome: formData.outcome || undefined,
      direction: formData.direction,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
      disposition: formData.disposition || undefined,
      completed_at: new Date().toISOString(),
    });

    onOpenChange(false);
    setFormData({
      activity_type: 'call',
      subject: '',
      description: '',
      outcome: '',
      direction: 'outbound',
      duration_minutes: '',
      disposition: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select 
                value={formData.activity_type} 
                onValueChange={(value: any) => setFormData({ ...formData, activity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="postal_mail">Postal Mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select 
                value={formData.direction} 
                onValueChange={(value: any) => setFormData({ ...formData, direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Follow-up call regarding proposal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this activity..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Input
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                placeholder="e.g., Connected, Left voicemail"
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Disposition</Label>
            <Input
              value={formData.disposition}
              onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
              placeholder="e.g., Interested, Not interested, Call back later"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? "Logging..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
