import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [items, setItems] = useState([
    { id: "profile", title: "Complete your profile", description: "Add your name and preferences", completed: false },
    { id: "client", title: "Set up your organization", description: "Configure your company details", completed: false },
    { id: "template", title: "Create your first template", description: "Design a direct mail template", completed: false },
    { id: "audience", title: "Upload an audience", description: "Import your first list of recipients", completed: false },
    { id: "campaign", title: "Create a campaign", description: "Set up your first marketing campaign", completed: false },
    { id: "landing_page", title: "Build a landing page", description: "Create a personalized landing page", completed: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (user) checkProgress();
  }, [user]);

  const checkProgress = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // @ts-expect-error - Supabase type inference causing deep instantiation error
      const profile = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      // @ts-expect-error - Supabase type inference
      const client = await supabase.from("clients").select("id").limit(1).maybeSingle();
      // @ts-expect-error - Supabase type inference
      const templates = await supabase.from("templates").select("*", { count: "exact", head: true });
      // @ts-expect-error - Supabase type inference
      const audiences = await supabase.from("audiences").select("*", { count: "exact", head: true });
      // @ts-expect-error - Supabase type inference
      const campaigns = await supabase.from("campaigns").select("*", { count: "exact", head: true });
      // @ts-expect-error - Supabase type inference
      const pages = await supabase.from("landing_pages").select("*", { count: "exact", head: true });

      const updated = [...items];
      updated[0].completed = !!profile?.data?.full_name;
      updated[1].completed = !!client?.data;
      updated[2].completed = (templates?.count || 0) > 0;
      updated[3].completed = (audiences?.count || 0) > 0;
      updated[4].completed = (campaigns?.count || 0) > 0;
      updated[5].completed = (pages?.count || 0) > 0;

      setItems(updated);
      const completedCount = updated.filter(i => i.completed).length;
      setProgress((completedCount / updated.length) * 100);
    } catch (error) {
      console.error("Error checking progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = items.filter(i => i.completed).length;
  const allCompleted = completedCount === items.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allCompleted) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="py-8 text-center">
          <div className="mb-4 flex justify-center">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">🎉 Congratulations!</h3>
          <p className="text-muted-foreground">You've completed all onboarding steps. You're ready to launch your first campaign!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to launch your first campaign</CardDescription>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"}>{completedCount} of {items.length}</Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
            <div className="mt-1">
              {item.completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${item.completed ? "text-muted-foreground line-through" : ""}`}>{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
        <Button onClick={checkProgress} variant="outline" className="w-full">Refresh Progress</Button>
      </CardContent>
    </Card>
  );
}
