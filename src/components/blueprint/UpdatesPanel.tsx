import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { basename, kindLabel, shortHome } from "@/lib/files";
import { cn } from "@/lib/cn";
import { InkButton } from "./InkButton";
import { useUpdates } from "@/state/updates";
import { useSettings } from "@/state/settings";

export function UpdatesPanel() {
  const candidates = useUpdates((s) => s.candidates);
  const scanning = useUpdates((s) => s.scanning);
  const lastScan = useUpdates((s) => s.lastScan);
  const scan = useUpdates((s) => s.scan);
  const apply = useUpdates((s) => s.apply);
  const applyAll = useUpdates((s) => s.applyAll);
  const ignore = useUpdates((s) => s.ignore);
  const updateDir = useSettings((s) => s.settings?.updateDir ?? null);

  const hasFolders = updateDir !== null;

  return (
    <section className="mt-6 max-w-[760px]">
      <div className="flex items-center justify-between">
        <span className={cn("mono-label", candidates.length > 0 && "text-stamp")}>
          {candidates.length > 0
            ? `${candidates.length} update${candidates.length === 1 ? "" : "s"} found`
            : lastScan
              ? "no updates in the update folders"
              : hasFolders
                ? "updates"
                : "no update folder set"}
        </span>
        <div className="flex items-center gap-4">
          {candidates.length > 1 && (
            <InkButton variant="ink" className="px-3 py-1.5" onClick={applyAll}>
              Update all
            </InkButton>
          )}
          <InkButton variant="link" onClick={() => void scan()} disabled={scanning}>
            <RefreshCw size={12} strokeWidth={1.5} className={cn(scanning && "animate-spin")} />
            {scanning ? "checking…" : "check now"}
          </InkButton>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {candidates.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-card border border-stamp/60 bg-paper/60"
          >
            {candidates.map((c) => (
              <motion.li
                key={c.path}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate font-display text-[17px] leading-tight text-ink">
                      {c.entryName}
                    </span>
                    <span className="font-mono text-[12px] text-ink-soft">
                      {c.installedVersion} → <span className="text-ink">{c.version}</span>
                    </span>
                    <span className="mono-label rounded-input border border-rule px-1.5 py-[1px] text-ink">
                      {kindLabel[c.kind]}
                    </span>
                    {c.relation === "unknown" && (
                      <span className="mono-label text-warn">version unknown</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10.5px] text-ink-soft">
                    {basename(c.path)} · {c.perApp ? "this app's folder" : "update folder"} ·{" "}
                    {shortHome(c.folder)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <InkButton variant="link" onClick={() => void ignore(c)}>
                    Ignore
                  </InkButton>
                  <InkButton variant="ink" className="px-4 py-1.5" onClick={() => apply(c)}>
                    Update
                  </InkButton>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
