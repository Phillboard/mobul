/**
 * CombinedSetupStep - All-in-one campaign setup
 * 
 * Combines: Campaign name, Codes upload, Conditions, and Delivery (ACE only)
 * Uses accordion to organize sections in a single step.
 */

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Upload, 
  Users, 
  Gift, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  CalendarIcon,
  Plus,
  Trash2,
  Download,
  Loader2,
  Info
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";

// Trigger types for conditions
const TRIGGER_TYPES = [
  { value: "manual_agent", label: "Agent Accepted", description: "Call center agent marks condition as met" },
  { value: "call_completed", label: "Call Completed", description: "Auto-triggers when call ends" },
  { value: "form_submitted", label: "Form Submitted", description: "Customer submits the form" },
  { value: "time_delay", label: "Time Delay", description: "Auto trigger after X hours" },
] as const;

type TriggerType = typeof TRIGGER_TYPES[number]['value'];

interface Condition {
  id: string;
  condition_number: number;
  condition_name: string;
  trigger_type: TriggerType;
  gift_card_pool_id: string;
  sms_template: string;
  is_active: boolean;
}

interface ParsedRow {
  code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status: 'valid' | 'duplicate' | 'error';
  error?: string;
}

interface CombinedSetupStepProps {
  clientId: string;
  campaignId?: string | null;
  initialData: Partial<CampaignFormData>;
  mailingMethod: MailingMethod;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onSaveDraft?: () => void;
}

