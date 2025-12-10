import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Sparkles, Code2, ArrowRight, Palette } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

export default function LandingPageCreate() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();

  if (!currentClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Create Landing Page</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create a gift card redemption page for your campaigns
          </p>
        </div>

        {/* Three Options */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* AI Builder */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => navigate('/landing-pages/new?mode=ai')}
          >
            <CardHeader>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">AI Builder</CardTitle>
              <CardDescription className="text-sm">
                Describe your page, AI generates it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>✨ Describe what you want</li>
                <li>📎 Attach your mailer</li>
                <li>🎯 AI generates HTML</li>
                <li>⚡ Ready in seconds</li>
              </ul>
              <Button className="w-full mt-4" size="sm">
                Start with AI
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Canvas Editor */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => navigate('/landing-pages/new/canvas')}
          >
            <CardHeader>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4">
                <Palette className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Canvas Editor</CardTitle>
              <CardDescription className="text-sm">
                Drag-and-drop visual design
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>🎨 Drag-drop elements</li>
                <li>📐 Pixel-perfect control</li>
                <li>🔤 Template tokens</li>
                <li>🤖 AI design assistant</li>
              </ul>
              <Button className="w-full mt-4" variant="secondary" size="sm">
                Open Canvas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Manual Editor */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
            onClick={() => navigate('/landing-pages/new?mode=manual')}
          >
            <CardHeader>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                <Code2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Code Editor</CardTitle>
              <CardDescription className="text-sm">
                Write HTML with live preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>💻 Full HTML control</li>
                <li>👁️ Live preview</li>
                <li>🔧 For developers</li>
                <li>🚀 Maximum flexibility</li>
              </ul>
              <Button className="w-full mt-4" variant="outline" size="sm">
                Start Coding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Landing pages wrap your ACE Forms for gift card redemption</p>
        </div>
      </div>
    </Layout>
  );
}

