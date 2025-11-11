import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { QrCode } from "lucide-react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: QRCodeConfig) => void;
  initialData?: QRCodeConfig;
}

export interface QRCodeConfig {
  layerId?: string;
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  customUtm1?: string;
  customUtm2?: string;
  customUtm3?: string;
  customUtm4?: string;
  customUtm5?: string;
  size: number;
  foregroundColor: string;
  backgroundColor: string;
}

export function QRCodeDialog({ open, onOpenChange, onSave, initialData }: QRCodeDialogProps) {
  const [config, setConfig] = useState<QRCodeConfig>({
    baseUrl: "",
    utmSource: "directmail",
    utmMedium: "postcard",
    utmCampaign: "",
    size: 200,
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setConfig({ ...config, ...initialData });
    }
  }, [initialData]);

  const generatePreviewUrl = () => {
    const params = new URLSearchParams();
    if (config.utmSource) params.append("utm_source", config.utmSource);
    if (config.utmMedium) params.append("utm_medium", config.utmMedium);
    if (config.utmCampaign) params.append("utm_campaign", config.utmCampaign);
    if (config.utmTerm) params.append("utm_term", config.utmTerm);
    if (config.utmContent) params.append("utm_content", config.utmContent);
    if (config.customUtm1) params.append("custom_utm_1", config.customUtm1);
    if (config.customUtm2) params.append("custom_utm_2", config.customUtm2);
    if (config.customUtm3) params.append("custom_utm_3", config.customUtm3);
    if (config.customUtm4) params.append("custom_utm_4", config.customUtm4);
    if (config.customUtm5) params.append("custom_utm_5", config.customUtm5);

    const baseUrl = config.baseUrl || "{{purl}}";
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your QR code with personalized URLs and UTM tracking parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL *</Label>
            <Input
              id="baseUrl"
              placeholder="https://example.com or use {{purl}}"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use merge fields like {`{{purl}}`} for personalized URLs
            </p>
          </div>

          {/* UTM Parameters */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">UTM Parameters</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utmSource">UTM Source</Label>
                <Input
                  id="utmSource"
                  placeholder="e.g., directmail"
                  value={config.utmSource}
                  onChange={(e) => setConfig({ ...config, utmSource: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmMedium">UTM Medium</Label>
                <Input
                  id="utmMedium"
                  placeholder="e.g., postcard"
                  value={config.utmMedium}
                  onChange={(e) => setConfig({ ...config, utmMedium: e.target.value })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="utmCampaign">UTM Campaign</Label>
                <Input
                  id="utmCampaign"
                  placeholder="e.g., spring_2024"
                  value={config.utmCampaign}
                  onChange={(e) => setConfig({ ...config, utmCampaign: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmTerm">UTM Term (Optional)</Label>
                <Input
                  id="utmTerm"
                  placeholder="e.g., keyword"
                  value={config.utmTerm || ""}
                  onChange={(e) => setConfig({ ...config, utmTerm: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmContent">UTM Content (Optional)</Label>
                <Input
                  id="utmContent"
                  placeholder="e.g., variant_a"
                  value={config.utmContent || ""}
                  onChange={(e) => setConfig({ ...config, utmContent: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Custom UTM Fields */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">Custom UTM Parameters</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="space-y-2">
                  <Label htmlFor={`customUtm${num}`}>Custom UTM {num}</Label>
                  <Input
                    id={`customUtm${num}`}
                    placeholder={`Custom parameter ${num}`}
                    value={(config as any)[`customUtm${num}`] || ""}
                    onChange={(e) => setConfig({ ...config, [`customUtm${num}`]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Styling */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">QR Code Appearance</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Size: {config.size}px</Label>
                <Slider
                  value={[config.size]}
                  onValueChange={([value]) => setConfig({ ...config, size: value })}
                  min={100}
                  max={500}
                  step={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="foregroundColor">Foreground Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="foregroundColor"
                      type="color"
                      value={config.foregroundColor}
                      onChange={(e) => setConfig({ ...config, foregroundColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={config.foregroundColor}
                      onChange={(e) => setConfig({ ...config, foregroundColor: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview URL */}
          <div className="space-y-2 border-t pt-4">
            <Label>Generated URL Preview</Label>
            <div className="p-3 bg-muted rounded-md text-xs font-mono break-all">
              {generatePreviewUrl()}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!config.baseUrl}>
            {initialData ? "Update" : "Add"} QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
