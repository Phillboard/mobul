import { useState } from "react";
import { Plus, Edit, Trash, GripVertical } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { useCustomFieldDefinitions, useCreateCustomFieldDefinition, useUpdateCustomFieldDefinition, useDeleteCustomFieldDefinition, CustomFieldDefinition } from '@/features/contacts/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";

export function CustomFieldManager() {
  const { data: fields = [], isLoading } = useCustomFieldDefinitions();
  const createMutation = useCreateCustomFieldDefinition();
  const updateMutation = useUpdateCustomFieldDefinition();
  const deleteMutation = useDeleteCustomFieldDefinition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState({
    field_name: "",
    field_label: "",
    field_type: "text" as CustomFieldDefinition['field_type'],
    field_group: "Custom Fields",
    is_required: false,
    options: [] as string[],
    optionsText: "",
  });

  const handleOpenDialog = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setFormData({
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_group: field.field_group,
        is_required: field.is_required,
        options: field.options || [],
        optionsText: field.options?.join("\n") || "",
      });
    } else {
      setEditingField(null);
      setFormData({
        field_name: "",
        field_label: "",
        field_type: "text",
        field_group: "Custom Fields",
        is_required: false,
        options: [],
        optionsText: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const options = ['select', 'multi-select'].includes(formData.field_type) 
      ? formData.optionsText.split("\n").filter(o => o.trim())
      : [];

    const data = {
      field_name: formData.field_name.toLowerCase().replace(/\s+/g, '_'),
      field_label: formData.field_label,
      field_type: formData.field_type,
      field_group: formData.field_group,
      is_required: formData.is_required,
      options,
      display_order: editingField?.display_order || fields.length,
      is_active: true,
      validation_rules: {},
    };

    if (editingField) {
      await updateMutation.mutateAsync({ id: editingField.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this custom field?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Define custom fields to capture industry-specific contact data
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Field Label</TableHead>
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Required</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No custom fields defined. Click "Add Field" to create one.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{field.field_label}</TableCell>
                  <TableCell className="text-muted-foreground">{field.field_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{field.field_type}</Badge>
                  </TableCell>
                  <TableCell>{field.field_group}</TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Badge variant="secondary">Required</Badge>
                    ) : (
                      <span className="text-muted-foreground">Optional</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(field)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(field.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingField ? "Edit" : "Add"} Custom Field</DialogTitle>
              <DialogDescription>
                Configure a custom field for your contacts
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_label">Field Label *</Label>
                  <Input
                    id="field_label"
                    value={formData.field_label}
                    onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
                    placeholder="e.g., Industry"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_name">Field Name *</Label>
                  <Input
                    id="field_name"
                    value={formData.field_name}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                    placeholder="e.g., industry"
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal identifier (lowercase, no spaces)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="field_type">Field Type</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(value: any) => setFormData({ ...formData, field_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="select">Dropdown (Single)</SelectItem>
                      <SelectItem value="multi-select">Dropdown (Multiple)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_group">Group</Label>
                  <Input
                    id="field_group"
                    value={formData.field_group}
                    onChange={(e) => setFormData({ ...formData, field_group: e.target.value })}
                  />
                </div>
              </div>

              {['select', 'multi-select'].includes(formData.field_type) && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (one per line)</Label>
                  <Textarea
                    id="options"
                    value={formData.optionsText}
                    onChange={(e) => setFormData({ ...formData, optionsText: e.target.value })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={5}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
                <Label htmlFor="is_required">Required field</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingField ? "Update" : "Create"} Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}