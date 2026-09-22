import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

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
          "flex flex-col max-w-[85%] rounded-2xl p-4",
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
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
