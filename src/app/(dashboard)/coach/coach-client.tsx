"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, AlertCircle, Mic, History, X, Plus, Clock } from "lucide-react";
import { ChatMessage } from "./components/chat-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CoachClient() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/coach/chat/history");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            setConversations(data.conversations);
            // Select the most recent one automatically
            setActiveConversationId(data.conversations[0].id);
            if (data.conversations[0].messages.length > 0) {
              setMessages(data.conversations[0].messages);
            } else {
              setMessages([{
                id: "1", role: "assistant", content: "Hi! I'm your FitStack AI Coach. I have your fitness profile and goals ready. How can I help you today?"
              }]);
            }
          } else {
            // No history at all
            setMessages([{
              id: "1", role: "assistant", content: "Hi! I'm your FitStack AI Coach. I have your fitness profile and goals ready. How can I help you today?"
            }]);
          }
        }
      } catch (e) {
        console.error(e);
        setMessages([{
          id: "1", role: "assistant", content: "Hi! I'm your FitStack AI Coach. I have your fitness profile and goals ready. How can I help you today?"
        }]);
      } finally {
        setIsFetchingHistory(false);
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeConversationId]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([{
      id: "1", role: "assistant", content: "Hi! I'm your FitStack AI Coach. I have your fitness profile and goals ready. How can I help you today?"
    }]);
    setIsSidebarOpen(false);
  };

  const selectConversation = (conv: any) => {
    setActiveConversationId(conv.id);
    if (conv.messages.length > 0) {
      setMessages(conv.messages);
    } else {
      setMessages([{
        id: "1", role: "assistant", content: "Hi! I'm your FitStack AI Coach. I have your fitness profile and goals ready. How can I help you today?"
      }]);
    }
    setIsSidebarOpen(false);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition is not supported in this browser.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let originalInput = input;
    if (originalInput && !originalInput.endsWith(' ')) {
      originalInput += ' ';
    }

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening... Click mic again to stop.");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      originalInput += finalTranscript;
      setInput(originalInput + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        toast.error("Voice recognition failed: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          conversationId: activeConversationId 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let aiResponseContent = "";
      const aiMessageId = (Date.now() + 1).toString();

      setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiResponseContent += chunk;
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === aiMessageId ? { ...msg, content: aiResponseContent } : msg
            )
          );
        }
      }
    } catch (err: any) {
      setError(err.message);
      setMessages((prev) => prev.filter(m => m.content !== ""));
    } finally {
      setIsLoading(false);
      // We should technically refresh history to get the newly created conversation ID if it was a new chat.
      // But we can do that in the background.
      if (!activeConversationId) {
        fetch("/api/coach/chat/history").then(r => r.json()).then(data => {
          if (data.conversations && data.conversations.length > 0) {
            setConversations(data.conversations);
            setActiveConversationId(data.conversations[0].id);
          }
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full animate-fade-in relative overflow-hidden">
      
      {/* ── Header ──────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4 relative z-10 bg-[var(--color-background)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Bot className="h-7 w-7 text-[var(--color-brand-400)]" /> AI Coach
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Your personalized fitness assistant.</p>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] transition-colors"
        >
          <History className="h-4 w-4" />
          <span className="text-sm font-medium hidden sm:inline">History</span>
        </button>
      </div>

      {/* ── Chat Area ──────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-[var(--color-surface-3)] scrollbar-track-transparent pb-4">
        {isFetchingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-500)]"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} role={message.role} content={message.content} />
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-4 w-full flex-row animate-pulse">
                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border bg-[var(--color-brand-500)]/10 border-[var(--color-brand-400)]/20 text-[var(--color-brand-400)]">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 p-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-brand-400)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-brand-400)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-brand-400)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[var(--color-error-400)]/30 bg-[var(--color-error-400)]/10 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[var(--color-error-400)] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[var(--color-text-primary)]">
                  <p className="font-bold text-[var(--color-error-400)] mb-1">Error communicating with AI</p>
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>

      {/* ── Input Area ──────────────────────── */}
      <div className="flex-shrink-0 pt-4 mt-auto">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center w-full max-w-4xl mx-auto"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your fitness goals, macros, or workouts..."
              className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-4 pl-6 pr-14 text-[15px] text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-brand-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-400)] transition-all placeholder:text-[var(--color-text-muted)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 rounded-full bg-[var(--color-brand-500)] p-3 text-white transition-all hover:bg-[var(--color-brand-600)] active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={isLoading}
            className={cn(
              "flex-shrink-0 ml-2 rounded-full p-4 flex items-center justify-center transition-all border",
              isListening 
                ? "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse" 
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)]"
            )}
            title={isListening ? "Stop listening" : "Speak"}
          >
            <Mic className="h-5 w-5" />
          </button>
        </form>
        <p className="text-center text-[11px] text-[var(--color-text-disabled)] mt-3">
          AI Coach can make mistakes. Consider verifying important fitness advice.
        </p>
      </div>

      {/* ── History Sidebar ──────────────────────── */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="absolute top-0 right-0 h-full w-full max-w-sm bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-in slide-in-from-right transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--color-brand-400)]" /> 
                Chat History
              </h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-[var(--color-border)]">
              <button 
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)] font-medium hover:bg-[var(--color-brand-500)]/20 transition-colors border border-[var(--color-brand-400)]/30"
              >
                <Plus className="h-5 w-5" />
                Start New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center text-[var(--color-text-muted)] mt-10 text-sm">
                  No previous conversations found from the last 7 days.
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border",
                      activeConversationId === conv.id 
                        ? "bg-[var(--color-surface-3)] border-[var(--color-brand-400)]/50 shadow-sm" 
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-brand-400)]/30 hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)]"
                    )}
                  >
                    <div className="font-semibold text-[15px] mb-1 text-[var(--color-text-primary)]">
                      {conv.title || "Conversation"}
                    </div>
                    <div className="text-xs opacity-70">
                      {new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {conv.messages.length} messages
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