export function CombinedSetupStep({
  clientId,
  campaignId,
  initialData,
  mailingMethod,
  onNext,
  onBack,
  onSaveDraft,
}: CombinedSetupStepProps) {
  const { toast } = useToast();
  const isAceFulfillment = mailingMethod === 'ace_fulfillment';
  
  // Track which sections are complete
  const [openSections, setOpenSections] = useState<string[]>(["name"]);
  
  // Campaign Name
  const [campaignName, setCampaignName] = useState(initialData.name || "");
  
  // Codes State
  const [sourceType, setSourceType] = useState<"csv" | "list">("list");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recipientCount, setRecipientCount] = useState(initialData.recipient_count || 0);
  
  // Conditions State
  const [conditions, setConditions] = useState<Condition[]>(() => {
    const existing = (initialData as any).conditions;
    if (existing && existing.length > 0) return existing;
    return [{
      id: crypto.randomUUID(),
      condition_number: 1,
      condition_name: "Listened to sales call",
      trigger_type: "manual_agent" as TriggerType,
      gift_card_pool_id: "",
      sms_template: "Hi {first_name}! Thanks for your time. Here's your ${value} {provider} gift card: {link}",
      is_active: true,
    }];
  });
  
  // Delivery State (ACE only)
  const [postage, setPostage] = useState<"first_class" | "standard">(initialData.postage || "standard");
  const [mailDateMode, setMailDateMode] = useState<"asap" | "scheduled">(initialData.mail_date_mode || "asap");
  const [mailDate, setMailDate] = useState<Date | undefined>(
    initialData.mail_date ? new Date(initialData.mail_date) : undefined
  );
  
  // Fetch contact lists
  const { data: contactLists, isLoading: loadingLists } = useQuery({
    queryKey: ["contact-lists", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("id, name, contact_count, list_type, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch gift card pools
  const { data: giftCardPools } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, card_value, available_cards")
        .eq("client_id", clientId)
        .order("pool_name");
      if (error) throw error;
      return data;
    },
  });

  // CSV dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const parsed: ParsedRow[] = rows.map((row) => {
          if (!row.code || row.code.trim() === '') {
            return { ...row, code: '', status: 'error' as const, error: 'Missing code' };
          }
          return {
            code: row.code.trim().toUpperCase(),
            first_name: row.first_name?.trim() || '',
            last_name: row.last_name?.trim() || '',
            email: row.email?.trim().toLowerCase() || '',
            phone: row.phone?.trim() || '',
            status: 'valid' as const
          };
        });
        
        // Check for duplicates
        const codeMap = new Map<string, number>();
        parsed.forEach((row, index) => {
          if (row.status === 'valid') {
            if (codeMap.has(row.code)) {
              row.status = 'duplicate';
              row.error = `Duplicate`;
            } else {
              codeMap.set(row.code, index);
            }
          }
        });
        
        setParsedData(parsed);
        const validCount = parsed.filter(r => r.status === 'valid').length;
        setRecipientCount(validCount);
        setUploadProgress(100);
        toast({ title: "CSV Parsed", description: `${validCount} valid codes found` });
      },
      error: (error) => {
        toast({ title: "Parse Error", description: error.message, variant: "destructive" });
      }
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const template = "code,first_name,last_name,email,phone\nABC123,John,Doe,john@example.com,555-1234\nXYZ789,Jane,Smith,jane@example.com,555-5678";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-codes-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle list selection
  useEffect(() => {
    if (selectedListId && contactLists) {
      const list = contactLists.find(l => l.id === selectedListId);
      if (list) {
        setRecipientCount(list.contact_count || 0);
      }
    }
  }, [selectedListId, contactLists]);

  // Condition handlers
  const addCondition = () => {
    setConditions([...conditions, {
      id: crypto.randomUUID(),
      condition_number: conditions.length + 1,
      condition_name: `Condition ${conditions.length + 1}`,
      trigger_type: "manual_agent",
      gift_card_pool_id: "",
      sms_template: "Hi {first_name}! Your ${value} {provider} gift card: {link}",
      is_active: true,
    }]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length === 1) {
      toast({ title: "Cannot Remove", description: "At least one condition is required.", variant: "destructive" });
      return;
    }
    setConditions(conditions.filter(c => c.id !== id).map((c, i) => ({ ...c, condition_number: i + 1 })));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Validation
  const isNameValid = campaignName.trim().length > 0;
  const hasRecipients = recipientCount > 0 || (sourceType === 'list' && selectedListId) || parsedData.length > 0;
  const hasValidConditions = conditions.some(c => c.is_active && c.gift_card_pool_id);
  
  const canProceed = isNameValid;

  // Section completion status
  const getSectionStatus = (section: string) => {
    switch (section) {
      case 'name': return isNameValid ? 'complete' : 'incomplete';
      case 'codes': return hasRecipients ? 'complete' : 'incomplete';
      case 'conditions': return hasValidConditions ? 'complete' : 'warning';
      case 'delivery': return true ? 'complete' : 'incomplete';
      default: return 'incomplete';
    }
  };

  const handleNext = () => {
    const data: Partial<CampaignFormData> = {
      name: campaignName,
      recipient_count: recipientCount,
      conditions: conditions as any,
    };

    if (isAceFulfillment) {
      data.postage = postage;
      data.mail_date_mode = mailDateMode;
      if (mailDateMode === 'scheduled' && mailDate) {
        data.mail_date = mailDate.toISOString();
      }
    }

    // Include parsed data or list reference
    if (sourceType === 'csv' && parsedData.length > 0) {
      (data as any).parsed_codes = parsedData.filter(r => r.status === 'valid');
    } else if (sourceType === 'list' && selectedListId) {
      (data as any).contact_list_id = selectedListId;
    }

    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campaign Setup</h2>
        <p className="text-muted-foreground mt-2">
          Configure your campaign details, codes, and reward conditions
        </p>
      </div>

      <Accordion 
        type="multiple" 
        value={openSections} 
        onValueChange={setOpenSections}
        className="space-y-4"
      >
        {/* Section 1: Campaign Name */}
        <AccordionItem value="name" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                getSectionStatus('name') === 'complete' ? "bg-green-100 text-green-600" : "bg-muted"
              )}>
                {getSectionStatus('name') === 'complete' ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="text-left">
                <div className="font-medium">Campaign Name</div>
                <div className="text-sm text-muted-foreground">
                  {campaignName || "Enter a name for your campaign"}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Spring 2025 Auto Warranty Promo"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  This is for your reference - customers won't see it
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Codes & Recipients */}
        <AccordionItem value="codes" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                getSectionStatus('codes') === 'complete' ? "bg-green-100 text-green-600" : "bg-muted"
              )}>
                {getSectionStatus('codes') === 'complete' ? <CheckCircle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </div>
              <div className="text-left">
                <div className="font-medium">Codes & Recipients</div>
                <div className="text-sm text-muted-foreground">
                  {recipientCount > 0 ? `${recipientCount.toLocaleString()} codes loaded` : "Upload codes or select a list"}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "csv" | "list")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list">Select List</TabsTrigger>
                  <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                </TabsList>
                
                <TabsContent value="list" className="space-y-4 mt-4">
                  {loadingLists ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : contactLists && contactLists.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Contact List</Label>
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a contact list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contactLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              <div className="flex items-center gap-2">
                                <span>{list.name}</span>
                                <Badge variant="secondary">{list.contact_count || 0} contacts</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No contact lists found. Upload a CSV instead or create a list first.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="csv" className="space-y-4 mt-4">
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive ? "Drop your CSV here" : "Drag & drop a CSV file, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Required column: code. Optional: first_name, last_name, email, phone
                    </p>
                  </div>
                  
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} className="w-full" />
                  )}
                  
                  {parsedData.length > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        {parsedData.filter(r => r.status === 'valid').length} valid codes parsed
                        {parsedData.filter(r => r.status !== 'valid').length > 0 && (
                          <span className="text-amber-600 ml-2">
                            ({parsedData.filter(r => r.status !== 'valid').length} skipped)
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Conditions */}
        <AccordionItem value="conditions" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                getSectionStatus('conditions') === 'complete' ? "bg-green-100 text-green-600" : 
                getSectionStatus('conditions') === 'warning' ? "bg-amber-100 text-amber-600" : "bg-muted"
              )}>
                {getSectionStatus('conditions') === 'complete' ? <CheckCircle className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
              </div>
              <div className="text-left">
                <div className="font-medium">Reward Conditions</div>
                <div className="text-sm text-muted-foreground">
                  {conditions.filter(c => c.is_active).length} condition(s) configured
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Define when customers earn their gift card reward
              </p>
              
              {conditions.map((condition, index) => (
                <Card key={condition.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Condition {index + 1}</Badge>
                      {conditions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCondition(condition.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Condition Name</Label>
                        <Input
                          value={condition.condition_name}
                          onChange={(e) => updateCondition(condition.id, { condition_name: e.target.value })}
                          placeholder="e.g., Listened to sales call"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Trigger Type</Label>
                        <Select 
                          value={condition.trigger_type} 
                          onValueChange={(v) => updateCondition(condition.id, { trigger_type: v as TriggerType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRIGGER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Gift Card Pool</Label>
                      <Select
                        value={condition.gift_card_pool_id}
                        onValueChange={(v) => updateCondition(condition.id, { gift_card_pool_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gift card pool..." />
                        </SelectTrigger>
                        <SelectContent>
                          {giftCardPools?.map((pool) => (
                            <SelectItem key={pool.id} value={pool.id}>
                              <div className="flex items-center gap-2">
                                <span>{pool.pool_name}</span>
                                <Badge variant="secondary">${pool.card_value}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({pool.available_cards || 0} available)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>SMS Message Template</Label>
                      <Textarea
                        value={condition.sms_template}
                        onChange={(e) => updateCondition(condition.id, { sms_template: e.target.value })}
                        placeholder="Hi {first_name}! Your gift card: {link}"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables: {"{first_name}"}, {"{value}"}, {"{provider}"}, {"{link}"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button variant="outline" onClick={addCondition} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Condition
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Delivery (ACE Fulfillment Only) */}
        {isAceFulfillment && (
          <AccordionItem value="delivery" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-green-100 text-green-600"
                )}>
                  <Truck className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Delivery Settings</div>
                  <div className="text-sm text-muted-foreground">
                    {postage === 'first_class' ? 'First Class' : 'Standard'} postage, {mailDateMode === 'asap' ? 'ASAP' : 'Scheduled'}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-6 pt-2">
                <div className="space-y-3">
                  <Label>Postage Type</Label>
                  <RadioGroup value={postage} onValueChange={(v) => setPostage(v as "first_class" | "standard")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="font-normal cursor-pointer">
                        Standard ($0.48/piece) - 5-7 business days
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="first_class" id="first_class" />
                      <Label htmlFor="first_class" className="font-normal cursor-pointer">
                        First Class ($0.73/piece) - 2-3 business days
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>Mail Date</Label>
                  <RadioGroup value={mailDateMode} onValueChange={(v) => setMailDateMode(v as "asap" | "scheduled")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="asap" id="asap" />
                      <Label htmlFor="asap" className="font-normal cursor-pointer">
                        As Soon As Possible
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scheduled" id="scheduled" />
                      <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                        Schedule for specific date
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {mailDateMode === 'scheduled' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !mailDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {mailDate ? format(mailDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={mailDate}
                          onSelect={setMailDate}
                          disabled={(date) => date < addDays(new Date(), 3)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Summary */}
      {recipientCount > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>{recipientCount.toLocaleString()}</strong> recipients • 
            <strong> {conditions.filter(c => c.is_active).length}</strong> condition(s)
            {isAceFulfillment && <> • <strong>{postage === 'first_class' ? 'First Class' : 'Standard'}</strong> postage</>}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {onSaveDraft && (
            <Button type="button" variant="ghost" onClick={onSaveDraft}>
              Save Draft
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canProceed}>
            Next: Design & Page
          </Button>
        </div>
      </div>
    </div>
  );
}

