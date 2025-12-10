import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

interface PermissionTemplateSelectorProps {
  userId: string;
  currentPermissions: string[];
}

export function PermissionTemplateSelector({ 
  userId, 
  currentPermissions 
}: PermissionTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["permission-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as PermissionTemplate[];
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error("Template not found");

      // Get all permission IDs
      const { data: allPermissions, error: permError } = await supabase
        .from("permissions")
        .select("id, name");
      
      if (permError) throw permError;

      // Clear existing user permissions
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId);

      // Add new permissions from template
      const permissionsToAdd = allPermissions
        .filter(p => template.permissions.includes(p.name))
        .map(p => ({
          user_id: userId,
          permission_id: p.id,
          granted: true,
        }));

      const { error: insertError } = await supabase
        .from("user_permissions")
        .insert(permissionsToAdd);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-permission-overrides"] });
      toast.success("Permission template applied successfully");
      setSelectedTemplate("");
    },
    onError: (error) => {
      toast.error("Failed to apply template: " + error.message);
    },
  });

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Apply Permission Template</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Quick apply pre-configured permission sets based on common roles
      </p>

      <div className="flex gap-2">
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  {template.is_system && (
                    <Badge variant="secondary" className="text-xs">System</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => applyTemplateMutation.mutate(selectedTemplate)}
          disabled={!selectedTemplate || applyTemplateMutation.isPending}
        >
          Apply
        </Button>
      </div>

      {selectedTemplateData && (
        <div className="text-sm space-y-2">
          <p className="text-muted-foreground">
            {selectedTemplateData.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTemplateData.permissions.slice(0, 8).map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            ))}
            {selectedTemplateData.permissions.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{selectedTemplateData.permissions.length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
