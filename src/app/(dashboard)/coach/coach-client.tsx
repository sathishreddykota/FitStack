"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertCircle, Bot, Clock, History, Mic, Plus, Send, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/use-speech";
import { ChatMessage } from "./components/chat-message";

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}

const SUGGESTIONS = [
  "How did I do this week?",
  "What should I eat for dinner to hit my protein?",
  "Log 2 boiled eggs and a banana for breakfast",
  "How is my running going? Plan my next week of runs",
];

const TOOL_LABELS: Record<string, [running: string, done: string]> = {
  getToday: ["Checking today's log…", "Checked today's log"],
  getHistory: ["Reviewing your recent data…", "Reviewed your recent data"],
  getUpcomingWorkouts: ["Looking at your schedule…", "Checked your schedule"],
  getRuns: ["Looking at your runs…", "Checked your runs"],
  searchFoods: ["Searching foods…", "Searched foods"],
  logFood: ["Logging food…", "Food logged ✓"],
  logWater: ["Logging water…", "Water logged ✓"],
  logWeight: ["Logging weight…", "Weight logged ✓"],
};

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "");

function ChatPane({ id, initialMessages, onActivity }: { id: string; initialMessages: UIMessage[]; onActivity: () => void }) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech(setInput);

  const { messages, sendMessage, status, error, stop } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/coach/chat",
      // Only the new message is sent; the server loads history from the database.
      prepareSendMessagesRequest: ({ id: chatId, messages: msgs }) => ({ body: { id: chatId, message: msgs[msgs.length - 1] } }),
    }),
    onFinish: onActivity,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    speech.stop();
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg space-y-4 pt-8 text-center">
            <Bot className="mx-auto h-12 w-12 text-[var(--color-brand-400)]" />
            <p className="text-[var(--color-text-secondary)]">
              I can see your food, workouts, weight and recovery. Ask me anything — or tell me what you ate and I&apos;ll log it.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-left text-sm text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.parts.map((part, i) => {
              if (part.type.startsWith("tool-")) {
                const name = part.type.slice(5);
                const state = (part as { state?: string }).state;
                const label = TOOL_LABELS[name];
                if (!label) return null;
                return (
                  <p key={i} className="ml-14 text-xs font-medium text-[var(--color-text-muted)]">
                    {state === "output-available" ? label[1] : state === "output-error" ? `${name} failed` : label[0]}
                  </p>
                );
              }
              return null;
            })}
            {(() => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return text ? <ChatMessage role={m.role} content={text} /> : null;
            })()}
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex items-center gap-1 pl-14">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-brand-400)]" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-error-400)]/30 bg-[var(--color-error-400)]/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-error-400)]" />
            <p className="text-sm text-[var(--color-text-primary)]">{errorFromChat(error)}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mx-auto flex w-full max-w-4xl items-center gap-2 pt-3"
      >
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your training, food or progress…"
            maxLength={2000}
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-4 pl-6 pr-14 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
          {busy ? (
            <button type="button" onClick={stop} aria-label="Stop" className="absolute bottom-2 right-2 top-2 rounded-full bg-[var(--color-surface-3)] p-3 text-[var(--color-text-primary)]">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="absolute bottom-2 right-2 top-2 rounded-full bg-[var(--color-brand-500)] p-3 text-[var(--color-on-brand)] disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        {speech.supported && (
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start(input, (m) => toast.error(m)))}
            aria-label={speech.listening ? "Stop listening" : "Speak"}
            className={cn(
              "shrink-0 rounded-full border p-4",
              speech.listening ? "animate-pulse border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 text-[var(--color-error-500)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
            )}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </form>
      <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">
        FitStack Coach can make mistakes and isn&apos;t a doctor.
      </p>
    </>
  );
}

/** useChat surfaces the server's JSON error body as the message text. */
function errorFromChat(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* plain text */
  }
  return error.message || "The coach is unavailable right now. Please try again.";
}

export function CoachClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<{ id: string; messages: UIMessage[] }>(() => ({ id: newId(), messages: [] }));
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      setConversations(await api<Conversation[]>("/api/coach/conversations"));
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Conversation[]>("/api/coach/conversations")
      .then((list) => !cancelled && setConversations(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const open = async (id: string) => {
    try {
      setActive({ id, messages: await api<UIMessage[]>(`/api/coach/conversations/${id}`) });
      setHistoryOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/coach/conversations/${id}`, { method: "DELETE" });
      setConversations((c) => c.filter((x) => x.id !== id));
      if (active.id === id) setActive({ id: newId(), messages: [] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-120px)] w-full flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <Bot className="h-7 w-7 text-[var(--color-brand-400)]" /> Coach
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActive({ id: newId(), messages: [] })}
            aria-label="New chat"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 text-[var(--color-text-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              refreshList();
              setHistoryOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-text-primary)]"
          >
            <History className="h-4 w-4" />
            <span className="hidden text-sm font-medium sm:inline">History</span>
          </button>
        </div>
      </div>

      {<ChatPane key={active.id} id={active.id} initialMessages={active.messages} onActivity={refreshList} />}

      {historyOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}>
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-0)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
                <Clock className="h-5 w-5 text-[var(--color-brand-400)]" /> Chats
              </h2>
              <button onClick={() => setHistoryOpen(false)} aria-label="Close" className="p-2 text-[var(--color-text-muted)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {conversations.length === 0 && <p className="mt-10 text-center text-sm text-[var(--color-text-muted)]">No chats yet.</p>}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3",
                    active.id === c.id ? "border-[var(--color-brand-400)]/50 bg-[var(--color-surface-3)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
                  )}
                >
                  <button onClick={() => open(c.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{c.title || "Chat"}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {c.messageCount} messages
                    </p>
                  </button>
                  <button onClick={() => remove(c.id)} aria-label="Delete chat" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error-400)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
