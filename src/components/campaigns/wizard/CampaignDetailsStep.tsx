import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { CampaignFormData } from "../CreateCampaignWizard";

const step1Schema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  template_id: z.string().nullable(),
  size: z.enum(["4x6", "6x9", "6x11", "letter", "trifold"], {
    required_error: "Mail size is required",
  }),
  audience_id: z.string().min(1, "Audience is required"),
  postage: z.enum(["first_class", "standard"]),
  mail_date_mode: z.enum(["asap", "scheduled"]),
  mail_date: z.date().nullable(),
}).refine((data) => {
  if (data.mail_date_mode === "scheduled" && !data.mail_date) {
    return false;
  }
  return true;
}, {
  message: "Mail date is required when scheduling",
  path: ["mail_date"],
});

type Step1FormData = z.infer<typeof step1Schema>;

interface CampaignDetailsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onCancel: () => void;
}

export function CampaignDetailsStep({
  clientId,
  initialData,
  onNext,
  onCancel,
}: CampaignDetailsStepProps) {
  const form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: initialData.name || "",
      template_id: initialData.template_id || null,
      size: initialData.size || "4x6",
      audience_id: initialData.audience_id || "",
      postage: initialData.postage || "standard",
      mail_date_mode: initialData.mail_date_mode || "asap",
      mail_date: initialData.mail_date || null,
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["templates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: audiences } = useQuery({
    queryKey: ["audiences", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiences")
        .select("id, name, valid_count, status")
        .eq("client_id", clientId)
        .eq("status", "ready")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch gift card pools for inventory display
  const { data: giftCardPools } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, available_cards, total_cards")
        .eq("client_id", clientId)
        .order("pool_name");

      if (error) throw error;
      return data;
    },
  });

  const selectedTemplate = templates?.find(
    (t) => t.id === form.watch("template_id")
  );

  const mailDateMode = form.watch("mail_date_mode");
  const minDate = addDays(new Date(), 3);

  const onSubmit = (data: Step1FormData) => {
    onNext(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Spring 2024 Roofing Promo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="template_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template (Optional)</FormLabel>
              <Select
                onValueChange={(value) => {
                  // Convert "none" string to null for UUID compatibility
                  field.onChange(value === "none" ? null : value);
                }}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">None (design later)</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.thumbnail_url && (
                          <img
                            src={template.thumbnail_url}
                            alt=""
                            className="w-6 h-6 object-cover rounded"
                          />
                        )}
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mail Size</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
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
              {selectedTemplate && (
                <FormDescription>
                  Pre-filled from selected template: {selectedTemplate.size}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="audience_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audience</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an audience" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  {audiences?.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name} ({audience.valid_count} recipients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value && giftCardPools && giftCardPools.length > 0 && (
                <FormDescription className="mt-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold">Gift Card Inventory:</span>
                    <div className="mt-1 space-y-1">
                      {giftCardPools.map(pool => {
                        const audienceCount = audiences?.find(a => a.id === field.value)?.valid_count || 0;
                        const isLow = pool.available_cards < audienceCount;
                        return (
                          <div key={pool.id} className={`flex items-center gap-2 ${isLow ? 'text-amber-600' : ''}`}>
                            {isLow && '⚠️'} {pool.pool_name}: {pool.available_cards} available
                            {isLow && ` (Need ${audienceCount}, short by ${audienceCount - pool.available_cards})`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postage Class</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="first_class" id="first_class" />
                    <label htmlFor="first_class" className="cursor-pointer">
                      First Class
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <label htmlFor="standard" className="cursor-pointer">
                      Standard Mail
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="mail_date_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mail Date</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="asap" id="asap" />
                      <label htmlFor="asap" className="cursor-pointer">
                        ASAP ({format(minDate, "MMM d, yyyy")})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scheduled" id="scheduled" />
                      <label htmlFor="scheduled" className="cursor-pointer">
                        Schedule Date
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mailDateMode === "scheduled" && (
            <FormField
              control={form.control}
              name="mail_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < minDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Minimum 3 business days from today
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Next: PURL Settings</Button>
        </div>
      </form>
    </Form>
  );
}
