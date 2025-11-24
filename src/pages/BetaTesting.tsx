import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Send, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BetaFeedback {
  id: string;
  user_id: string;
  feedback_type: string;
  rating: number | null;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function BetaTesting() {
  const [feedbackType, setFeedbackType] = useState("bug");
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["beta-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beta_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BetaFeedback[];
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("beta_feedback").insert({
        user_id: user.id,
        feedback_type: feedbackType,
        rating: feedbackType === "feedback" ? rating : null,
        title,
        description,
        status: "new",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beta-feedback"] });
      toast({ title: "Success", description: "Feedback submitted successfully" });
      setTitle("");
      setDescription("");
      setRating(5);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stats = {
    total: feedback?.length || 0,
    bugs: feedback?.filter((f) => f.feedback_type === "bug").length || 0,
    features: feedback?.filter((f) => f.feedback_type === "feature_request").length || 0,
    general: feedback?.filter((f) => f.feedback_type === "feedback").length || 0,
    resolved: feedback?.filter((f) => f.status === "resolved").length || 0,
  };

  const avgRating = feedback?.filter((f) => f.rating)
    .reduce((sum, f) => sum + (f.rating || 0), 0) / (feedback?.filter((f) => f.rating).length || 1) || 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug": return "destructive";
      case "feature_request": return "default";
      case "feedback": return "secondary";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "default";
      case "in_progress": return "secondary";
      case "resolved": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Beta Testing Dashboard</h1>
        <p className="text-muted-foreground">Collect and manage beta user feedback</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.bugs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.features}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>Help us improve by sharing your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug Report</SelectItem>
                  <SelectItem value="feature_request">💡 Feature Request</SelectItem>
                  <SelectItem value="feedback">💬 General Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {feedbackType === "feedback" && (
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      variant={rating >= value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRating(value)}
                    >
                      <Star className={`h-4 w-4 ${rating >= value ? "fill-current" : ""}`} />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Brief summary of your feedback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Detailed description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={() => submitFeedback.mutate()}
              disabled={!title || !description || submitFeedback.isPending}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : feedback?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No feedback yet</p>
              </div>
            ) : (
              feedback?.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(item.feedback_type)}>
                          {item.feedback_type === "bug" && "🐛 Bug"}
                          {item.feedback_type === "feature_request" && "💡 Feature"}
                          {item.feedback_type === "feedback" && "💬 Feedback"}
                        </Badge>
                        <Badge variant={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: item.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>User {item.user_id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
