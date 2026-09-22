import { ChevronRight, KeyRound, X } from "lucide-react";
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { DepResolution, InstallOptions, InstallPlan, StageStatus } from "@/lib/types";
import { basename, formatBytes, kindLabel } from "@/lib/files";
import { familyLabel } from "@/lib/tauri";
import { cn } from "@/lib/cn";
import { InkButton } from "./InkButton";
import { InkCheckbox } from "./InkCheckbox";
import { StageTrack } from "./StageTrack";
import { Tooltip } from "@/components/ui/Tooltip";
import { strategySentence } from "@/lib/strategy";

function shortHome(p: string): string {
  const m = p.match(/^\/home\/[^/]+(\/.*)?$/);
  return m ? `~${m[1] ?? ""}` : p;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="mono-label text-[9px]">{k}</span>
      <span className="truncate font-mono text-[12px] text-ink">{children}</span>
    </div>
  );
}

function DepLine({
  dep,
  index,
  host,
}: {
  dep: DepResolution;
  index: number;
  host: InstallPlan["host"];
}) {
  const done = dep.status === "found";
  const skipped = dep.status === "skipped";
  const unresolved = dep.status === "unresolved";
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.2 }}
      className="flex items-center gap-2.5 py-[3px] font-mono text-[12px]"
    >
      <span className="grid size-[14px] shrink-0 place-items-center">
        {done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <motion.path
              d="M2 6.3l2.6 2.6L10 3.2"
              stroke="var(--ok)"
              strokeWidth="1.4"
              strokeLinecap="square"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.15 + index * 0.04, duration: 0.25, ease: "easeOut" }}
            />
          </svg>
        )}
        {skipped && <span className="text-ink-soft">~</span>}
        {unresolved && <span className="text-warn">×</span>}
      </span>
      <span
        className={cn(
          "truncate",
          unresolved ? "text-warn" : skipped ? "text-ink-soft" : "text-ink",
        )}
      >
        {dep.raw}
      </span>
      {done && dep.resolved && (
        <>
          <span className="text-ink-soft">→</span>
          <span className="truncate text-ink">{dep.resolved}</span>
        </>
      )}
      {skipped && <span className="truncate text-ink-soft">· {dep.reason}</span>}
      {unresolved && (
        <Tooltip
          content={`No equivalent found on ${familyLabel[host]}. The install will go ahead without it; most apps bundle what they need.`}
        >
          <span className="cursor-help border-b border-dashed border-warn text-warn">
            couldn't translate
          </span>
        </Tooltip>
      )}
    </motion.li>
  );
}

