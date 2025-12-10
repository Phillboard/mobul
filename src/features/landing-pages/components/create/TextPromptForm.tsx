import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { GeneratePageRequest } from "@/types/landingPages";

interface TextPromptFormProps {
  onGenerate: (request: GeneratePageRequest) => void;
  isGenerating: boolean;
}

export function TextPromptForm({ onGenerate, isGenerating }: TextPromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [pageType, setPageType] = useState('generic');
  const [industry, setIndustry] = useState('generic');
  const [brandColors, setBrandColors] = useState('');
  const [brandFonts, setBrandFonts] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [callToAction, setCTA] = useState('');
  const [includeForm, setIncludeForm] = useState(false);
  const [includeTestimonials, setIncludeTestimonials] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: GeneratePageRequest = {
      prompt,
      pageType: pageType as any,
      industry: industry as any,
      brandColors: brandColors ? brandColors.split(',').map(c => c.trim()) : undefined,
      brandFonts: brandFonts ? brandFonts.split(',').map(f => f.trim()) : undefined,
      targetAudience,
      keyMessage,
      callToAction,
      includeForm,
      includeTestimonials,
      provider,
    };

    onGenerate(request);
  };

  const examplePrompts = [
    "Create a landing page for a real estate open house event this Saturday",
    "Build a lead gen page for a free marketing consultation with a form",
    "Design a thank you page for new customers with a special discount code",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">Describe Your Landing Page *</Label>
        <Textarea
          id="prompt"
          placeholder="Example: I need a landing page for a dental practice offering teeth whitening services. It should have a hero section, before/after photos, pricing, and a booking form."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={4}
          className="resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(example)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Page Type */}
        <div className="space-y-2">
          <Label htmlFor="pageType">Page Type</Label>
          <Select value={pageType} onValueChange={setPageType}>
            <SelectTrigger id="pageType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product Page</SelectItem>
              <SelectItem value="lead_gen">Lead Generation</SelectItem>
              <SelectItem value="thank_you">Thank You Page</SelectItem>
              <SelectItem value="event">Event Page</SelectItem>
              <SelectItem value="gift_card">Gift Card Redemption</SelectItem>
              <SelectItem value="generic">Generic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger id="industry">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_estate">Real Estate</SelectItem>
              <SelectItem value="automotive">Automotive</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="service">Service Business</SelectItem>
              <SelectItem value="generic">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Brand Customization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandColors">Brand Colors (optional)</Label>
          <Input
            id="brandColors"
            placeholder="#3B82F6, #10B981"
            value={brandColors}
            onChange={(e) => setBrandColors(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandFonts">Brand Fonts (optional)</Label>
          <Input
            id="brandFonts"
            placeholder="Inter, Roboto"
            value={brandFonts}
            onChange={(e) => setBrandFonts(e.target.value)}
          />
        </div>
      </div>

      {/* Target Audience & Message */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience">Target Audience (optional)</Label>
        <Input
          id="targetAudience"
          placeholder="Homeowners aged 30-50 looking to sell"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="keyMessage">Key Message (optional)</Label>
        <Input
          id="keyMessage"
          placeholder="Your dream home awaits"
          value={keyMessage}
          onChange={(e) => setKeyMessage(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cta">Call to Action (optional)</Label>
        <Input
          id="cta"
          placeholder="Schedule Your Free Consultation"
          value={callToAction}
          onChange={(e) => setCTA(e.target.value)}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <Label>Include:</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeForm"
            checked={includeForm}
            onCheckedChange={(checked) => setIncludeForm(checked as boolean)}
          />
          <label htmlFor="includeForm" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Contact/Lead Form
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeTestimonials"
            checked={includeTestimonials}
            onCheckedChange={(checked) => setIncludeTestimonials(checked as boolean)}
          />
          <label htmlFor="includeTestimonials" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Testimonials Section
          </label>
        </div>
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
        disabled={isGenerating || !prompt}
      >
        <Sparkles className="mr-2 h-5 w-5" />
        Generate Landing Page
      </Button>
    </form>
  );
}

