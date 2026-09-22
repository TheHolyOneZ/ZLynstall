import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Stage, StageStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const PAD = 32;

export function StageTrack({ stages, statuses }: { stages: Stage[]; statuses: StageStatus[] }) {
  const reduced = useReducedMotion();
  const n = stages.length;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const span = Math.max(0, width - PAD * 2);
  const x = (i: number) => PAD + (n <= 1 ? span / 2 : (i / (n - 1)) * span);

  const activeIndex = statuses.findIndex((s) => s === "active" || s === "failed");
  const lastDone = statuses.lastIndexOf("done");
  const glyphIndex = activeIndex >= 0 ? activeIndex : lastDone >= 0 ? lastDone : 0;
  const allDone = statuses.length > 0 && statuses.every((s) => s === "done");
  const filledTo = allDone
    ? n - 1
    : lastDone >= 0
      ? Math.min(lastDone + (activeIndex > lastDone ? 1 : 0), n - 1)
      : activeIndex > 0
        ? activeIndex
        : 0;

  return (
    <div ref={ref} className="relative px-8 pt-6 pb-7">
      <div className="absolute top-[38px] right-8 left-8 h-px bg-rule" />
      <motion.div
        className="absolute top-[38px] left-8 h-px bg-ink"
        initial={false}
        animate={{ width: Math.max(0, x(filledTo) - PAD) }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />

      {statuses.length > 0 && width > 0 && (
        <motion.div
          className="pointer-events-none absolute top-[10px] -ml-[7px]"
          initial={false}
          animate={{ left: x(glyphIndex) }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 26 }}
        >
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={cn(statuses[glyphIndex] === "failed" ? "text-stamp" : "text-ink")}
            animate={statuses[glyphIndex] === "active" && !reduced ? { y: [0, -2, 0] } : { y: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <path
              d="M2 4.5l5-2.5 5 2.5v5l-5 2.5-5-2.5v-5z"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M2 4.5l5 2.5 5-2.5M7 7v5" stroke="currentColor" strokeWidth="1" />
          </motion.svg>
        </motion.div>
      )}

      <ol className="relative flex justify-between">
        {stages.map((stage, i) => {
          const status = statuses[i] ?? "pending";
          return (
            <li key={stage.id} className="relative flex w-0 min-w-0 flex-col items-center">
              <span className="relative grid size-[13px] place-items-center">
                {status === "active" && !reduced && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-ink"
                    animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
                  />
                )}
                <span
                  className={cn(
                    "block size-[9px] rounded-full border transition-colors duration-300",
                    status === "pending" && "border-ink-soft bg-paper",
                    status === "active" && "border-ink bg-paper",
                    status === "done" && "border-ink bg-ink",
                    status === "failed" && "border-stamp bg-stamp",
                  )}
                />
              </span>
              <span
                className={cn(
                  "mono-label mt-2 whitespace-nowrap transition-colors",
                  status === "pending"
                    ? "text-ink-soft"
                    : status === "failed"
                      ? "text-stamp"
                      : "text-ink",
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
