import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Search } from "lucide-react";
import { GeneratePageRequest } from "@/types/landingPages";
import { toast } from "sonner";

interface LinkAnalysisFormProps {
  onGenerate: (request: GeneratePageRequest) => void;
  isGenerating: boolean;
}

export function LinkAnalysisForm({ onGenerate, isGenerating }: LinkAnalysisFormProps) {
  const [url, setUrl] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const request: GeneratePageRequest = {
      prompt: additionalInstructions || 'Create a landing page inspired by this website, but with original content.',
      sourceUrl: url,
      provider,
    };

    onGenerate(request);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="url">Website URL *</Label>
        <div className="relative">
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/landing-page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="pr-10"
          />
          <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll analyze this page and create a unique landing page inspired by its design
        </p>
      </div>

      {/* What to Learn */}
      <div className="space-y-2">
        <Label htmlFor="instructions">What would you like to replicate? *</Label>
        <Textarea
          id="instructions"
          placeholder="Example: I like the layout and color scheme, but create it for a dental practice instead of a law firm. Include a booking form."
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          The AI will create original content - it won't copy the source page directly
        </p>
      </div>

      {/* AI Provider */}
      <div className="space-y-2">
        <Label htmlFor="provider">AI Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
            <SelectItem value="anthropic">Anthropic (Claude 3)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isGenerating || !url}
      >
        <Search className="mr-2 h-5 w-5" />
        Analyze & Generate
      </Button>
    </form>
  );
}

