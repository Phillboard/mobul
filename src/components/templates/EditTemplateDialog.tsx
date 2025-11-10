import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  size: z.enum(["4x6", "6x9", "6x11", "letter", "trifold"], {
    required_error: "Size is required",
  }),
  industry_vertical: z.enum(
    ["roofing", "rei", "auto_service", "auto_warranty", "auto_buyback"],
    {
      required_error: "Industry is required",
    }
  ),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EditTemplateDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTemplateDialog({
  template,
  open,
  onOpenChange,
}: EditTemplateDialogProps) {
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template.name,
      size: template.size,
      industry_vertical: template.industry_vertical,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: template.name,
        size: template.size,
        industry_vertical: template.industry_vertical,
      });
      setPreviewUrl(template.thumbnail_url);
      setThumbnailFile(null);
    }
  }, [open, template, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      let thumbnailUrl = template.thumbnail_url;

      // Upload new thumbnail if provided
      if (thumbnailFile) {
        // Delete old thumbnail if exists
        if (template.thumbnail_url) {
          const oldPath = template.thumbnail_url.split("/").pop();
          if (oldPath) {
            await supabase.storage
              .from("template-thumbnails")
              .remove([oldPath]);
          }
        }

        const fileExt = thumbnailFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("template-thumbnails")
          .upload(fileName, thumbnailFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("template-thumbnails")
          .getPublicUrl(fileName);

        thumbnailUrl = urlData.publicUrl;
      }

      // Update template record
      const { error } = await supabase
        .from("templates")
        .update({
          name: data.name,
          size: data.size,
          industry_vertical: data.industry_vertical,
          thumbnail_url: thumbnailUrl,
        })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update template");
      console.error(error);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: TemplateFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update template details and metadata
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Spring Roofing Campaign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="4x6">4×6 Postcard</SelectItem>
                      <SelectItem value="6x9">6×9 Postcard</SelectItem>
                      <SelectItem value="6x11">6×11 Postcard</SelectItem>
                      <SelectItem value="letter">Letter (#10)</SelectItem>
                      <SelectItem value="trifold">Tri-fold Self-Mailer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry_vertical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Vertical</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="roofing">Roofing</SelectItem>
                      <SelectItem value="rei">Real Estate Investment</SelectItem>
                      <SelectItem value="auto_service">Auto Service</SelectItem>
                      <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
                      <SelectItem value="auto_buyback">Auto Buyback</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Thumbnail Image</FormLabel>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {previewUrl && (
                  <div className="w-24 h-24 border rounded overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a new thumbnail to replace the existing one
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
