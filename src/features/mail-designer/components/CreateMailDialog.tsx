import { useState } from "react";
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
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { starterMailPieces, type StarterMailPiece } from "@/features/mail-designer/templates/starterMailPieces";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { MailPreviewRenderer } from "./MailPreviewRenderer";

const mailPieceSchema = z.object({
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

type MailPieceFormData = z.infer<typeof mailPieceSchema>;

interface CreateMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function CreateMailDialog({
  open,
  onOpenChange,
  clientId,
}: CreateMailDialogProps) {
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStarter, setSelectedStarter] = useState<StarterMailPiece | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<MailPieceFormData>({
    resolver: zodResolver(mailPieceSchema),
    defaultValues: {
      name: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MailPieceFormData) => {
      let thumbnailUrl = selectedStarter?.thumbnailUrl || null;

      // Upload thumbnail if provided (for blank mail pieces)
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("template-thumbnails")
          .upload(fileName, thumbnailFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("template-thumbnails")
          .getPublicUrl(fileName);

        thumbnailUrl = urlData.publicUrl;
      }

      // Use starter mail piece layers if selected, otherwise empty
      const jsonLayers = selectedStarter?.layers || { version: 1, layers: [] };

      // Create mail piece record
      const { error } = await supabase.from("templates").insert({
        name: data.name,
        client_id: clientId,
        size: data.size,
        industry_vertical: data.industry_vertical,
        thumbnail_url: thumbnailUrl,
        json_layers: jsonLayers,
        is_favorite: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail"] });
      toast.success("Mail piece created successfully");
      form.reset();
      setThumbnailFile(null);
      setPreviewUrl(null);
      setSelectedStarter(null);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create mail piece");
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

  const onSubmit = (data: MailPieceFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Mail Piece</DialogTitle>
          <DialogDescription>
            Start with a pre-designed mail piece or create your own from scratch
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="starter" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="starter">
              Starter Mail Pieces
            </TabsTrigger>
            <TabsTrigger value="blank">Blank Mail Piece</TabsTrigger>
          </TabsList>

          <TabsContent value="starter" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Choose a starter mail piece</h3>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {starterMailPieces.map((mailPiece) => (
                    <Card
                      key={mailPiece.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedStarter?.id === mailPiece.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedStarter(mailPiece);
                        form.setValue("size", mailPiece.size);
                        form.setValue("industry_vertical", mailPiece.industryVertical);
                        if (!form.getValues("name")) {
                          form.setValue("name", mailPiece.name);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-[3/2] mb-3 overflow-hidden rounded border bg-muted">
                          <img
                            src={mailPiece.thumbnailUrl}
                            alt={mailPiece.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="font-semibold text-sm mb-1">
                          {mailPiece.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {mailPiece.description}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {mailPiece.size}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {mailPiece.industryVertical}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedStarter && (
                <div className="space-y-4">
                  {selectedStarter.layers?.layers && (
                    <MailPreviewRenderer
                      layers={selectedStarter.layers.layers}
                      canvasSize={
                        selectedStarter.layers.canvasSize || { width: 600, height: 400 }
                      }
                    />
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mail Piece Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Spring Roofing Campaign" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
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
                              <FormLabel>Industry</FormLabel>
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
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Creating..." : "Create Mail Piece"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="blank">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mail Piece Name</FormLabel>
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
              <FormLabel>Thumbnail Image (Optional)</FormLabel>
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
                Upload a thumbnail image to help identify this mail piece
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
                  <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Mail Piece"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}