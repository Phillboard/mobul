/**
 * CommentsSection Component
 * 
 * A reusable comments/notes system with @mentions support.
 * Can be attached to campaigns, contacts, or other entities.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Loader2,
  AtSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  mentions?: string[];
}

interface CommentsSectionProps {
  entityType: 'campaign' | 'contact' | 'form' | 'task';
  entityId: string;
  clientId: string;
}

export function CommentsSection({
  entityType,
  entityId,
  clientId,
}: CommentsSectionProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
  });

  // Fetch team members for @mentions
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-mentions', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('client_id', clientId);

      if (error) throw error;
      return data;
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (text: string) => {
      // Extract mentions from text
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[2]); // User ID
      }

      // Clean content for display (convert mentions to display format)
      const cleanContent = text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user?.id,
          content: cleanContent,
          mentions,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update comment mutation
  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      toast({
        title: 'Comment Deleted',
        description: 'Your comment has been removed',
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    addComment.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Detect @ for mentions
    if (e.key === '@') {
      setShowMentions(true);
      setMentionSearch("");
    }
  };

  const insertMention = (member: any) => {
    const name = member.profiles?.full_name || member.profiles?.email;
    const mention = `@[${name}](${member.user_id}) `;
    setContent(prev => prev + mention);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  // Filter team members for mention search
  const filteredMembers = teamMembers.filter(m => {
    const name = m.profiles?.full_name?.toLowerCase() || '';
    const email = m.profiles?.email?.toLowerCase() || '';
    const search = mentionSearch.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments & Notes
          <Badge variant="secondary" className="ml-auto">
            {comments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Be the first to add a note</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.profiles?.full_name || null, comment.profiles?.email || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.full_name || comment.profiles?.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                    
                    {/* Actions */}
                    {comment.user_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteComment.mutate(comment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mt-1 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateComment.mutate({ id: comment.id, content: editContent })}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditContent("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment... (Use @ to mention someone)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="pr-12 resize-none"
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
            onClick={handleSubmit}
            disabled={!content.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          
          {/* Mention Popover */}
          {showMentions && (
            <Popover open={showMentions} onOpenChange={setShowMentions}>
              <PopoverTrigger asChild>
                <div className="absolute left-0 bottom-full" />
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="start">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Mention someone
                </div>
                {filteredMembers.slice(0, 5).map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => insertMention(member)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profiles?.full_name || null, member.profiles?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {member.profiles?.full_name || 'User'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.profiles?.email}
                      </div>
                    </div>
                  </button>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No team members found
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘</kbd>+
          <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to submit
        </p>
      </CardContent>
    </Card>
  );
}

