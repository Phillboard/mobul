import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Image, 
  Link2, 
  Palette,
  ArrowRight,
  Bot,
  Zap
} from "lucide-react";

export default function AILandingPageCreate() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const modes = [
    {
      id: 'text_prompt',
      title: 'Start with AI',
      description: 'Describe your page and let AI build it for you',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      features: ['⚡ Fastest way to start', '🎯 Optimized for conversions', '📱 Mobile-first design'],
      popular: true,
    },
    {
      id: 'image_upload',
      title: 'Upload Mailer',
      description: 'Transform your print mailer into a landing page',
      icon: Image,
      color: 'from-blue-500 to-cyan-500',
      features: ['🎨 Matches your brand', '🔄 Print to web conversion', '✨ Enhanced with web features'],
    },
    {
      id: 'link_analysis',
      title: 'Analyze Website',
      description: 'Learn from an existing website design',
      icon: Link2,
      color: 'from-green-500 to-emerald-500',
      features: ['🔍 Competitive analysis', '💡 Best practices', '🎯 Improved conversion'],
    },
    {
      id: 'manual',
      title: 'Start from Scratch',
      description: 'Use the visual editor to build your page',
      icon: Palette,
      color: 'from-orange-500 to-red-500',
      features: ['🎨 Full creative control', '🧩 Drag-and-drop blocks', '✨ No AI required'],
    },
  ];

  const handleModeSelect = (modeId: string) => {
    if (modeId === 'manual') {
      // Go directly to the new visual editor
      navigate('/landing-pages/new/editor');
    } else {
      // Go to AI generation flow
      navigate(`/landing-pages/ai-generate/${modeId}`);
    }
  };

  return (
    <Layout>
      <div className="container max-w-7xl py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Create Your Landing Page
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose how you'd like to start. Our AI can help you create a professional, high-converting landing page in seconds.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modes.map((mode) => (
            <Card
              key={mode.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                selectedMode === mode.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedMode(mode.id)}
            >
              {mode.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="space-y-4">
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                  <mode.icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{mode.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {mode.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {mode.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={selectedMode === mode.id ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeSelect(mode.id);
                  }}
                >
                  {mode.id === 'manual' ? 'Start Building' : 'Continue with AI'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Pro tip:</strong> All pages are fully editable after creation. You can switch between AI chat editing and visual editing at any time.
          </p>
        </div>
      </div>
    </Layout>
  );
}

