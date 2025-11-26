import { RevealSettings } from "@/types/aceForms";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RevealPreview } from "./RevealPreview";
import { cardStylePresets } from "./CardStylePresets";
import { Sparkles, Palette, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevealDesignerProps {
  revealSettings: RevealSettings;
  onUpdate: (updates: Partial<RevealSettings>) => void;
}

export function RevealDesigner({ revealSettings, onUpdate }: RevealDesignerProps) {
  return (
    <div className="h-full grid grid-cols-[1fr_320px]">
      {/* Left Panel - Preview */}
      <div className="h-full overflow-y-auto p-8 bg-muted/30">
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Live Preview</h3>
            <p className="text-sm text-muted-foreground">See how your gift card reveal will look</p>
          </div>
          <RevealPreview revealSettings={revealSettings} />
        </div>
      </div>

      {/* Right Panel - Settings */}
      <ScrollArea className="h-full border-l bg-muted/50">
        <div className="p-4 space-y-6 pb-24">
        {/* Card Style Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Card Style</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cardStylePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onUpdate(preset.settings)}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all hover:scale-105",
                  revealSettings.cardStyle === preset.settings.cardStyle
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div 
                  className="w-full h-12 rounded mb-2"
                  style={{ background: preset.preview.gradient }}
                />
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Animation Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Animation</h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Animation Style</Label>
              <select
                value={revealSettings.animationStyle}
                onChange={(e) => onUpdate({ animationStyle: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="confetti">Confetti</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Confetti</Label>
              <Switch
                checked={revealSettings.showConfetti}
                onCheckedChange={(checked) => onUpdate({ showConfetti: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Card Appearance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Card Appearance</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Use Gradient</Label>
              <Switch
                checked={revealSettings.cardGradient}
                onCheckedChange={(checked) => onUpdate({ cardGradient: checked })}
              />
            </div>

            {revealSettings.cardGradient && (
              <div className="space-y-2 pl-4 border-l-2">
                <div>
                  <Label className="text-xs">Gradient Start</Label>
                  <Input
                    type="color"
                    value={revealSettings.customGradientStart || "#6366f1"}
                    onChange={(e) => onUpdate({ customGradientStart: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Gradient End</Label>
                  <Input
                    type="color"
                    value={revealSettings.customGradientEnd || "#8b5cf6"}
                    onChange={(e) => onUpdate({ customGradientEnd: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Brand Logo</Label>
              <Switch
                checked={revealSettings.showBrandLogo}
                onCheckedChange={(checked) => onUpdate({ showBrandLogo: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Action Buttons</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">QR Code</Label>
              <Switch
                checked={revealSettings.showQRCode}
                onCheckedChange={(checked) => onUpdate({ showQRCode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Open in App</Label>
              <Switch
                checked={revealSettings.showOpenInApp}
                onCheckedChange={(checked) => onUpdate({ showOpenInApp: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Share</Label>
              <Switch
                checked={revealSettings.showShareButton}
                onCheckedChange={(checked) => onUpdate({ showShareButton: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Wallet</Label>
              <Switch
                checked={revealSettings.showWalletButton}
                onCheckedChange={(checked) => onUpdate({ showWalletButton: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Download</Label>
              <Switch
                checked={revealSettings.showDownloadButton}
                onCheckedChange={(checked) => onUpdate({ showDownloadButton: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Instructions</h3>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Instructions</Label>
            <Switch
              checked={revealSettings.showInstructions}
              onCheckedChange={(checked) => onUpdate({ showInstructions: checked })}
            />
          </div>

          {revealSettings.showInstructions && (
            <div>
              <Label className="text-xs">Custom Instructions</Label>
              <Textarea
                value={revealSettings.customInstructions || ""}
                onChange={(e) => onUpdate({ customInstructions: e.target.value })}
                placeholder="Leave empty to use default instructions"
                className="mt-1"
                rows={3}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Background */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Background</h3>
          <div>
            <Label className="text-xs">Background Style</Label>
            <select
              value={revealSettings.revealBackground}
              onChange={(e) => onUpdate({ revealBackground: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid Color</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>

          {revealSettings.revealBackground === 'solid' && (
            <div>
              <Label className="text-xs">Background Color</Label>
              <Input
                type="color"
                value={revealSettings.revealBackgroundColor || "#ffffff"}
                onChange={(e) => onUpdate({ revealBackgroundColor: e.target.value })}
                className="mt-1 h-8"
              />
            </div>
          )}
        </div>
        </div>
      </ScrollArea>
    </div>
  );
}
