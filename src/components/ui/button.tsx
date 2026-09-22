import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    // Note: for link-like buttons, wrap with a Next.js Link and pass className.
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "brand-gradient text-white shadow-glow-brand hover:brightness-110": variant === "primary",
            "bg-surface-2 text-white hover:bg-surface-3": variant === "secondary",
            "border border-border bg-transparent hover:bg-surface-2 text-text-primary": variant === "outline",
            "hover:bg-surface-2 text-text-primary": variant === "ghost",
            "glass text-white hover:bg-white/10": variant === "glass",
            
            "h-9 px-4 py-2 text-sm": size === "sm",
            "h-11 px-6 py-2 text-base": size === "md",
            "h-14 px-8 py-3 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
