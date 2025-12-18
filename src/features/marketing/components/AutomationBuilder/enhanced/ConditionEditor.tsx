/**
 * Condition Editor
 * 
 * Editor for automation branching conditions.
 * Supports: email_opened, email_clicked, has_tag, contact_field
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { GitBranch } from "lucide-react";
import { ConditionType, ConditionConfig } from "@/features/marketing/types";

interface ConditionEditorProps {
  condition?: ConditionConfig;
  onChange: (condition: ConditionConfig) => void;
}

export function ConditionEditor({ condition, onChange }: ConditionEditorProps) {
  const conditionType = condition?.type || 'email_opened';

  const handleTypeChange = (type: ConditionType) => {
    onChange({ type });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-purple-500" />
          <CardTitle className="text-lg">Condition</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Condition Type */}
        <div className="space-y-2">
          <Label>Check if contact:</Label>
          <Select
            value={conditionType}
            onValueChange={(value: ConditionType) => handleTypeChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email_opened">Opened an Email</SelectItem>
              <SelectItem value="email_clicked">Clicked in an Email</SelectItem>
              <SelectItem value="has_tag">Has a Tag</SelectItem>
              <SelectItem value="contact_field">Contact Field Matches</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Opened/Clicked */}
        {(conditionType === 'email_opened' || conditionType === 'email_clicked') && (
          <div className="space-y-2">
            <Label>Email</Label>
            <Select
              value={condition?.stepId || ''}
              onValueChange={(value) => onChange({ ...condition, type: conditionType, stepId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a previous email step..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="step-1">Step 1: Welcome Email</SelectItem>
                <SelectItem value="step-2">Step 2: Follow-up Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Has Tag */}
        {conditionType === 'has_tag' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tag</Label>
              <Input
                placeholder="Enter tag name"
                value={condition?.tagId || ''}
                onChange={(e) => onChange({ ...condition, type: conditionType, tagId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Check</Label>
              <Select
                value={condition?.hasTag ? 'has' : 'does-not-have'}
                onValueChange={(value) => onChange({ 
                  ...condition, 
                  type: conditionType, 
                  hasTag: value === 'has' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="has">Has this tag</SelectItem>
                  <SelectItem value="does-not-have">Does not have this tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Contact Field */}
        {conditionType === 'contact_field' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field</Label>
              <Select
                value={condition?.field || ''}
                onValueChange={(value) => onChange({ ...condition, type: conditionType, field: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={condition?.operator || 'equals'}
                onValueChange={(value: any) => onChange({ ...condition, type: conditionType, operator: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder="Enter value"
                value={condition?.value || ''}
                onChange={(e) => onChange({ ...condition, type: conditionType, value: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Branch Labels */}
        <div className="pt-4 space-y-3">
          <Label>Branch Labels (Optional)</Label>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="w-16">Yes</Badge>
              <Input placeholder="e.g., Engaged Users" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="w-16">No</Badge>
              <Input placeholder="e.g., Not Engaged" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Contacts that match this condition will follow the <strong>Yes</strong> path. 
            Others will follow the <strong>No</strong> path.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
