import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from '@shared/hooks';
import { MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAuth } from '@core/auth/AuthProvider';

interface CommentsTabProps {
  campaignId: string;
}

export function CommentsTab({ campaignId }: CommentsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["campaign-comments", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_comments")
        .select("*, user:profiles(full_name, email)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!commentText.trim()) {
        throw new Error("Comment cannot be empty");
      }

      const { error } = await supabase.from("campaign_comments").insert({
        campaign_id: campaignId,
        user_id: user?.id,
        comment_text: commentText,
      });

      if (error) throw error;

      // Check for @mentions and send notifications
      const mentions = commentText.match(/@(\w+)/g);
      if (mentions && mentions.length > 0) {
        await supabase.functions.invoke("send-comment-notification", {
          body: {
            campaignId,
            comment: commentText,
            mentions,
          },
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Comment added" });
      queryClient.invalidateQueries({ queryKey: ["campaign-comments", campaignId] });
      setNewComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Share your feedback or ask a question... Use @name to mention someone"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Tip: Use @username to notify team members
            </p>
            <Button
              onClick={() => addCommentMutation.mutate(newComment)}
              disabled={addCommentMutation.isPending || !newComment.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Comments</CardTitle>
            <Badge variant="secondary">
              {comments?.length || 0} {comments?.length === 1 ? "comment" : "comments"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!comments || comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm mt-2">Be the first to share your feedback</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarFallback>
                      {comment.user?.full_name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {comment.user?.full_name || "Unknown User"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {comment.comment_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
