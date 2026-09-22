import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "ink" | "outline" | "link" | "stamp";

export function InkButton({
  variant = "outline",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-input font-mono text-[11px] tracking-[0.12em] uppercase transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "ink" &&
          "border border-ink bg-ink px-4 py-2 text-paper hover:bg-transparent hover:text-ink active:translate-y-px",
        variant === "outline" &&
          "border border-ink px-4 py-2 text-ink hover:bg-ink hover:text-paper active:translate-y-px",
        variant === "stamp" &&
          "border border-stamp px-4 py-2 text-stamp hover:bg-stamp hover:text-paper active:translate-y-px",
        variant === "link" &&
          "px-0 py-0 text-ink underline decoration-rule underline-offset-4 hover:decoration-ink",
        className,
      )}
    />
  );
}
