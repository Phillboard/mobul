import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Gift, Copy, RotateCcw, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PoolInventoryWidget } from "./PoolInventoryWidget";
import { ResendSmsButton } from "./ResendSmsButton";

type WorkflowStep = "code" | "contact" | "condition" | "complete";

interface RecipientData {
  id: string;
  redemption_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: string;
  audiences?: {
    id: string;
    name: string;
    campaigns?: Array<{
      id: string;
      name: string;
      campaign_conditions?: Array<{
        id: string;
        condition_number: number;
        condition_name: string;
        is_active: boolean;
      }>;
      campaign_reward_configs?: Array<{
        condition_number: number;
        gift_card_pool_id: string;
      }>;
    }>;
  };
}

interface GiftCardData {
  id: string;
  card_code: string;
  card_number: string | null;
  card_value?: number;
  expiration_date: string | null;
  gift_card_pools?: {
    id: string;
    pool_name: string;
    card_value: number;
    provider: string | null;
    gift_card_brands?: {
      brand_name: string;
      logo_url: string | null;
      balance_check_url: string | null;
    } | null;
  };
}

interface ProvisionResult {
  success: boolean;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  giftCard: GiftCardData;
}

export function CallCenterRedemptionPanel() {
  const { toast } = useToast();
  
  // Step 1: Code Entry
  const [step, setStep] = useState<WorkflowStep>("code");
  const [redemptionCode, setRedemptionCode] = useState("");
  const [recipient, setRecipient] = useState<RecipientData | null>(null);
  
  // Step 2: Contact Method
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "email">("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  // Step 3: Condition Selection
  const [selectedConditionId, setSelectedConditionId] = useState("");
  
  // Step 4: Result
  const [result, setResult] = useState<ProvisionResult | null>(null);

  // Pre-fill contact method from recipient if available
  useEffect(() => {
    if (recipient) {
      if (recipient.phone) {
        setPhone(recipient.phone);
        setDeliveryMethod("sms");
      } else if (recipient.email) {
        setEmail(recipient.email);
        setDeliveryMethod("email");
      }
    }
  }, [recipient]);

  // Step 1: Look up recipient by code
  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from("recipients")
        .select(`
          *,
          audiences!inner (
            id,
            name,
            campaigns!inner (
              id,
              name,
              campaign_conditions (*),
              campaign_reward_configs (*)
            )
          )
        `)
        .eq("redemption_code", code.toUpperCase())
        .single();

      if (error) throw new Error("Code not found. Please check and try again.");
      if (!data) throw new Error("Recipient not found");
      
      // Check if already redeemed
      if (data.approval_status === "redeemed") {
        throw new Error("This code has already been redeemed");
      }

      return data as RecipientData;
    },
    onSuccess: (data) => {
      setRecipient(data);
      setStep("contact");
    },
    onError: (error: Error) => {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Step 3: Provision gift card
  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!recipient || !selectedConditionId) {
        throw new Error("Missing required information");
      }

      const contactMethod = deliveryMethod === "sms" ? phone : email;
      if (!contactMethod) {
        throw new Error(`Please enter ${deliveryMethod === "sms" ? "phone number" : "email address"}`);
      }

      const condition = recipient.audiences?.campaigns?.[0]?.campaign_conditions?.find(
        c => c.id === selectedConditionId
      );

      const { data, error } = await supabase.functions.invoke("provision-gift-card-for-call-center", {
        body: {
          redemptionCode: recipient.redemption_code,
          deliveryPhone: deliveryMethod === "sms" ? phone : null,
          deliveryEmail: deliveryMethod === "email" ? email : null,
          conditionNumber: condition?.condition_number,
          conditionId: selectedConditionId,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);
      return data as ProvisionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("complete");
      toast({
        title: "Gift Card Provisioned",
        description: "Successfully redeemed gift card for customer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartNew = () => {
    setStep("code");
    setRedemptionCode("");
    setRecipient(null);
    setPhone("");
    setEmail("");
    setSelectedConditionId("");
    setResult(null);
  };

  const copyAllDetails = () => {
    if (!result?.giftCard) return;

    const card = result.giftCard;
    const pool = card.gift_card_pools;
    const brand = pool?.gift_card_brands;
    const value = pool?.card_value || card.card_value || 0;

    const details = `${brand?.brand_name || pool?.provider || "Gift Card"}
Value: $${value.toFixed(2)}
Code: ${card.card_code}
${card.card_number ? `Card Number: ${card.card_number}` : ""}
${card.expiration_date ? `Expires: ${new Date(card.expiration_date).toLocaleDateString()}` : ""}`;

    navigator.clipboard.writeText(details);
    toast({
      title: "Copied!",
      description: "All gift card details copied to clipboard",
    });
  };

  const campaign = recipient?.audiences?.campaigns?.[0];
  const activeConditions = campaign?.campaign_conditions?.filter(c => c.is_active) || [];

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant={step === "code" || step === "contact" || step === "condition" || step === "complete" ? "default" : "outline"}>
          1. Code
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "contact" || step === "condition" || step === "complete" ? "default" : "outline"}>
          2. Contact
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "condition" || step === "complete" ? "default" : "outline"}>
          3. Condition
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "complete" ? "default" : "outline"}>
          4. Complete
        </Badge>
      </div>

      {/* Step 1: Code Entry */}
      {step === "code" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Enter Confirmation Code
            </CardTitle>
            <CardDescription>
              Enter the unique confirmation code provided by the customer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Confirmation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., ABC-1234)"
                  className="text-lg font-mono uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      lookupMutation.mutate(redemptionCode.trim());
                    }
                  }}
                />
                <Button
                  onClick={() => lookupMutation.mutate(redemptionCode.trim())}
                  disabled={lookupMutation.isPending || !redemptionCode.trim()}
                  className="min-w-[120px]"
                >
                  {lookupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Look Up
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contact Method */}
      {step === "contact" && recipient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Delivery Method
            </CardTitle>
            <CardDescription>
              How should we send the gift card to the customer?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show customer name if available */}
            {(recipient.first_name || recipient.last_name) && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {recipient.first_name} {recipient.last_name}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <Label>Delivery Method</Label>
              <RadioGroup value={deliveryMethod} onValueChange={(value: "sms" | "email") => setDeliveryMethod(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms" className="cursor-pointer">Text Message (SMS)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="cursor-pointer">Email</Label>
                </div>
              </RadioGroup>

              {deliveryMethod === "sms" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              {deliveryMethod === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="email-input">Email Address</Label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStartNew}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={() => setStep("condition")}
                disabled={deliveryMethod === "sms" ? !phone : !email}
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Condition Selection */}
      {step === "condition" && recipient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Select Condition Completed
            </CardTitle>
            <CardDescription>
              Which condition did the customer complete?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Campaign</div>
                <div className="font-medium">{campaign.name}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={selectedConditionId} onValueChange={setSelectedConditionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the condition the customer completed" />
                </SelectTrigger>
                <SelectContent>
                  {activeConditions.map((condition) => (
                    <SelectItem key={condition.id} value={condition.id}>
                      Condition {condition.condition_number}: {condition.condition_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("contact")}>
                Back
              </Button>
              <Button
                onClick={() => provisionMutation.mutate()}
                disabled={!selectedConditionId || provisionMutation.isPending}
                className="flex-1"
              >
                {provisionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Provision Gift Card
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Gift Card Display */}
      {step === "complete" && result && (
        <>
          {/* Pool Inventory */}
          {result.giftCard.gift_card_pools?.id && (
            <PoolInventoryWidget poolId={result.giftCard.gift_card_pools.id} />
          )}

          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Gift Card Provisioned
                </span>
                <Button onClick={copyAllDetails} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
              <CardDescription>
                Share these details with the customer
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {result.recipient.firstName} {result.recipient.lastName}
                </span>
                {deliveryMethod === "sms" && result.recipient.phone && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{result.recipient.phone}</span>
                  </>
                )}
                {deliveryMethod === "email" && result.recipient.email && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{result.recipient.email}</span>
                  </>
                )}
              </div>

              {/* Brand and Value */}
              <div className="text-center space-y-2">
                {result.giftCard.gift_card_pools?.gift_card_brands?.logo_url && (
                  <img
                    src={result.giftCard.gift_card_pools.gift_card_brands.logo_url}
                    alt={result.giftCard.gift_card_pools.gift_card_brands.brand_name}
                    className="h-12 mx-auto object-contain"
                  />
                )}
                <div className="text-4xl font-bold text-primary">
                  ${(result.giftCard.gift_card_pools?.card_value || result.giftCard.card_value || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.giftCard.gift_card_pools?.gift_card_brands?.brand_name || 
                   result.giftCard.gift_card_pools?.provider || "Gift Card"}
                </div>
              </div>

              <Separator />

              {/* Card Details */}
              <div className="space-y-3">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Gift Card Code</div>
                  <div className="font-mono text-xl font-bold tracking-wider">
                    {result.giftCard.card_code}
                  </div>
                </div>

                {result.giftCard.card_number && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Card Number</div>
                    <div className="font-mono text-lg font-semibold">
                      {result.giftCard.card_number}
                    </div>
                  </div>
                )}

                {result.giftCard.expiration_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Expires: {new Date(result.giftCard.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {result.giftCard.gift_card_pools?.gift_card_brands?.balance_check_url && (
                  <div className="pt-2">
                    <a
                      href={result.giftCard.gift_card_pools.gift_card_brands.balance_check_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Check balance online →
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {result.recipient.phone && deliveryMethod === "sms" && (
                  <ResendSmsButton
                    giftCardId={result.giftCard.id}
                    recipientId={result.recipient.id}
                    recipientPhone={result.recipient.phone}
                    giftCardCode={result.giftCard.card_code}
                    giftCardValue={result.giftCard.gift_card_pools?.card_value || result.giftCard.card_value || 0}
                    brandName={result.giftCard.gift_card_pools?.gift_card_brands?.brand_name || 
                               result.giftCard.gift_card_pools?.provider}
                    cardNumber={result.giftCard.card_number || undefined}
                  />
                )}
                
                <Button onClick={handleStartNew} variant="outline" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Redeem Another Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
