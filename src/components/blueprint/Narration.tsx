import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

export function Narration({
  lines,
  log,
  live,
  needsAuth,
}: {
  lines: string[];
  log: string[];
  live: boolean;
  needsAuth: boolean;
}) {
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (showLog && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, showLog]);

  const recent = lines.slice(-4);

  return (
    <div className="px-5 py-4">
      <ul className="min-h-[72px] space-y-1">
        <AnimatePresence initial={false}>
          {recent.map((text, i) => {
            const last = i === recent.length - 1;
            return (
              <motion.li
                key={`${lines.length - recent.length + i}-${text}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: last ? 1 : 0.55, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-baseline gap-2 text-[13px]",
                  last ? "text-ink" : "text-ink-soft",
                )}
              >
                <span className="font-mono text-[10px] text-ink-soft">
                  {last && live ? "▸" : "·"}
                </span>
                <span className="leading-snug">{text}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {needsAuth && live && (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2 text-[12px] text-warn"
          >
            <span className="font-mono">⚿</span> Your password prompt is open — ZLynstall itself
            never runs as root.
          </motion.li>
        )}
      </ul>
      <button
        type="button"
        onClick={() => setShowLog((v) => !v)}
        className="mono-label mt-3 flex items-center gap-1 hover:text-ink"
        aria-expanded={showLog}
      >
        <ChevronRight
          size={11}
          strokeWidth={1.5}
          className={cn("transition-transform", showLog && "rotate-90")}
        />
        {showLog ? "hide raw log" : `show raw log${log.length ? ` · ${log.length}` : ""}`}
      </button>
      <AnimatePresence initial={false}>
        {showLog && (
          <motion.pre
            ref={logRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 140, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 overflow-auto rounded-input border border-rule bg-paper-raised p-2 font-mono text-[10.5px] leading-[1.5] whitespace-pre-wrap text-ink-soft select-text"
          >
            {log.length ? log.join("\n") : "(nothing yet)"}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}
