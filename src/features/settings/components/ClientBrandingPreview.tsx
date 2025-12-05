import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from '@shared/hooks';

interface ClientBrandingPreviewProps {
  client: any;
}

export function ClientBrandingPreview({ client }: ClientBrandingPreviewProps) {
  const { toast } = useToast();
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const brandColors = client.brand_colors_json || {
    primary: "#2563eb",
    secondary: "#8b5cf6",
    accent: "#ec4899",
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    toast({
      title: "Copied",
      description: `${label} color copied to clipboard`,
    });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Logo</h3>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 rounded-lg">
            <AvatarImage src={client.logo_url} alt={client.name} />
            <AvatarFallback className="rounded-lg text-2xl bg-primary/10">
              {client.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {client.logo_url && (
            <a
              href={client.logo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View full size <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Company Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Company Name</label>
          <p className="text-sm text-muted-foreground">{client.name}</p>
        </div>
        
        {client.tagline && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tagline</label>
            <p className="text-sm text-muted-foreground">{client.tagline}</p>
          </div>
        )}

        {client.website_url && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Website</label>
            <a
              href={client.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {client.website_url} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Brand Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Brand Colors</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Object.entries(brandColors).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground capitalize">
                  {key}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(value as string, key)}
                >
                  {copiedColor === key ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-12 w-full rounded-md border border-border shadow-sm"
                  style={{ backgroundColor: value as string }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{value as string}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Font Preferences */}
      {client.font_preferences && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Font Preferences</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Heading Font</label>
              <p className="text-sm text-foreground" style={{ fontFamily: client.font_preferences.heading }}>
                {client.font_preferences.heading}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Body Font</label>
              <p className="text-sm text-foreground" style={{ fontFamily: client.font_preferences.body }}>
                {client.font_preferences.body}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
