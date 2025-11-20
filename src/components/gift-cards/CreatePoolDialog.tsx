import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface CreatePoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePool: (pool: { 
    pool_name: string; 
    card_value: number; 
    provider: string;
    client_id: string;
    purchase_method?: string;
    api_provider?: string;
    api_config?: any;
  }) => void;
  clientId: string;
}

const PROVIDERS = [
  "Visa",
  "Mastercard",
  "Amazon",
  "Target",
  "Walmart",
  "Starbucks",
  "Gas Station",
  "Other"
];

const API_PROVIDERS = [
  { value: "tillo", label: "Tillo" },
  { value: "tango_card", label: "Tango Card" },
  { value: "giftbit", label: "Giftbit" },
  { value: "rybbon", label: "Rybbon" }
];

const TILLO_BRANDS = [
  { value: "amazon", label: "Amazon" },
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "target", label: "Target" },
  { value: "walmart", label: "Walmart" },
  { value: "starbucks", label: "Starbucks" }
];

export function CreatePoolDialog({
  open,
  onOpenChange,
  onCreatePool,
  clientId,
}: CreatePoolDialogProps) {
  const [poolName, setPoolName] = useState("");
  const [cardValue, setCardValue] = useState("");
  const [provider, setProvider] = useState("");
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

  const handleCreate = () => {
    if (!poolName || !cardValue || !provider) return;
    
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
      provider,
      client_id: clientId,
      purchase_method: purchaseMethod,
      api_provider: purchaseMethod !== 'csv_only' ? apiProvider : undefined,
      api_config: purchaseMethod !== 'csv_only' ? apiConfig : undefined
    });

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setPoolName("");
    setCardValue("");
    setProvider("");
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

  const showApiConfig = purchaseMethod !== 'csv_only';
  const isFormValid = poolName && cardValue && provider && 
    (purchaseMethod === 'csv_only' || (
      apiProvider && (
        (apiProvider === 'tillo' && tilloApiKey && tilloSecretKey && tilloBrandCode) ||
        (apiProvider === 'tango_card' && username && password) ||
        (apiProvider !== 'tillo' && apiProvider !== 'tango_card' && apiKey)
      )
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Gift Card Pool</DialogTitle>
          <DialogDescription>
            Create a new pool to organize gift cards by type and value
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pool-name">Pool Name</Label>
            <Input
              id="pool-name"
              placeholder="e.g., Visa $5 Rewards"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-value">Card Value ($)</Label>
            <Input
              id="card-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="5.00"
              value={cardValue}
              onChange={(e) => setCardValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <Select value={tilloBrandCode} onValueChange={setTilloBrandCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {TILLO_BRANDS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!isFormValid}
          >
            Create Pool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
