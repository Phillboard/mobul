import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Save, 
  Eye, 
  Code, 
  Rocket, 
  ArrowLeft, 
  RotateCcw, 
  RotateCw,
  Check,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FormConfig } from "@/types/aceForms";

interface FormBuilderHeaderProps {
  formName: string;
  onFormNameChange: (name: string) => void;
  isPublished: boolean;
  isDraft: boolean;
  saveStatus: "saved" | "saving" | "unsaved";
  lastSaved: Date | null;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPublishing: boolean;
}

export function FormBuilderHeader({
  formName,
  onFormNameChange,
  isPublished,
  isDraft,
  saveStatus,
  lastSaved,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onPreview,
  onExport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPublishing,
}: FormBuilderHeaderProps) {
  const navigate = useNavigate();

  const formatLastSaved = () => {
    if (!lastSaved) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/forms")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-3">
            <Input
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="font-medium w-[300px]"
              placeholder="Untitled Form"
            />

            {isPublished ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="w-3 h-3 mr-1" />
                Published
              </Badge>
            ) : isDraft ? (
              <Badge variant="secondary">Draft</Badge>
            ) : null}

            {saveStatus === "saving" ? (
              <Badge variant="outline" className="text-muted-foreground">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Saving...
              </Badge>
            ) : saveStatus === "saved" ? (
              <Badge variant="outline" className="text-muted-foreground">
                <Check className="w-3 h-3 mr-1" />
                {lastSaved ? formatLastSaved() : "Saved"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-500 border-orange-200">
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Code className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" size="sm" onClick={onSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          {isPublished ? (
            <Button variant="destructive" size="sm" onClick={onUnpublish}>
              Unpublish
            </Button>
          ) : (
            <Button size="sm" onClick={onPublish} disabled={isPublishing}>
              {isPublishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
