import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "relative h-[18px] w-[34px] shrink-0 rounded-full border border-ink bg-transparent transition-colors data-[state=checked]:bg-ink",
        className,
      )}
    >
      <RadixSwitch.Thumb className="block size-[12px] translate-x-[2px] rounded-full bg-ink transition-transform duration-150 ease-ink data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-paper" />
    </RadixSwitch.Root>
  );
}
