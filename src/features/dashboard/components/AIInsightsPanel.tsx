import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users, Target, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Insight {
  id: string;
  title: string;
  description: string;
  type: "success" | "warning" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AIInsightsPanelProps {
  insights?: Insight[];
}

const defaultInsights: Insight[] = [
  {
    id: "1",
    title: "Campaign Performance Peak",
    description: "Your campaigns perform 32% better on Tuesday afternoons. Consider scheduling more sends during this time.",
    type: "success",
  },
  {
    id: "2",
    title: "Audience Engagement Opportunity",
    description: "Recipients aged 35-44 have a 58% higher response rate. Expand targeting in this demographic.",
    type: "info",
  },
  {
    id: "3",
    title: "Gift Card Optimization",
    description: "Average redemption time is 3.2 days. Consider follow-up messaging on day 4.",
    type: "warning",
  },
];

const typeStyles = {
  success: {
    badge: "bg-success/10 text-success border-success/20",
    icon: TrendingUp,
    gradient: "from-success/10 to-transparent",
  },
  warning: {
    badge: "bg-warning/10 text-warning border-warning/20",
    icon: Target,
    gradient: "from-warning/10 to-transparent",
  },
  info: {
    badge: "bg-primary/10 text-primary border-primary/20",
    icon: Users,
    gradient: "from-primary/10 to-transparent",
  },
};

export function AIInsightsPanel({ insights = defaultInsights }: AIInsightsPanelProps) {
  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 shadow-glow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Insights</CardTitle>
              <CardDescription>Personalized recommendations for your campaigns</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-glow-pulse">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const style = typeStyles[insight.type];
          const Icon = style.icon;
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`p-4 rounded-lg bg-gradient-to-r ${style.gradient} border border-border/50 hover:border-border transition-all group`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${style.badge} mt-0.5`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={insight.action.onClick}
                        className="mt-2 h-8 text-xs -ml-2 group-hover:text-primary"
                      >
                        {insight.action.label}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
