import { useCallback, useEffect, useRef } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { AnimatePresence, motion } from "motion/react";
import { DropSlot } from "@/components/blueprint/DropSlot";
import { SpecSheet } from "@/components/blueprint/SpecSheet";
import { InkButton } from "@/components/blueprint/InkButton";
import { Narration } from "@/components/blueprint/Narration";
import { Stamp } from "@/components/blueprint/Stamp";
import { TitleBlock } from "@/components/chrome/TitleBlock";
import { basename } from "@/lib/files";
import { useJobs, type Sheet } from "@/state/jobs";
import { useLibrary } from "@/state/library";
import { useSettings } from "@/state/settings";

function stampDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function SheetFooter({ sheet }: { sheet: Sheet }) {
  const reset = useJobs((s) => s.reset);
  const cancel = useJobs((s) => s.cancel);
  const launch = useLibrary((s) => s.launch);
  const endRef = useRef<HTMLDivElement>(null);
  const settled = sheet.status === "done" || sheet.status === "failed";

  useEffect(() => {
    if (settled) {
      const t = setTimeout(
        () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
        120,
      );
      return () => clearTimeout(t);
    }
  }, [settled]);

  if (sheet.status === "running") {
    return (
      <div>
        <Narration lines={sheet.narration} log={sheet.log} live needsAuth={sheet.needsAuth} />
        <div className="flex justify-end px-5 pb-4">
          <InkButton variant="link" onClick={() => void cancel()}>
            Cancel
          </InkButton>
        </div>
      </div>
    );
  }
  if (sheet.status === "done") {
    const where = sheet.entry.appimagePath ?? sheet.entry.desktopFiles[0] ?? null;
    return (
      <div className="relative">
        <div className="pr-[250px]">
          <Narration lines={sheet.narration} log={sheet.log} live={false} needsAuth={false} />
        </div>
        <div className="absolute top-1 right-7">
          <Stamp text="Installed" sub={stampDate(sheet.entry.installedAt)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
          <InkButton variant="ink" onClick={() => void launch(sheet.entry.id)}>
            Open now
          </InkButton>
          <InkButton onClick={reset}>Install another</InkButton>
          {where && (
            <InkButton variant="link" onClick={() => void revealItemInDir(where)}>
              Show in folder
            </InkButton>
          )}
        </div>
        <div ref={endRef} />
      </div>
    );
  }
  if (sheet.status === "failed") {
    return (
      <div className="relative">
        <div className="pr-[250px]">
          <Narration lines={sheet.narration} log={sheet.log} live={false} needsAuth={false} />
        </div>
        <div className="absolute top-1 right-7">
          <Stamp text="Void" tone="void" />
        </div>
        <div className="px-5 pb-1">
          <p className="max-w-[420px] text-[13px] leading-snug text-stamp">{sheet.message}</p>
          {sheet.hint && (
            <p className="mt-1 max-w-[420px] text-[12px] leading-snug text-ink-soft">
              {sheet.hint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 pt-3 pb-4">
          <InkButton onClick={reset}>Back</InkButton>
        </div>
        <div ref={endRef} />
      </div>
    );
  }
  return null;
}

export function InstallPage() {
  const sheet = useJobs((s) => s.sheet);
  const queue = useJobs((s) => s.queue);
  const enqueue = useJobs((s) => s.enqueue);
  const setOptions = useJobs((s) => s.setOptions);
  const install = useJobs((s) => s.install);
  const reset = useJobs((s) => s.reset);
  const appimageDir = useSettings((s) => s.settings?.appimageDir);

  const onFiles = useCallback((paths: string[]) => enqueue(paths), [enqueue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (e.key === "Enter" && sheet.status === "planned") {
        e.preventDefault();
        void install();
      } else if (
        e.key === "Escape" &&
        (sheet.status === "done" ||
          sheet.status === "failed" ||
          sheet.status === "planned" ||
          sheet.status === "error")
      ) {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet.status, install, reset]);

  const busy = sheet.status === "inspecting" || sheet.status === "running";
  const hasSheet =
    sheet.status === "planned" ||
    sheet.status === "running" ||
    sheet.status === "done" ||
    sheet.status === "failed";

  return (
    <div className="relative flex h-full flex-col items-center overflow-y-auto px-10 pt-6 pb-16">
      <div className="flex min-h-full w-full flex-col items-center justify-center-safe gap-4">
        <AnimatePresence mode="wait" initial={false}>
          {sheet.status === "idle" && (
            <motion.div
              key="slot"
              className="w-full"
              exit={{ opacity: 0, scaleY: 0.4, y: -30, transformOrigin: "top" }}
              transition={{ duration: 0.18 }}
            >
              <DropSlot onFiles={onFiles} />
            </motion.div>
          )}

          {sheet.status === "inspecting" && (
            <motion.div
              key="inspecting"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="mono-label">inspecting</span>
              <span className="font-display text-[22px] text-ink">{basename(sheet.path)}</span>
              <span className="mono-label animate-pulse">reading without running it…</span>
            </motion.div>
          )}

          {sheet.status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex max-w-[520px] flex-col items-center gap-3 text-center"
            >
              <span className="mono-label text-stamp">couldn't read this file</span>
              <span className="font-display text-[22px] text-ink">{basename(sheet.path)}</span>
              <span className="text-[12px] text-ink-soft">{sheet.message}</span>
              <InkButton onClick={reset} className="mt-2">
                Back
              </InkButton>
            </motion.div>
          )}

          {hasSheet && (
            <SpecSheet
              key={sheet.plan.package.sourcePath}
              plan={sheet.plan}
              options={sheet.options}
              onOptions={setOptions}
              onInstall={() => void install()}
              onDismiss={reset}
              stageStatuses={
                sheet.status === "planned" ? sheet.plan.stages.map(() => "pending") : sheet.stages
              }
              busy={busy}
              appimageDir={appimageDir}
              footer={sheet.status === "planned" ? undefined : <SheetFooter sheet={sheet} />}
            />
          )}
        </AnimatePresence>

        {queue.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mono-label">up next</span>
            {queue.map((q) => (
              <span
                key={q.path}
                className="mono-label rounded-input border border-rule px-2 py-0.5 text-ink"
              >
                {basename(q.path)}
              </span>
            ))}
          </div>
        )}
      </div>
      {sheet.status === "idle" && <TitleBlock />}
    </div>
  );
}
