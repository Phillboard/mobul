import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { UserPlus, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useToast } from '@shared/hooks';
import { supabase } from '@core/services/supabase';
import { useTenant } from '@app/providers/TenantProvider';
import { useQuery } from "@tanstack/react-query";

const recipientSchema = z.object({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  address1: z.string().trim().min(1, "Address is required").max(255),
  address2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().length(2, "State must be 2 characters").toUpperCase(),
  zip: z.string().trim().regex(/^\d{5}$/, "ZIP must be 5 digits"),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
});

type RecipientFormData = z.infer<typeof recipientSchema>;

interface Recipient extends RecipientFormData {
  id: string;
}

export function ManualRecipientEntry() {
  const { currentClient } = useTenant();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [audienceMode, setAudienceMode] = useState<"new" | "existing">("new");
  const [newAudienceName, setNewAudienceName] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: audiences } = useQuery({
    queryKey: ['audiences', currentClient?.id],
    queryFn: async () => {
      if (!currentClient) return [];
      
      const { data, error } = await supabase
        .from('audiences')
        .select('id, name, status')
        .eq('client_id', currentClient.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentClient && open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecipientFormData>({
    resolver: zodResolver(recipientSchema),
  });

  const onAddRecipient = (data: RecipientFormData) => {
    if (recipients.length >= 10) {
      toast({
        title: "Limit reached",
        description: "You can add up to 10 recipients at a time",
        variant: "destructive",
      });
      return;
    }

    const newRecipient: Recipient = {
      ...data,
      id: crypto.randomUUID(),
      email: data.email || undefined,
      phone: data.phone || undefined,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      address2: data.address2 || undefined,
    };

    setRecipients([...recipients, newRecipient]);
    reset();
    toast({
      title: "Recipient added",
      description: "Add another or save to audience",
    });
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleSave = async () => {
    if (!currentClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (audienceMode === "new" && !newAudienceName.trim()) {
      toast({
        title: "Missing audience name",
        description: "Please enter a name for the new audience",
        variant: "destructive",
      });
      return;
    }

    if (audienceMode === "existing" && !selectedAudienceId) {
      toast({
        title: "No audience selected",
        description: "Please select an audience",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let audienceId = selectedAudienceId;

      // Create new audience if needed
      if (audienceMode === "new") {
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
        const { data: existingAudience, error: fetchError } = await supabase
          .from('audiences')
          .select('total_count, valid_count')
          .eq('id', audienceId)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from('audiences')
          .update({
            total_count: (existingAudience.total_count || 0) + recipients.length,
            valid_count: (existingAudience.valid_count || 0) + recipients.length,
          })
          .eq('id', audienceId);

        if (updateError) throw updateError;
      }

      // Insert recipients
      const recipientRecords = recipients.map(recipient => ({
        audience_id: audienceId,
        first_name: recipient.first_name || null,
        last_name: recipient.last_name || null,
        address1: recipient.address1,
        address2: recipient.address2 || null,
        city: recipient.city,
        state: recipient.state,
        zip: recipient.zip,
        email: recipient.email || null,
        phone: recipient.phone || null,
        token: generateToken(),
        validation_status: 'valid' as const,
      }));

      const { error: insertError } = await supabase
        .from('recipients')
        .insert(recipientRecords);

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: `${recipients.length} recipient(s) added to audience`,
      });

      // Reset form
      setRecipients([]);
      setNewAudienceName("");
      setSelectedAudienceId("");
      setOpen(false);
    } catch (error: any) {
      console.error('Save error:', error);
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Recipients Manually</DialogTitle>
          <DialogDescription>
            Add up to 10 recipients at a time. Perfect for test campaigns and VIP lists.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Audience Selection */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Save to</Label>
                  <Select value={audienceMode} onValueChange={(value: "new" | "existing") => setAudienceMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Audience</SelectItem>
                      <SelectItem value="existing">Existing Audience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audienceMode === "new" ? (
                  <div className="space-y-2">
                    <Label htmlFor="audience-name">Audience Name</Label>
                    <Input
                      id="audience-name"
                      placeholder="e.g., VIP List 2024"
                      value={newAudienceName}
                      onChange={(e) => setNewAudienceName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Audience</Label>
                    <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences?.map((audience) => (
                          <SelectItem key={audience.id} value={audience.id}>
                            {audience.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Recipient Form */}
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onAddRecipient)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input id="first_name" {...register("first_name")} />
                      {errors.first_name && (
                        <p className="text-sm text-destructive">{errors.first_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input id="last_name" {...register("last_name")} />
                      {errors.last_name && (
                        <p className="text-sm text-destructive">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address1">Address Line 1 *</Label>
                    <Input id="address1" {...register("address1")} />
                    {errors.address1 && (
                      <p className="text-sm text-destructive">{errors.address1.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address2">Address Line 2</Label>
                    <Input id="address2" {...register("address2")} />
                    {errors.address2 && (
                      <p className="text-sm text-destructive">{errors.address2.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" {...register("city")} />
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input id="state" placeholder="TX" maxLength={2} {...register("state")} />
                      {errors.state && (
                        <p className="text-sm text-destructive">{errors.state.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP *</Label>
                      <Input id="zip" placeholder="78701" maxLength={5} {...register("zip")} />
                      {errors.zip && (
                        <p className="text-sm text-destructive">{errors.zip.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" {...register("phone")} />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Recipient ({recipients.length}/10)
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recipients List */}
            {recipients.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Recipients to Add ({recipients.length})</Label>
                    <div className="space-y-2">
                      {recipients.map((recipient, index) => (
                        <div key={recipient.id}>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div className="flex-1 text-sm">
                              <p className="font-medium">
                                {[recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || 'No name'}
                              </p>
                              <p className="text-muted-foreground">
                                {recipient.address1}, {recipient.city}, {recipient.state} {recipient.zip}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRecipient(recipient.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {index < recipients.length - 1 && <Separator className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={recipients.length === 0 || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
