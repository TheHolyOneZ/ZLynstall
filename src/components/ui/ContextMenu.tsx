import { ContextMenu as Radix } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ContextMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <Radix.Root>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          className="z-[80] min-w-[200px] rounded-card border border-ink bg-paper p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,.6)] data-[state=open]:animate-in"
          collisionPadding={12}
        >
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

export function MenuItem({
  onSelect,
  children,
  shortcut,
  tone = "ink",
  disabled,
}: {
  onSelect: () => void;
  children: ReactNode;
  shortcut?: string;
  tone?: "ink" | "stamp";
  disabled?: boolean;
}) {
  return (
    <Radix.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-default items-center justify-between gap-6 rounded-input px-2.5 py-1.5 font-mono text-[11px] tracking-[0.08em] uppercase outline-none select-none",
        "data-[disabled]:opacity-40",
        tone === "ink" && "text-ink data-[highlighted]:bg-ink data-[highlighted]:text-paper",
        tone === "stamp" && "text-stamp data-[highlighted]:bg-stamp data-[highlighted]:text-paper",
      )}
    >
      <span>{children}</span>
      {shortcut && <span className="text-[9px] opacity-60">{shortcut}</span>}
    </Radix.Item>
  );
}

export function MenuSeparator() {
  return <Radix.Separator className="my-1 h-px bg-rule" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <Radix.Label className="mono-label px-2.5 pt-1.5 pb-1 text-[9px]">{children}</Radix.Label>;
}
