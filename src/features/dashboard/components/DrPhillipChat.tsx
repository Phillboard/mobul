import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/shared/components/ui/dropdown-menu";
import { MessageCircle, X, Send, Calculator, Plus, HelpCircle, Headphones, History, Trash2, Clock, EyeOff, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { cn } from '@/shared/utils/utils';
import { toast } from "sonner";
import { supabase } from "@core/services/supabase";
import { useDrPhillipPreference, type HideDuration } from "@/shared/hooks";
import { useNavigate } from "react-router-dom";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
};

// Temporary type until database types regenerate
type DrPhillipChatRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  messages: any;
  created_at: string;
  updated_at: string;
};

export function DrPhillipChat() {
  const navigate = useNavigate();
  const { isEnabled, isHidden, hideFor } = useDrPhillipPreference();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Don't render if disabled or hidden
  if (!isEnabled || isHidden) {
    return null;
  }

  const handleHide = (duration: HideDuration) => {
    hideFor(duration);
    setIsOpen(false);
    const durationText = {
      "1hour": "1 hour",
      "1day": "1 day",
      "1week": "1 week",
      "forever": "permanently",
    }[duration];
    toast.info(`Dr. Phillip hidden for ${durationText}`, {
      description: "You can reactivate in Settings → General → Chat Assistant",
      action: {
        label: "Settings",
        onClick: () => navigate("/settings/general"),
      },
    });
  };

  // Load chat sessions from database
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  const loadChatSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("dr_phillip_chats" as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const chats = data as unknown as DrPhillipChatRow[];
        setChatSessions(chats.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: chat.messages as Message[],
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        })));

        // If no current chat, load the most recent one
        if (!currentChatId && chats.length > 0) {
          setCurrentChatId(chats[0].id);
          setMessages(chats[0].messages as Message[]);
        }
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    }
  };

  const saveCurrentChat = async () => {
    if (messages.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === "user");
      const title = firstUserMessage 
        ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        : "New Chat";

      if (currentChatId) {
        // Update existing chat
        const { error } = await supabase
          .from("dr_phillip_chats" as any)
          .update({ 
            messages: messages,
            title: title,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentChatId);

        if (error) throw error;
      } else {
        // Create new chat
        const { data, error } = await supabase
          .from("dr_phillip_chats" as any)
          .insert({
            user_id: user.id,
            title: title,
            messages: messages,
          } as any)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentChatId((data as unknown as DrPhillipChatRow).id);
        }
      }

      await loadChatSessions();
    } catch (error) {
      console.error("Failed to save chat:", error);
    }
  };

  // Save chat after messages update
  useEffect(() => {
    if (messages.length > 0 && !isTyping) {
      saveCurrentChat();
    }
  }, [messages, isTyping]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dr-phillip-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("I'm helping too many people right now. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("Service temporarily unavailable. Please contact support.");
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1]?.role === "assistant") {
                      newMessages[newMessages.length - 1].content = assistantMessage;
                    } else {
                      newMessages.push({ role: "assistant", content: assistantMessage });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "I'm temporarily unavailable. Please try again.",
        },
      ]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLiveOperator = () => {
    toast.info("Connecting to live operator...", {
      description: "A team member will respond via email within 1 business hour.",
    });
    // In production, this would open a support ticket or redirect to live chat
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setShowHistory(false);
  };

  const handleLoadChat = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentChatId(session.id);
    setShowHistory(false);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("dr_phillip_chats" as any)
        .delete()
        .eq("id", chatId);

      if (error) throw error;

      if (currentChatId === chatId) {
        handleNewChat();
      }

      await loadChatSessions();
      toast.success("Chat deleted");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center group relative animate-in fade-in slide-in-from-bottom-4 duration-500"
          aria-label="Open Dr. Phillip chat"
        >
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" style={{ animationDuration: "2s" }} />
          <MessageCircle className="h-7 w-7 relative z-10" strokeWidth={2.5} />
          <span className="absolute top-1 right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white z-20" />
          <span className="absolute -top-12 right-0 bg-background border px-4 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
            💬 Chat with Dr. Phillip
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex gap-2 items-end">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-64 h-[600px] max-h-[80vh] bg-background border rounded-lg shadow-xl flex flex-col animate-in slide-in-from-right-4">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Chat History</h3>
            <Button onClick={handleNewChat} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleLoadChat(session)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer hover:bg-muted/50 group relative",
                    currentChatId === session.id && "bg-muted"
                  )}
                >
                  <p className="text-sm font-medium truncate pr-6">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleDeleteChat(session.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {chatSessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No chat history yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Window */}
      <div className="w-full max-w-md h-[600px] max-h-[80vh] flex flex-col bg-background border rounded-lg shadow-2xl animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-11 w-11 border-2 border-white/30 shadow-md">
                <AvatarFallback className="bg-blue-400 text-white font-bold text-lg">
                  🎯
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Dr. Phillip
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">AI</span>
              </h3>
              <p className="text-xs opacity-90 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Online • Usually replies instantly
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="text-white hover:bg-white/10"
            >
              <History className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close Chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground font-normal">
                  <EyeOff className="h-4 w-4" />
                  Hide Dr. Phillip
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleHide("1hour")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Hide for 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleHide("1day")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Hide for 1 day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleHide("1week")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Hide for 1 week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleHide("forever")} className="text-destructive">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide forever
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings/general")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 space-y-3 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 border shadow-sm">
              <AvatarFallback className="bg-blue-400 text-white font-bold">
                🎯
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Hey there! 👋</p>
              <p className="text-sm text-muted-foreground">
                I'm Dr. Phillip, your direct mail expert. I can help you create campaigns, calculate budgets, and answer any questions!
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("How do I create a new campaign?")}
              className="justify-start hover:bg-blue-50 hover:border-blue-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Help me calculate my campaign budget")}
              className="justify-start hover:bg-blue-50 hover:border-blue-200"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Budget Calculator
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What can this platform do?")}
              className="justify-start hover:bg-blue-50 hover:border-blue-200"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Platform Help
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLiveOperator}
            className="w-full justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
          >
            <Headphones className="h-4 w-4" />
            Talk to Live Operator
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 items-end",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 border shadow-sm mb-1">
                  <AvatarFallback className="bg-blue-400 text-white font-bold text-sm">
                    🎯
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm shadow-sm",
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 items-end justify-start">
              <Avatar className="h-8 w-8 border shadow-sm mb-1">
                <AvatarFallback className="bg-blue-400 text-white font-bold text-sm">
                  🎯
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-muted shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          {messages.length > 0 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLiveOperator}
                className="w-full justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Headphones className="h-4 w-4" />
                Need more help? Talk to a live operator
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[120px] resize-none border-2 focus-visible:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by AI • Press Enter to send
        </p>
        </div>
      </div>
    </div>
  );
}
