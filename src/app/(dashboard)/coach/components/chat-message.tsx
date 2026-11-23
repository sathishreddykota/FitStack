import { Bot, User } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

// Plans come back as tables: parse them (GFM) and let wide ones scroll sideways on phones.
const mdComponents: Components = {
  table: ({ children }) => (
    <div className="not-prose my-3 -mr-4 overflow-x-auto pr-4">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-[var(--color-border-subtle)] px-3 py-2 align-top text-[var(--color-text-primary)]">{children}</td>,
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === "system" || role === "data") return null;

  const isUser = role === "user";

  return (
    <div className={cn("flex gap-4 w-full", isUser ? "flex-row-reverse" : "flex-row")}>
      <div 
        className={cn(
          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border",
          isUser 
            ? "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)]" 
            : "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-400)]/20 text-[var(--color-brand-400)]"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      
      <div 
        className={cn(
          "flex min-w-0 flex-col max-w-[85%] rounded-2xl p-4",
          isUser 
            ? "bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] rounded-tr-sm"
            : "bg-transparent text-[var(--color-text-primary)]"
        )}
      >
        <div className={cn("prose prose-sm prose-invert max-w-none", 
          "[&>p]:last:mb-0 [&>p]:first:mt-0",
          "prose-p:leading-relaxed prose-pre:bg-[var(--color-surface-2)] prose-pre:border prose-pre:border-[var(--color-border)]",
          "prose-strong:text-[var(--color-text-primary)] prose-strong:font-bold",
          "prose-a:text-[var(--color-brand-400)] hover:prose-a:text-[var(--color-brand-500)]",
          isUser ? "prose-p:text-sm text-sm" : "text-[15px]"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
