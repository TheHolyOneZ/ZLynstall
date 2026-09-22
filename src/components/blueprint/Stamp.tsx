import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export function Stamp({
  text,
  sub,
  tone = "ok",
  className,
}: {
  text: string;
  sub?: string;
  tone?: "ok" | "void";
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: -11 }}
      transition={
        reduced ? { duration: 0.1 } : { type: "spring", stiffness: 520, damping: 22, mass: 0.9 }
      }
      className={cn("pointer-events-none inline-flex select-none flex-col items-center", className)}
      style={{
        color: tone === "void" ? "var(--stamp)" : "var(--stamp)",
        filter: "url(#ink-bleed)",
      }}
      aria-label={text}
    >
      <div className="rounded-[6px] border-[2.5px] border-current p-[3px]">
        <div className="rounded-[3px] border border-current px-4 py-1">
          <div
            className="font-display text-[30px] leading-none font-semibold tracking-[0.06em] uppercase"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40' }}
          >
            {text}
          </div>
          {sub && (
            <div className="mt-1 text-center font-mono text-[9px] tracking-[0.2em] uppercase">
              {sub}
            </div>
          )}
        </div>
      </div>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="ink-bleed" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.4"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.85 0.95 1" />
          </feComponentTransfer>
        </filter>
      </svg>
    </motion.div>
  );
}
