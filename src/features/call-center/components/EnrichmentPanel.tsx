import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Edit2, Save, X, CheckCircle2 } from "lucide-react";
import { useRecipientEnrichment } from '@/features/contacts/hooks';

interface EnrichmentPanelProps {
  recipient: {
    id: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    custom_fields?: Record<string, any>;
    last_enriched_at?: string;
    enriched_by_user_id?: string;
  };
}

export function EnrichmentPanel({ recipient }: EnrichmentPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: recipient.first_name || "",
    last_name: recipient.last_name || "",
    phone: recipient.phone || "",
    email: recipient.email || "",
    address: recipient.address || "",
    city: recipient.city || "",
    state: recipient.state || "",
    zip: recipient.zip || "",
  });
  const [verifiedFields, setVerifiedFields] = useState<string[]>([]);
  
  const enrichment = useRecipientEnrichment();

  const handleSave = () => {
    enrichment.mutate({
      recipientId: recipient.id,
      updates: formData,
      verifiedFields,
    }, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleCancel = () => {
    setFormData({
      first_name: recipient.first_name || "",
      last_name: recipient.last_name || "",
      phone: recipient.phone || "",
      email: recipient.email || "",
      address: recipient.address || "",
      city: recipient.city || "",
      state: recipient.state || "",
      zip: recipient.zip || "",
    });
    setIsEditing(false);
  };

  const toggleVerified = (field: string) => {
    setVerifiedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📝 Customer Information
          </CardTitle>
          {!isEditing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Enrich Data
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={enrichment.isPending}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">First Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={!isEditing}
                className="h-8 text-sm"
              />
              {isEditing && (
                <Checkbox
                  checked={verifiedFields.includes("first_name")}
                  onCheckedChange={() => toggleVerified("first_name")}
                />
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={!isEditing}
                className="h-8 text-sm"
              />
              {isEditing && (
                <Checkbox
                  checked={verifiedFields.includes("last_name")}
                  onCheckedChange={() => toggleVerified("last_name")}
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Phone</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
              className="h-8 text-sm"
              placeholder="(555) 123-4567"
            />
            {isEditing && (
              <Checkbox
                checked={verifiedFields.includes("phone")}
                onCheckedChange={() => toggleVerified("phone")}
              />
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs">Email</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              className="h-8 text-sm"
              placeholder="customer@example.com"
            />
            {isEditing && (
              <Checkbox
                checked={verifiedFields.includes("email")}
                onCheckedChange={() => toggleVerified("email")}
              />
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs">Address</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={!isEditing}
            className="h-8 text-sm mt-1"
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label className="text-xs">City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={!isEditing}
              className="h-8 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={!isEditing}
              className="h-8 text-sm mt-1"
              maxLength={2}
            />
          </div>
        </div>

        {recipient.last_enriched_at && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Last updated {new Date(recipient.last_enriched_at).toLocaleDateString()}
            </div>
          </div>
        )}

        {isEditing && verifiedFields.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {verifiedFields.map(field => (
              <Badge key={field} variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {field.replace("_", " ")}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
