import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Phone, Settings, Check, X, Plus } from "lucide-react";
import { useTrackedNumbers, useUpdateTrackedNumber } from '@/features/settings/hooks';
import { useTenant } from '@/contexts/TenantContext';
import { ProvisionNumberDialog } from "./ProvisionNumberDialog";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";

export function PhoneNumbersSettings() {
  const { currentClient } = useTenant();
  const { data: numbers, isLoading, refetch } = useTrackedNumbers(currentClient?.id || null);
  const updateNumber = useUpdateTrackedNumber();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    forward_to_number: '',
    recording_enabled: true,
    friendly_name: '',
  });

  const handleEdit = (number: any) => {
    setEditingId(number.id);
    setEditForm({
      forward_to_number: number.forward_to_number || '',
      recording_enabled: number.recording_enabled !== false,
      friendly_name: number.friendly_name || '',
    });
  };

  const handleSave = async (id: string) => {
    await updateNumber.mutateAsync({ id, updates: editForm });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleRelease = async (phoneNumberId: string) => {
    if (!confirm('Are you sure you want to release this phone number? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('release-twilio-number', {
        body: { phoneNumberId },
      });

      if (error) throw error;
      
      toast.success('Phone number released successfully');
      refetch();
    } catch (error: any) {
      toast.error(`Failed to release number: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div>Loading phone numbers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phone Numbers</h2>
          <p className="text-muted-foreground">
            Manage tracked phone numbers for call tracking
          </p>
        </div>
        <Button onClick={() => setProvisionDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Provision Number
        </Button>
      </div>

      <div className="grid gap-4">
        {numbers?.map((number) => (
          <Card key={number.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{number.phone_number}</CardTitle>
                    <CardDescription>
                      {number.friendly_name || 'No name set'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={number.status === 'assigned' ? 'default' : 'secondary'}>
                    {number.status}
                  </Badge>
                  {editingId === number.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleSave(number.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(number)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      {number.status !== 'released' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRelease(number.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Release
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {editingId === number.id && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`friendly-name-${number.id}`}>Friendly Name</Label>
                  <Input
                    id={`friendly-name-${number.id}`}
                    value={editForm.friendly_name}
                    onChange={(e) => setEditForm({ ...editForm, friendly_name: e.target.value })}
                    placeholder="e.g., Spring Campaign Line"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`forward-to-${number.id}`}>Forward Calls To</Label>
                  <Input
                    id={`forward-to-${number.id}`}
                    value={editForm.forward_to_number}
                    onChange={(e) => setEditForm({ ...editForm, forward_to_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                  <p className="text-sm text-muted-foreground">
                    Phone number where calls should be forwarded
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`recording-${number.id}`}>Call Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Record all calls for quality and compliance
                    </p>
                  </div>
                  <Switch
                    id={`recording-${number.id}`}
                    checked={editForm.recording_enabled}
                    onCheckedChange={(checked) => 
                      setEditForm({ ...editForm, recording_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            )}

            {editingId !== number.id && (
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Forward To:</span>
                  <span className="font-medium">{number.forward_to_number || 'Not configured'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recording:</span>
                  <span className="font-medium">
                    {number.recording_enabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Cost:</span>
                  <span className="font-medium">${number.monthly_cost || '1.00'}</span>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {(!numbers || numbers.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No phone numbers yet. Numbers are automatically assigned when you create campaigns.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ProvisionNumberDialog
        open={provisionDialogOpen}
        onOpenChange={setProvisionDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
