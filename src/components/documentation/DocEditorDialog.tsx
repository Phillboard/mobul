import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  slug: string;
  title: string;
  initialContent: string;
  onSave?: () => void;
}

export function DocEditorDialog({
  open,
  onOpenChange,
  category,
  slug,
  title,
  initialContent,
  onSave,
}: DocEditorDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleInsert = (before: string, after: string = "") => {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert to documentation_pages table
      const { error } = await supabase
        .from("documentation_pages")
        .upsert(
          {
            category,
            slug,
            title,
            content,
            file_path: `/docs/${category}/${slug}.md`,
            last_updated: new Date().toISOString(),
          },
          {
            onConflict: "category,slug",
          }
        );

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Documentation updated successfully",
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving documentation:", error);
      toast({
        title: "Error",
        description: "Failed to save documentation",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Documentation: {title}</DialogTitle>
        </DialogHeader>

        <MarkdownToolbar onInsert={handleInsert} />

        <Tabs defaultValue="split" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="split">Split View</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 min-h-0">
            <ScrollArea className="h-full border rounded-lg">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-full font-mono text-sm border-0 resize-none focus-visible:ring-0"
                placeholder="Write your markdown here..."
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="split" className="flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-4 h-full">
              <ScrollArea className="border rounded-lg">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-full font-mono text-sm border-0 resize-none focus-visible:ring-0"
                  placeholder="Write your markdown here..."
                />
              </ScrollArea>
              <ScrollArea className="border rounded-lg p-4 bg-muted/30">
                <MarkdownRenderer content={content} />
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0">
            <ScrollArea className="h-full border rounded-lg p-4 bg-muted/30">
              <MarkdownRenderer content={content} />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
