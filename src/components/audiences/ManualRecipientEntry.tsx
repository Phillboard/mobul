import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, Trash2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAudiences } from "@/hooks/useAudiences";
import { z } from "zod";

const recipientSchema = z.object({
  first_name: z.string().trim().max(100, "First name must be less than 100 characters").optional(),
  last_name: z.string().trim().max(100, "Last name must be less than 100 characters").optional(),
  company: z.string().trim().max(200, "Company must be less than 200 characters").optional(),
  address1: z.string().trim().min(1, "Address is required").max(200, "Address must be less than 200 characters"),
  address2: z.string().trim().max(200, "Address 2 must be less than 200 characters").optional(),
  city: z.string().trim().min(1, "City is required").max(100, "City must be less than 100 characters"),
  state: z.string().trim().min(2, "State is required").max(2, "State must be 2 characters").toUpperCase(),
  zip: z.string().trim().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
});

type RecipientFormData = z.infer<typeof recipientSchema>;

interface RecipientEntry extends RecipientFormData {
  id: string;
  errors?: Partial<Record<keyof RecipientFormData, string>>;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function ManualRecipientEntry() {
  const { toast } = useToast();
  const { currentClient } = useTenant();
  const { data: audiences, refetch: refetchAudiences } = useAudiences(currentClient?.id);
  
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<RecipientEntry[]>([
    { id: '1', first_name: '', last_name: '', address1: '', address2: '', city: '', state: '', zip: '', email: '', phone: '' }
  ]);
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [newAudienceName, setNewAudienceName] = useState('');
  const [selectedAudienceId, setSelectedAudienceId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAnother = () => {
    if (recipients.length >= 10) {
      toast({
        title: "Maximum reached",
        description: "You can add up to 10 recipients at a time",
        variant: "destructive",
      });
      return;
    }
    
    setRecipients([
      ...recipients,
      { 
        id: Date.now().toString(), 
        first_name: '', 
        last_name: '', 
        address1: '', 
        address2: '', 
        city: '', 
        state: '', 
        zip: '', 
        email: '', 
        phone: '' 
      }
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    if (recipients.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one recipient is required",
        variant: "destructive",
      });
      return;
    }
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof RecipientFormData, value: string) => {
    setRecipients(recipients.map(r => 
      r.id === id ? { ...r, [field]: value, errors: { ...r.errors, [field]: undefined } } : r
    ));
  };

  const validateRecipients = (): boolean => {
    let isValid = true;
    const updatedRecipients = recipients.map(recipient => {
      const { errors, ...data } = recipient;
      
      try {
        recipientSchema.parse(data);
        return { ...recipient, errors: undefined };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Partial<Record<keyof RecipientFormData, string>> = {};
          error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as keyof RecipientFormData] = err.message;
            }
          });
          isValid = false;
          return { ...recipient, errors: fieldErrors };
        }
        return recipient;
      }
    });

    setRecipients(updatedRecipients);
    return isValid;
  };

  const handleSave = async () => {
    if (!currentClient) {
      toast({
        title: "No client selected",
        description: "Please select a client from the sidebar",
        variant: "destructive",
      });
      return;
    }

    if (!validateRecipients()) {
      toast({
        title: "Validation errors",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    if (saveMode === 'new' && !newAudienceName.trim()) {
      toast({
        title: "Audience name required",
        description: "Please enter a name for the new audience",
        variant: "destructive",
      });
      return;
    }

    if (saveMode === 'existing' && !selectedAudienceId) {
      toast({
        title: "Audience required",
        description: "Please select an audience",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let audienceId = selectedAudienceId;

      // Create new audience if needed
      if (saveMode === 'new') {
        const { data: newAudience, error: audienceError } = await supabase
          .from('audiences')
          .insert({
            client_id: currentClient.id,
            name: newAudienceName.trim(),
            source: 'manual',
            total_count: recipients.length,
            valid_count: recipients.length,
            invalid_count: 0,
            status: 'ready',
          })
          .select()
          .single();

        if (audienceError) throw audienceError;
        audienceId = newAudience.id;
      } else {
        // Update existing audience counts
        const { data: existingAudience } = await supabase
          .from('audiences')
          .select('total_count, valid_count')
          .eq('id', audienceId)
          .single();

        if (existingAudience) {
          await supabase
            .from('audiences')
            .update({
              total_count: existingAudience.total_count + recipients.length,
              valid_count: existingAudience.valid_count + recipients.length,
            })
            .eq('id', audienceId);
        }
      }

      // Insert recipients
      const recipientRecords = recipients.map(({ id, errors, ...data }) => ({
        audience_id: audienceId,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        company: data.company || null,
        address1: data.address1,
        address2: data.address2 || null,
        city: data.city,
        state: data.state,
        zip: data.zip,
        email: data.email || null,
        phone: data.phone || null,
        token: generateToken(),
        validation_status: 'valid' as const,
      }));

      const { error: recipientsError } = await supabase
        .from('recipients')
        .insert(recipientRecords);

      if (recipientsError) throw recipientsError;

      toast({
        title: "Recipients added",
        description: `${recipients.length} recipient${recipients.length > 1 ? 's' : ''} added successfully`,
      });

      // Reset form
      setRecipients([
        { id: '1', first_name: '', last_name: '', address1: '', address2: '', city: '', state: '', zip: '', email: '', phone: '' }
      ]);
      setNewAudienceName('');
      setSelectedAudienceId('');
      setOpen(false);
      
      // Refresh audiences list
      refetchAudiences();

    } catch (error: any) {
      console.error('Error saving recipients:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save recipients",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Recipients Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipients Manually</DialogTitle>
          <DialogDescription>
            Add up to 10 recipients at a time. Perfect for test campaigns and small VIP lists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Save Mode Selection */}
          <div className="space-y-3">
            <Label>Save to</Label>
            <div className="flex gap-2">
              <Button
                variant={saveMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaveMode('new')}
              >
                New Audience
              </Button>
              <Button
                variant={saveMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaveMode('existing')}
                disabled={!audiences || audiences.length === 0}
              >
                Existing Audience
              </Button>
            </div>

            {saveMode === 'new' ? (
              <Input
                placeholder="Audience name (e.g., VIP Test List)"
                value={newAudienceName}
                onChange={(e) => setNewAudienceName(e.target.value)}
              />
            ) : (
              <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {audiences?.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name} ({audience.total_count} recipients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recipients Forms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Recipients ({recipients.length}/10)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAnother}
                disabled={recipients.length >= 10}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another
              </Button>
            </div>

            {recipients.map((recipient, index) => (
              <div key={recipient.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Recipient {index + 1}</Badge>
                  {recipients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRecipient(recipient.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`first_name_${recipient.id}`}>First Name</Label>
                    <Input
                      id={`first_name_${recipient.id}`}
                      value={recipient.first_name}
                      onChange={(e) => handleFieldChange(recipient.id, 'first_name', e.target.value)}
                      className={recipient.errors?.first_name ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.first_name && (
                      <p className="text-xs text-destructive">{recipient.errors.first_name}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`last_name_${recipient.id}`}>Last Name</Label>
                    <Input
                      id={`last_name_${recipient.id}`}
                      value={recipient.last_name}
                      onChange={(e) => handleFieldChange(recipient.id, 'last_name', e.target.value)}
                      className={recipient.errors?.last_name ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.last_name && (
                      <p className="text-xs text-destructive">{recipient.errors.last_name}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`address1_${recipient.id}`}>Address *</Label>
                    <Input
                      id={`address1_${recipient.id}`}
                      value={recipient.address1}
                      onChange={(e) => handleFieldChange(recipient.id, 'address1', e.target.value)}
                      placeholder="123 Main St"
                      className={recipient.errors?.address1 ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.address1 && (
                      <p className="text-xs text-destructive">{recipient.errors.address1}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`address2_${recipient.id}`}>Address 2</Label>
                    <Input
                      id={`address2_${recipient.id}`}
                      value={recipient.address2}
                      onChange={(e) => handleFieldChange(recipient.id, 'address2', e.target.value)}
                      placeholder="Suite 100"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`city_${recipient.id}`}>City *</Label>
                    <Input
                      id={`city_${recipient.id}`}
                      value={recipient.city}
                      onChange={(e) => handleFieldChange(recipient.id, 'city', e.target.value)}
                      className={recipient.errors?.city ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.city && (
                      <p className="text-xs text-destructive">{recipient.errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`state_${recipient.id}`}>State *</Label>
                    <Input
                      id={`state_${recipient.id}`}
                      value={recipient.state}
                      onChange={(e) => handleFieldChange(recipient.id, 'state', e.target.value.toUpperCase())}
                      placeholder="TX"
                      maxLength={2}
                      className={recipient.errors?.state ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.state && (
                      <p className="text-xs text-destructive">{recipient.errors.state}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`zip_${recipient.id}`}>ZIP Code *</Label>
                    <Input
                      id={`zip_${recipient.id}`}
                      value={recipient.zip}
                      onChange={(e) => handleFieldChange(recipient.id, 'zip', e.target.value)}
                      placeholder="78701"
                      maxLength={5}
                      className={recipient.errors?.zip ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.zip && (
                      <p className="text-xs text-destructive">{recipient.errors.zip}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`email_${recipient.id}`}>Email</Label>
                    <Input
                      id={`email_${recipient.id}`}
                      type="email"
                      value={recipient.email}
                      onChange={(e) => handleFieldChange(recipient.id, 'email', e.target.value)}
                      placeholder="john@example.com"
                      className={recipient.errors?.email ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.email && (
                      <p className="text-xs text-destructive">{recipient.errors.email}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`phone_${recipient.id}`}>Phone</Label>
                    <Input
                      id={`phone_${recipient.id}`}
                      value={recipient.phone}
                      onChange={(e) => handleFieldChange(recipient.id, 'phone', e.target.value)}
                      placeholder="512-555-0100"
                      className={recipient.errors?.phone ? 'border-destructive' : ''}
                    />
                    {recipient.errors?.phone && (
                      <p className="text-xs text-destructive">{recipient.errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Recipients
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
