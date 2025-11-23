import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertTriangle, ExternalLink, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium";
  completed: boolean;
  autoCheck?: () => Promise<boolean>;
  actionUrl?: string;
}

export default function LaunchChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "security-rls",
      category: "Security",
      title: "Verify RLS Policies",
      description: "All tables have proper Row Level Security policies",
      priority: "critical",
      completed: false,
    },
    {
      id: "security-passwords",
      category: "Security",
      title: "Enable Password Protection",
      description: "Leaked password detection is enabled",
      priority: "critical",
      completed: false,
    },
    {
      id: "billing-stripe",
      category: "Billing",
      title: "Configure Stripe",
      description: "Stripe subscription plans configured",
      priority: "critical",
      completed: false,
    },
    {
      id: "data-integrity",
      category: "Data",
      title: "Validate Gift Card Pools",
      description: "All gift card pool calculations are correct",
      priority: "critical",
      completed: false,
      autoCheck: async () => {
        const { data } = await supabase
          .from("gift_card_pools")
          .select("total_cards, available_cards, claimed_cards, delivered_cards, failed_cards");
        return data?.every(p => 
          p.total_cards === (p.available_cards + p.claimed_cards + p.delivered_cards + p.failed_cards)
        ) || false;
      },
    },
    {
      id: "backup",
      category: "Infrastructure",
      title: "Database Backup",
      description: "Full database backup created",
      priority: "critical",
      completed: false,
    },
    {
      id: "domain",
      category: "Infrastructure",
      title: "Custom Domain",
      description: "Production domain configured with SSL",
      priority: "high",
      completed: false,
    },
    {
      id: "email",
      category: "Infrastructure",
      title: "Email Service",
      description: "SendGrid/SES configured with templates",
      priority: "high",
      completed: false,
    },
    {
      id: "sms",
      category: "Infrastructure",
      title: "SMS Configuration",
      description: "Twilio A2P 10DLC registration complete",
      priority: "high",
      completed: false,
    },
    {
      id: "monitoring",
      category: "Monitoring",
      title: "Error Tracking",
      description: "Error tracking and alerts configured",
      priority: "high",
      completed: false,
      autoCheck: async () => {
        const { count } = await supabase
          .from("error_logs")
          .select("*", { count: "exact", head: true });
        return count !== null;
      },
    },
    {
      id: "testing",
      category: "Testing",
      title: "Manual Testing",
      description: "All critical user flows tested",
      priority: "critical",
      completed: false,
    },
    {
      id: "legal-privacy",
      category: "Legal",
      title: "Privacy Policy",
      description: "Privacy policy page published",
      priority: "high",
      completed: false,
      actionUrl: "/privacy-policy",
    },
    {
      id: "legal-terms",
      category: "Legal",
      title: "Terms of Service",
      description: "Terms of service page published",
      priority: "high",
      completed: false,
      actionUrl: "/terms-of-service",
    },
    {
      id: "docs",
      category: "Documentation",
      title: "User Documentation",
      description: "Help center and FAQs complete",
      priority: "medium",
      completed: false,
      actionUrl: "/help",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runAutoChecks();
  }, []);

  const runAutoChecks = async () => {
    setLoading(true);
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      if (updatedItems[i].autoCheck) {
        try {
          const result = await updatedItems[i].autoCheck!();
          updatedItems[i].completed = result;
        } catch (error) {
          console.error(`Auto-check failed for ${updatedItems[i].id}:`, error);
        }
      }
    }

    setItems(updatedItems);
    setLoading(false);
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const completedCount = items.filter(i => i.completed).length;
  const criticalCount = items.filter(i => i.priority === "critical" && !i.completed).length;
  const progress = (completedCount / items.length) * 100;
  const readyToLaunch = criticalCount === 0 && completedCount >= items.length * 0.9;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Launch Checklist</h1>
          <p className="text-muted-foreground">Complete these items before going live</p>
        </div>
        <Button onClick={runAutoChecks} variant="outline" disabled={loading}>
          {loading ? "Checking..." : "Run Auto-Checks"}
        </Button>
      </div>

      <Card className={readyToLaunch ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {readyToLaunch ? "🎉 Ready to Launch!" : "Launch Readiness"}
              </CardTitle>
              <CardDescription>
                {completedCount} of {items.length} items complete
                {criticalCount > 0 && ` • ${criticalCount} critical items remaining`}
              </CardDescription>
            </div>
            {readyToLaunch && (
              <Badge className="bg-green-600">
                <Rocket className="mr-1 h-3 w-3" />
                Launch Ready
              </Badge>
            )}
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
      </Card>

      {criticalCount > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Items
            </CardTitle>
            <CardDescription>
              These items must be completed before launch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items
                .filter(i => i.priority === "critical" && !i.completed)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <Circle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">{item.title}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {categories.map(category => {
        const categoryItems = items.filter(i => i.category === category);
        const categoryCompleted = categoryItems.filter(i => i.completed).length;

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{category}</CardTitle>
                <Badge variant={categoryCompleted === categoryItems.length ? "default" : "secondary"}>
                  {categoryCompleted}/{categoryItems.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="mt-1"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${item.completed ? "text-muted-foreground line-through" : ""}`}>
                          {item.title}
                        </h4>
                        {item.priority === "critical" && !item.completed && (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.actionUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.actionUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
