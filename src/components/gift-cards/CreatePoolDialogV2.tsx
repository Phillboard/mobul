import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { BrandSelector } from "./BrandSelector";
import { useGiftCardBrands } from "@/hooks/useGiftCardBrands";

interface CreatePoolDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePool: (pool: { 
    pool_name: string; 
    card_value: number; 
    provider: string;
    client_id: string;
    brand_id: string;
    purchase_method?: string;
    api_provider?: string;
    api_config?: any;
  }) => void;
  clientId: string;
}

const API_PROVIDERS = [
  { value: "tillo", label: "Tillo" },
  { value: "tango_card", label: "Tango Card" },
  { value: "giftbit", label: "Giftbit" },
  { value: "rybbon", label: "Rybbon" }
];

export function CreatePoolDialogV2({
  open,
  onOpenChange,
  onCreatePool,
  clientId,
}: CreatePoolDialogV2Props) {
  const { data: brands = [] } = useGiftCardBrands();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [poolName, setPoolName] = useState("");
  const [cardValue, setCardValue] = useState("");
  const [purchaseMethod, setPurchaseMethod] = useState<string>("csv_only");
  const [apiProvider, setApiProvider] = useState("");
  
  // Tillo config
  const [tilloApiKey, setTilloApiKey] = useState("");
  const [tilloSecretKey, setTilloSecretKey] = useState("");
  const [tilloBrandCode, setTilloBrandCode] = useState("");
  
  // Other API configs
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const supportsApi = selectedBrand?.provider !== 'csv_only';

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      // Auto-suggest pool name
      setPoolName(`${brand.brand_name} Pool`);
      // Set default purchase method based on brand
      setPurchaseMethod(brand.provider === 'csv_only' ? 'csv_only' : 'csv_with_fallback');
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedBrandId) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreate = () => {
    if (!poolName || !cardValue || !selectedBrandId) return;
    
    if (purchaseMethod !== 'csv_only' && !apiProvider) return;

    let apiConfig = {};
    
    if (purchaseMethod !== 'csv_only') {
      if (apiProvider === 'tillo') {
        if (!tilloApiKey || !tilloSecretKey || !tilloBrandCode) return;
        apiConfig = {
          apiKey: tilloApiKey,
          secretKey: tilloSecretKey,
          brandCode: tilloBrandCode,
          currency: 'USD'
        };
      } else if (apiProvider === 'tango_card') {
        if (!username || !password) return;
        apiConfig = { username, password, platformName: 'default' };
      } else {
        if (!apiKey) return;
        apiConfig = { apiKey };
      }
    }

    onCreatePool({
      pool_name: poolName,
      card_value: parseFloat(cardValue),
      provider: selectedBrand?.brand_name || '',
      client_id: clientId,
      brand_id: selectedBrandId,
      purchase_method: purchaseMethod,
      api_provider: purchaseMethod !== 'csv_only' ? apiProvider : undefined,
      api_config: purchaseMethod !== 'csv_only' ? apiConfig : undefined
    });

    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBrandId("");
    setPoolName("");
    setCardValue("");
    setPurchaseMethod("csv_only");
    setApiProvider("");
    setTilloApiKey("");
    setTilloSecretKey("");
    setTilloBrandCode("");
    setApiKey("");
    setUsername("");
    setPassword("");
    onOpenChange(false);
  };

  const showApiConfig = purchaseMethod !== 'csv_only' && supportsApi;
  const isStep2Valid = poolName && cardValue && 
    (purchaseMethod === 'csv_only' || (
      apiProvider && (
        (apiProvider === 'tillo' && tilloApiKey && tilloSecretKey && tilloBrandCode) ||
        (apiProvider === 'tango_card' && username && password) ||
        (apiProvider !== 'tillo' && apiProvider !== 'tango_card' && apiKey)
      )
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Select Gift Card Brand' : 'Configure Pool'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Choose the gift card brand for this pool' 
              : 'Set up your pool details and provisioning method'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <BrandSelector
              brands={brands}
              selectedBrandId={selectedBrandId}
              onSelectBrand={handleBrandSelect}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center gap-3">
                {selectedBrand?.logo_url && (
                  <img 
                    src={selectedBrand.logo_url} 
                    alt={selectedBrand.brand_name}
                    className="h-8 w-auto object-contain"
                  />
                )}
                <div>
                  <p className="font-semibold">{selectedBrand?.brand_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBrand?.category?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="pool-name">Pool Name</Label>
              <Input
                id="pool-name"
                placeholder="e.g., Starbucks $5 Rewards"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-value">Card Value ($)</Label>
              <Select value={cardValue} onValueChange={setCardValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedBrand?.typical_denominations as number[] || [5, 10, 25, 50]).map((amount) => (
                    <SelectItem key={amount} value={amount.toString()}>
                      ${amount.toFixed(2)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
              {cardValue === 'custom' && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter custom amount"
                  onChange={(e) => setCardValue(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-3">
              <Label>Purchase Method</Label>
              <RadioGroup value={purchaseMethod} onValueChange={setPurchaseMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv_only" id="csv-only" />
                  <Label htmlFor="csv-only" className="font-normal cursor-pointer">
                    CSV Only - Manual upload only
                  </Label>
                </div>
                {supportsApi && (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="api_only" id="api-only" />
                      <Label htmlFor="api-only" className="font-normal cursor-pointer">
                        API Only - Live provisioning from provider
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv_with_fallback" id="csv-fallback" />
                      <Label htmlFor="csv-fallback" className="font-normal cursor-pointer">
                        CSV with API Fallback - Use CSV first, API when empty
                      </Label>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>

            {showApiConfig && (
              <Card className="p-4 space-y-4 border-primary/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    Configure API provider for automated gift card provisioning
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-provider">API Provider</Label>
                  <Select value={apiProvider} onValueChange={setApiProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select API provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {API_PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {apiProvider === 'tillo' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tillo-api-key">Tillo API Key</Label>
                      <Input
                        id="tillo-api-key"
                        type="password"
                        placeholder="Enter your Tillo API key"
                        value={tilloApiKey}
                        onChange={(e) => setTilloApiKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tillo-secret">Tillo Secret Key</Label>
                      <Input
                        id="tillo-secret"
                        type="password"
                        placeholder="Enter your Tillo secret key"
                        value={tilloSecretKey}
                        onChange={(e) => setTilloSecretKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tillo-brand">Brand Code</Label>
                      <Input
                        id="tillo-brand"
                        placeholder="e.g., starbucks"
                        value={tilloBrandCode}
                        onChange={(e) => setTilloBrandCode(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {apiProvider === 'tango_card' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tango-username">Username</Label>
                      <Input
                        id="tango-username"
                        placeholder="Enter Tango Card username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tango-password">Password</Label>
                      <Input
                        id="tango-password"
                        type="password"
                        placeholder="Enter Tango Card password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {apiProvider && apiProvider !== 'tillo' && apiProvider !== 'tango_card' && (
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!selectedBrandId}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!isStep2Valid}>
              Create Pool
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
