import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Edit2, Save, X, CheckCircle2, Loader2, ChevronDown, MapPin } from "lucide-react";
import { useRecipientEnrichment } from '@/features/contacts/hooks';
import { useCustomFieldDefinitions, type CustomFieldDefinition } from '@/features/contacts/hooks';
import { CustomFieldInput } from '@/features/contacts/components/CustomFieldInput';
import { formatPhoneNumber } from '@/shared/utils';

interface EnrichmentPanelProps {
  recipient: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    custom_fields?: Record<string, any>;
    last_enriched_at?: string;
    enriched_by_user_id?: string;
  };
  /** When true, renders without Card wrapper (for embedding inside another Card) */
  compact?: boolean;
  /** Optional campaign ID to filter which custom fields to show */
  campaignCustomFieldIds?: string[];
}

export function EnrichmentPanel({ recipient, compact, campaignCustomFieldIds }: EnrichmentPanelProps) {
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(
    recipient.custom_fields || {}
  );
  const [verifiedFields, setVerifiedFields] = useState<string[]>([]);

  const enrichment = useRecipientEnrichment();
  const { data: customFieldDefs = [] } = useCustomFieldDefinitions();

  // Filter custom fields if campaign specifies which ones to show
  const visibleCustomFields = campaignCustomFieldIds && campaignCustomFieldIds.length > 0
    ? customFieldDefs.filter(f => campaignCustomFieldIds.includes(f.id))
    : customFieldDefs;

  // Group custom fields by field_group
  const fieldsByGroup = visibleCustomFields.reduce<Record<string, CustomFieldDefinition[]>>((acc, field) => {
    const group = field.field_group || "Custom Fields";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  // Sync form data when recipient changes
  useEffect(() => {
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
    setCustomFieldValues(recipient.custom_fields || {});
  }, [recipient.id]);

  const handleSave = () => {
    enrichment.mutate({
      recipientId: recipient.id,
      updates: {
        ...formData,
        custom_fields: customFieldValues,
      },
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
    setCustomFieldValues(recipient.custom_fields || {});
    setVerifiedFields([]);
    setIsEditing(false);
  };

  const toggleVerified = (field: string) => {
    setVerifiedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const content = (
    <div className="space-y-3">
      {/* Header with Edit/Save toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          Customer Info
        </Label>
        {!isEditing ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={enrichment.isPending}>
              {enrichment.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Primary fields - always visible */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">First Name</Label>
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
          <Label className="text-xs text-muted-foreground">Last Name</Label>
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
        <Label className="text-xs text-muted-foreground">Phone</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={isEditing ? formData.phone : formatPhoneNumber(formData.phone)}
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
        <Label className="text-xs text-muted-foreground">Email</Label>
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

      {/* Address fields - collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
            <MapPin className="h-3 w-3 mr-2" />
            <span className="text-xs">
              {formData.address || formData.city || formData.state 
                ? `${formData.address ? formData.address + ', ' : ''}${formData.city || ''} ${formData.state || ''}`.trim()
                : 'Address (optional)'}
            </span>
            <ChevronDown className="h-3 w-3 ml-auto" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Street Address</Label>
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
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!isEditing}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!isEditing}
                className="h-8 text-sm mt-1"
                maxLength={2}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Custom Fields - grouped by field_group */}
      {Object.entries(fieldsByGroup).map(([groupName, fields]) => (
        <div key={groupName} className="space-y-2">
          <Separator className="my-1" />
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {groupName}
          </Label>
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <CustomFieldInput
                    field={field}
                    value={customFieldValues[field.field_name]}
                    onChange={(value) => handleCustomFieldChange(field.field_name, value)}
                  />
                </div>
                {isEditing && (
                  <Checkbox
                    className="mt-7"
                    checked={verifiedFields.includes(`custom_fields.${field.field_name}`)}
                    onCheckedChange={() => toggleVerified(`custom_fields.${field.field_name}`)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Last enriched info */}
      {recipient.last_enriched_at && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Last updated {new Date(recipient.last_enriched_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Verified fields badges */}
      {isEditing && verifiedFields.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2">
          {verifiedFields.map(field => (
            <Badge key={field} variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {field.replace(/_/g, " ").replace("custom fields.", "")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  // Compact mode: render content directly without Card wrapper
  if (compact) {
    return content;
  }

  // Full mode: render inside a Card
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer Information</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
