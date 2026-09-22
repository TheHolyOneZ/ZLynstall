import { Checkbox } from "radix-ui";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export function InkCheckbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-ink",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      <Checkbox.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="grid size-[16px] shrink-0 place-items-center rounded-input border border-ink bg-transparent transition-colors group-hover:bg-ink-faint data-[state=checked]:bg-ink"
      >
        <Checkbox.Indicator forceMount>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <motion.path
              d="M1.5 5.2l2.4 2.4L8.5 2.6"
              stroke="var(--paper)"
              strokeWidth="1.5"
              strokeLinecap="square"
              initial={false}
              animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}
