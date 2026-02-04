import { useState, useEffect, useRef, useCallback } from "react";
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
import { MessageCircle, X, Send, Calculator, Plus, HelpCircle, Headphones, History, Trash2, Clock, EyeOff, Settings, RefreshCw, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { cn } from '@/shared/utils/cn';
import { toast } from "sonner";
import { supabase } from "@core/services/supabase";
import { useDrPhillipPreference, type HideDuration } from "@/shared/hooks";
import { useNavigate } from "react-router-dom";

type Message = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};

type ConnectionState = "idle" | "connecting" | "streaming" | "error";

// Streaming client with retry logic and proper auth
async function streamChatWithRetry(
  messages: Message[],
  onChunk: (content: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;
  const TIMEOUT_MS = 60000;

  // Get session token for proper auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    onError(new Error("Please sign in to use the chat assistant."));
    return;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // Combine with external abort signal
      if (abortSignal?.aborted) {
        throw new Error("Request cancelled");
      }
      abortSignal?.addEventListener("abort", () => controller.abort());

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dr-phillip-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            messages: messages.filter(m => !m.isError).map(m => ({ role: m.role, content: m.content }))
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        
        if (response.status === 429) {
          throw new Error("I'm helping too many people right now. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("Service temporarily unavailable. Please contact support.");
        }
        if (response.status === 401) {
          throw new Error("Session expired. Please refresh the page.");
        }
        if (response.status >= 500) {
          // Server error - retry
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorText || "Failed to get response");
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
                // Handle both OpenAI and Anthropic streaming formats
                const content = parsed.choices?.[0]?.delta?.content || 
                               parsed.delta?.text ||
                               parsed.content?.[0]?.text;
                if (content) {
                  assistantMessage += content;
                  onChunk(assistantMessage);
                }
              } catch {
                // Skip invalid JSON chunks
              }
            }
          }
        }
      }

      onComplete();
      return; // Success - exit retry loop
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on user-initiated abort or permanent errors
      if (error.name === "AbortError" || error.message === "Request cancelled") {
        onError(new Error("Request cancelled"));
        return;
      }
      
      // Don't retry on auth errors or rate limits
      if (error.message?.includes("Session expired") || 
          error.message?.includes("sign in") ||
          error.message?.includes("too many people")) {
        onError(error);
        return;
      }

      // Retry with exponential backoff for transient errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.log(`[DrPhillip] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  onError(lastError || new Error("Failed to connect after multiple attempts. Please try again."));
}

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
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    if (isOpen && isEnabled && !isHidden) {
      loadChatSessions();
    }
  }, [isOpen, isEnabled, isHidden]);

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
    if (messages.length > 0 && !isTyping && isEnabled && !isHidden) {
      saveCurrentChat();
    }
  }, [messages, isTyping, isEnabled, isHidden]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // All useCallback hooks must be defined before any conditional returns
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);
    setConnectionState("connecting");

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    await streamChatWithRetry(
      [...messages, userMessage],
      // onChunk - update message content as it streams
      (content) => {
        setConnectionState("streaming");
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === "assistant" && !lastMessage.isError) {
            newMessages[newMessages.length - 1] = { ...lastMessage, content };
          } else {
            newMessages.push({ role: "assistant", content });
          }
          return newMessages;
        });
      },
      // onComplete
      () => {
        setIsTyping(false);
        setIsLoading(false);
        setConnectionState("idle");
        abortControllerRef.current = null;
      },
      // onError
      (error) => {
        console.error("Chat error:", error);
        setConnectionState("error");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: error.message || "I'm temporarily unavailable. Please try again.",
            isError: true,
          },
        ]);
        setIsTyping(false);
        setIsLoading(false);
        abortControllerRef.current = null;
      },
      abortControllerRef.current.signal
    );
  }, [input, isLoading, messages]);

  const handleRetry = useCallback(() => {
    // Remove the last error message and retry the last user message
    const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf("user");
    if (lastUserMessageIndex >= 0) {
      const lastUserMessage = messages[lastUserMessageIndex];
      // Remove error messages after the last user message
      setMessages(prev => prev.slice(0, lastUserMessageIndex));
      // Set input to retry
      setInput(lastUserMessage.content);
    }
  }, [messages]);

  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsTyping(false);
    setConnectionState("idle");
  }, []);

  // Don't render if disabled or hidden (must be after ALL hooks including useCallback)
  if (!isEnabled || isHidden) {
    return null;
  }

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
      <div className="fixed bottom-6 right-6 z-50 group/container">
        {/* Main chat button */}
        <button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center relative animate-in fade-in slide-in-from-bottom-4 duration-500"
          aria-label="Open Dr. Phillip chat"
        >
          <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-50" style={{ animationDuration: "3s" }} />
          <MessageCircle className="h-7 w-7 relative z-10" strokeWidth={2.5} />
          <span className="absolute top-0 right-0 h-4 w-4 bg-green-400 rounded-full border-2 border-white z-20 flex items-center justify-center">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          </span>
        </button>

        {/* Dismiss button - appears on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-muted border border-border shadow-sm opacity-0 group-hover/container:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive z-30"
              aria-label="Hide Dr. Phillip"
              onClick={(e) => e.stopPropagation()}
            >
              <X className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground font-normal">
              <EyeOff className="h-4 w-4" />
              Hide Dr. Phillip
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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

        {/* Tooltip */}
        <span className="absolute -top-12 right-0 bg-background border px-4 py-2 rounded-lg text-sm font-medium opacity-0 group-hover/container:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
          Chat with Dr. Phillip
        </span>
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
      <div className="w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-background border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white/20 shadow-lg ring-2 ring-white/10">
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-sm">
                  DP
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
            </div>
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                Dr. Phillip
                <span className="text-[10px] bg-white/15 backdrop-blur-sm px-1.5 py-0.5 rounded-full font-medium">AI</span>
              </h3>
              <p className="text-xs text-white/80 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                {connectionState === "connecting" ? "Connecting..." : 
                 connectionState === "streaming" ? "Typing..." : 
                 "Online"}
              </p>
            </div>
          </div>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <History className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  <X className="h-4 w-4" />
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
        <div className="p-4 space-y-4 border-b bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 border shadow-sm shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-xs">
                DP
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/50 rounded-2xl rounded-tl-sm px-3 py-2.5">
              <p className="text-sm leading-relaxed">
                Hey there! I'm <span className="font-medium">Dr. Phillip</span>, your direct mail expert. I can help you create campaigns, calculate budgets, and answer any questions!
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("How do I create a new campaign?")}
              className="justify-start h-9 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2 text-violet-500" />
              Create Campaign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Help me calculate my campaign budget")}
              className="justify-start h-9 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
            >
              <Calculator className="h-4 w-4 mr-2 text-violet-500" />
              Budget Calculator
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What can this platform do?")}
              className="justify-start h-9 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
            >
              <HelpCircle className="h-4 w-4 mr-2 text-violet-500" />
              Platform Help
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLiveOperator}
            className="w-full justify-center gap-2 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300"
          >
            <Headphones className="h-4 w-4" />
            Talk to Live Operator
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2.5 items-end",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-7 w-7 border shadow-sm mb-0.5 shrink-0">
                  <AvatarFallback className={cn(
                    "text-white font-bold text-[10px]",
                    message.isError 
                      ? "bg-gradient-to-br from-red-400 to-red-500" 
                      : "bg-gradient-to-br from-violet-400 to-purple-500"
                  )}>
                    {message.isError ? <AlertCircle className="h-3.5 w-3.5" /> : "DP"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col gap-1 max-w-[85%]">
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-md shadow-md"
                      : message.isError
                        ? "bg-red-50 border border-red-200 text-red-800 rounded-bl-md"
                        : "bg-muted/70 rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                {/* Retry button for error messages */}
                {message.isError && index === messages.length - 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="self-start h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 px-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try again
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && !messages.some(m => m.role === "assistant" && !m.isError && messages.indexOf(m) === messages.length - 1) && (
            <div className="flex gap-2.5 items-end justify-start">
              <Avatar className="h-7 w-7 border shadow-sm mb-0.5 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-[10px]">
                  DP
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/70">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Connection state indicator */}
          {connectionState === "connecting" && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Connecting to Dr. Phillip...
            </div>
          )}
          
          {/* Live operator button - only show after successful conversation */}
          {messages.length > 2 && !messages[messages.length - 1]?.isError && !isLoading && (
            <div className="pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLiveOperator}
                className="w-full justify-center gap-2 h-8 text-xs bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:border-emerald-200"
              >
                <Headphones className="h-3.5 w-3.5" />
                Need more help? Talk to a live operator
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-gradient-to-t from-muted/30 to-transparent">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-[120px] resize-none pr-3 rounded-xl border-muted-foreground/20 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
              disabled={isLoading}
            />
          </div>
          {isLoading ? (
            <Button
              onClick={handleCancelRequest}
              size="icon"
              variant="outline"
              className="h-11 w-11 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md disabled:opacity-50 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Powered by Claude AI • Press Enter to send
        </p>
        </div>
      </div>
    </div>
  );
}