export function SpecSheet({
  plan,
  options,
  onOptions,
  onInstall,
  onDismiss,
  stageStatuses,
  busy,
  appimageDir,
  footer,
}: {
  plan: InstallPlan;
  options: InstallOptions;
  onOptions: (patch: Partial<InstallOptions>) => void;
  onInstall: () => void;
  onDismiss: () => void;
  stageStatuses: StageStatus[];
  busy: boolean;
  appimageDir?: string;
  footer?: ReactNode;
}) {
  const p = plan.package;
  const [showDescription, setShowDescription] = useState(false);
  const unsupported = plan.strategy.type === "unsupported";
  const found = plan.dependencies.filter((d) => d.status === "found").length;
  const relevant = plan.dependencies.filter((d) => d.status !== "skipped").length;
  const canInstall = !unsupported && plan.missingTools.length === 0 && !busy;

  return (
    <motion.section
      layout
      className="relative w-full max-w-[640px] rounded-card border border-ink bg-paper/70 shadow-[0_18px_40px_-28px_rgba(0,0,0,.6)] backdrop-blur-[1px]"
      initial={{ opacity: 0, scaleY: 0.6, y: -24, transformOrigin: "top" }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      exit={{ opacity: 0, scaleY: 0.9, y: 12 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <span className="crop-marks" aria-hidden>
        <i />
      </span>

      {/* header */}
      <header className="hairline-b flex items-start gap-4 px-5 pt-4 pb-3.5">
        <div className="grid size-[56px] shrink-0 place-items-center overflow-hidden rounded-card border border-rule bg-paper-raised">
          {p.iconDataUrl ? (
            <img
              src={p.iconDataUrl}
              alt=""
              className="size-[44px] object-contain"
              draggable={false}
            />
          ) : (
            <span className="font-display text-[26px] text-ink-soft">
              {p.displayName.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="truncate font-display text-[26px] leading-none text-ink">
              {p.displayName}
            </h2>
            <span className="mono-label rounded-input border border-rule px-1.5 py-0.5 text-ink">
              {kindLabel[p.kind]}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-ink-soft">
            {p.summary ?? basename(p.sourcePath)}
          </p>
          {(p.maintainer || p.homepage || p.license) && (
            <p className="mono-label mt-1.5 flex flex-wrap items-center gap-x-2 normal-case tracking-normal">
              {p.maintainer && <span>by {p.maintainer.replace(/\s*<[^>]*>\s*$/, "")}</span>}
              {p.homepage && (
                <>
                  {p.maintainer && <span>·</span>}
                  <button
                    type="button"
                    onClick={() => void openUrl(p.homepage ?? "")}
                    className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
                  >
                    {hostOf(p.homepage)}
                  </button>
                </>
              )}
              {p.license && (
                <>
                  <span>·</span>
                  <span>{p.license}</span>
                </>
              )}
            </p>
          )}
        </div>
        {!busy && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="grid size-[24px] shrink-0 place-items-center rounded-full border border-rule text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-paper"
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </header>

      {/* spec rows */}
      <div className="hairline-b grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-x-5 gap-y-2 px-5 py-3">
        <Row k="version">{p.version}</Row>
        <Row k="arch">{p.arch}</Row>
        <Row k="size">{formatBytes(p.fileSize)}</Row>
        <Row k="files">{p.fileCount}</Row>
        <Row k="from">{shortHome(p.sourcePath.slice(0, p.sourcePath.lastIndexOf("/")) || "/")}</Row>
      </div>

      {/* update banner */}
      {plan.updateOf && (
        <div
          className={cn(
            "hairline-b flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5",
            plan.updateOf.relation === "older" ? "text-warn" : "text-ink",
          )}
        >
          <span className={cn("mono-label", plan.updateOf.relation === "newer" && "text-stamp")}>
            {plan.updateOf.relation === "newer"
              ? "update"
              : plan.updateOf.relation === "same"
                ? "reinstall"
                : plan.updateOf.relation === "older"
                  ? "downgrade"
                  : "replaces"}
          </span>
          <span className="text-[13px]">
            {plan.updateOf.entryName}
            <span className="font-mono text-[12px] text-ink-soft">
              {" "}
              {plan.updateOf.installedVersion} → {p.version}
            </span>
          </span>
          <span className="mono-label">
            {plan.updateOf.confidence === "exact"
              ? "same package"
              : plan.updateOf.confidence === "name"
                ? "same name"
                : plan.updateOf.confidence === "folder"
                  ? "from its update folder"
                  : "matched by file name"}
          </span>
        </div>
      )}

      {/* description */}
      {p.description && (
        <div className="hairline-b px-5 py-2.5">
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            className="mono-label flex items-center gap-1 hover:text-ink"
            aria-expanded={showDescription}
          >
            <ChevronRight
              size={11}
              strokeWidth={1.5}
              className={cn("transition-transform", showDescription && "rotate-90")}
            />
            {showDescription ? "hide description" : "show description"}
          </button>
          <AnimatePresence initial={false}>
            {showDescription && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[160px] overflow-y-auto pt-2 text-[12.5px] leading-snug whitespace-pre-line text-ink-soft select-text"
              >
                {p.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* plan */}
      <div className="hairline-b px-5 pt-3 pb-1">
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label">plan</span>
          <span className={cn("text-right text-[12px]", unsupported ? "text-warn" : "text-ink")}>
            {strategySentence(plan.strategy, plan.host, appimageDir)}
          </span>
        </div>
        {!unsupported && <StageTrack stages={plan.stages} statuses={stageStatuses} />}
      </div>

      {/* dependencies */}
      {plan.dependencies.length > 0 && (
        <div className="hairline-b px-5 pt-3 pb-2">
          <div className="flex items-baseline justify-between">
            <span className="mono-label">dependencies</span>
            {relevant > 0 && (
              <span className="mono-label">
                {found} of {relevant} translated
              </span>
            )}
          </div>
          <ul className="mt-1 max-h-[132px] overflow-y-auto pr-1">
            {plan.dependencies.map((d, i) => (
              <DepLine key={`${d.raw}-${i}`} dep={d} index={i} host={plan.host} />
            ))}
          </ul>
        </div>
      )}

      {/* notes */}
      {(plan.warnings.length > 0 || plan.missingTools.length > 0) && (
        <div className="hairline-b px-5 py-3">
          <span className="mono-label">notes</span>
          <ul className="mt-1 space-y-1">
            {plan.missingTools.map((t) => (
              <li key={t.name} className="flex gap-2 text-[12px] leading-snug text-stamp">
                <span aria-hidden>!</span>
                <span>
                  <span className="font-mono">{t.name}</span> is needed to {t.requiredFor} but isn't
                  installed
                  {t.package ? ` — install ${t.package} from Settings → Tools.` : "."}
                </span>
              </li>
            ))}
            {plan.warnings.map((w) => (
              <li key={w} className="flex gap-2 text-[12px] leading-snug text-ink-soft">
                <span aria-hidden>!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {footer ? (
          <motion.div
            key="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {footer}
          </motion.div>
        ) : (
          <motion.footer
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
          >
            <InkCheckbox
              label="Add to app menu"
              checked={options.menuEntry}
              disabled={busy || unsupported}
              onCheckedChange={(v) => onOptions({ menuEntry: v })}
            />
            <InkCheckbox
              label="Desktop shortcut"
              checked={options.desktopShortcut}
              disabled={busy || unsupported}
              onCheckedChange={(v) => onOptions({ desktopShortcut: v })}
            />
            <InkCheckbox
              label={
                p.kind === "appimage"
                  ? "Tidy up the original file"
                  : "Delete the installer afterwards"
              }
              checked={options.removeOriginal}
              disabled={busy || unsupported}
              onCheckedChange={(v) => onOptions({ removeOriginal: v })}
            />
            <div className="ml-auto">
              <InkButton variant="ink" disabled={!canInstall} onClick={onInstall} className="px-6">
                {plan.updateOf?.relation === "newer"
                  ? "Update"
                  : plan.updateOf?.relation === "same"
                    ? "Reinstall"
                    : plan.updateOf?.relation === "older"
                      ? "Downgrade"
                      : "Install"}
                {plan.needsRoot && (
                  <KeyRound size={12} strokeWidth={1.5} aria-label="asks for your password" />
                )}
              </InkButton>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
