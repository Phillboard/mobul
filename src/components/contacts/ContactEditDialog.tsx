import { useEffect, useState } from "react";
import { useContact, useUpdateContact } from "@/hooks/useContacts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContactFormData, LifecycleStage } from "@/types/contacts";

interface ContactEditDialogProps {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactEditDialog({
  contactId,
  open,
  onOpenChange,
}: ContactEditDialogProps) {
  const { data: contact } = useContact(contactId);
  const updateContact = useUpdateContact();
  const [formData, setFormData] = useState<ContactFormData>({});

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile_phone: contact.mobile_phone || "",
        company: contact.company || "",
        job_title: contact.job_title || "",
        address: contact.address || "",
        address2: contact.address2 || "",
        city: contact.city || "",
        state: contact.state || "",
        zip: contact.zip || "",
        lifecycle_stage: contact.lifecycle_stage as LifecycleStage,
        lead_source: contact.lead_source || "",
        lead_score: contact.lead_score || 0,
        do_not_contact: contact.do_not_contact || false,
        email_opt_out: contact.email_opt_out || false,
        sms_opt_out: contact.sms_opt_out || false,
        notes: contact.notes || "",
        custom_fields: (contact.custom_fields as Record<string, any>) || {},
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateContact.mutateAsync({ id: contactId, data: formData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_phone">Mobile Phone</Label>
                  <Input
                    id="mobile_phone"
                    value={formData.mobile_phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="lifecycle_stage">Lifecycle Stage</Label>
                <Select
                  value={formData.lifecycle_stage}
                  onValueChange={(value: LifecycleStage) =>
                    setFormData({ ...formData, lifecycle_stage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="mql">Marketing Qualified</SelectItem>
                    <SelectItem value="sql">Sales Qualified</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="evangelist">Evangelist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lead_source">Lead Source</Label>
                <Input
                  id="lead_source"
                  value={formData.lead_source || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lead_source: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="lead_score">Lead Score (0-100)</Label>
                <Input
                  id="lead_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.lead_score || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lead_score: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="do_not_contact"
                    checked={formData.do_not_contact}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, do_not_contact: checked as boolean })
                    }
                  />
                  <Label htmlFor="do_not_contact">Do Not Contact</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email_opt_out"
                    checked={formData.email_opt_out}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, email_opt_out: checked as boolean })
                    }
                  />
                  <Label htmlFor="email_opt_out">Email Opt-Out</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms_opt_out"
                    checked={formData.sms_opt_out}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, sms_opt_out: checked as boolean })
                    }
                  />
                  <Label htmlFor="sms_opt_out">SMS Opt-Out</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={8}
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add notes about this contact..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateContact.isPending}>
              {updateContact.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
