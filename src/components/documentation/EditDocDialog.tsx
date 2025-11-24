import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const categories = [
  { value: "getting-started", label: "Getting Started" },
  { value: "architecture", label: "Architecture" },
  { value: "features", label: "Features" },
  { value: "developer-guide", label: "Developer Guide" },
  { value: "api-reference", label: "API Reference" },
  { value: "user-guides", label: "User Guides" },
  { value: "operations", label: "Operations" },
  { value: "configuration", label: "Configuration" },
  { value: "reference", label: "Reference" },
];

interface EditDocDialogProps {
  doc: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDocDialog({ doc, open, onOpenChange, onSuccess }: EditDocDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "getting-started",
    content: "",
    order_index: 0,
    is_admin_only: false,
    search_keywords: "",
  });

  useEffect(() => {
    if (doc?.id) {
      setFormData({
        title: doc.title || "",
        slug: doc.slug || "",
        category: doc.category || "getting-started",
        content: doc.content || "",
        order_index: doc.order_index || 0,
        is_admin_only: doc.is_admin_only || false,
        search_keywords: doc.search_keywords?.join(", ") || "",
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        category: "getting-started",
        content: "",
        order_index: 0,
        is_admin_only: false,
        search_keywords: "",
      });
    }
  }, [doc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const keywords = formData.search_keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const data = {
      title: formData.title,
      slug: formData.slug,
      category: formData.category,
      content: formData.content,
      order_index: formData.order_index,
      is_admin_only: formData.is_admin_only,
      search_keywords: keywords.length > 0 ? keywords : null,
      file_path: `docs/${formData.category}/${formData.slug}.md`,
    };

    if (doc?.id) {
      const { error } = await supabase
        .from("documentation_pages")
        .update(data)
        .eq("id", doc.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("documentation_pages")
        .insert(data);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: `Documentation page ${doc?.id ? "updated" : "created"} successfully`,
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc?.id ? "Edit" : "Create"} Documentation Page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="url-friendly-slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_index">Order Index</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Search Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={formData.search_keywords}
              onChange={(e) => setFormData({ ...formData, search_keywords: e.target.value })}
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="admin_only"
              checked={formData.is_admin_only}
              onCheckedChange={(checked) => setFormData({ ...formData, is_admin_only: checked })}
            />
            <Label htmlFor="admin_only">Admin Only</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {doc?.id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
