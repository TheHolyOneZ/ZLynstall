import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import type { InstalledEntry } from "@/lib/types";
import { formatBytes, kindLabel, shortHome } from "@/lib/files";
import { cn } from "@/lib/cn";
import { ContextMenu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/ContextMenu";
import { InkButton } from "./InkButton";
import { InkCheckbox } from "./InkCheckbox";
import { Stamp } from "./Stamp";
import { useLibrary } from "@/state/library";

function iconSrc(entry: InstalledEntry): string | null {
  return entry.iconPath ? convertFileSrc(entry.iconPath) : null;
}

function when(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Detail({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-0.5 py-1 text-[12px]">
      <span className="mono-label pt-[3px] text-[9px]">{k}</span>
      <span className="min-w-0 break-words text-ink select-text">{children}</span>
    </div>
  );
}

function Details({ entry, indented }: { entry: InstalledEntry; indented: boolean }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="col-span-full overflow-hidden"
    >
      <div
        className={cn(
          "mt-1 mb-2 rounded-card border border-rule bg-paper/60 px-4 py-2",
          indented ? "ml-[96px]" : "ml-[60px]",
        )}
      >
        {entry.description ? (
          <Detail k="description">
            <span className="whitespace-pre-line text-ink-soft">{entry.description}</span>
          </Detail>
        ) : entry.summary ? (
          <Detail k="about">
            <span className="text-ink-soft">{entry.summary}</span>
          </Detail>
        ) : null}
        {entry.maintainer && <Detail k="made by">{entry.maintainer}</Detail>}
        {entry.homepage && (
          <Detail k="website">
            <button
              type="button"
              className="underline decoration-rule underline-offset-4 hover:decoration-ink"
              onClick={() => void openUrl(entry.homepage ?? "")}
            >
              {hostOf(entry.homepage)}
            </button>
          </Detail>
        )}
        {entry.license && <Detail k="license">{entry.license}</Detail>}
        <Detail k="installed">
          {when(entry.installedAt)}
          {entry.arch ? ` · ${entry.arch}` : ""}
          {entry.fileSize ? ` · ${formatBytes(entry.fileSize)} download` : ""}
        </Detail>
        {entry.hostPackage && <Detail k="package">{entry.hostPackage}</Detail>}
        {entry.appimagePath && <Detail k="appimage">{shortHome(entry.appimagePath)}</Detail>}
        <Detail k="came from">{shortHome(entry.originalPath)}</Detail>
        {entry.updateDir && (
          <Detail k="updates from">
            {shortHome(entry.updateDir)}{" "}
            <span className="text-ink-soft">· any newer version dropped here is offered</span>
          </Detail>
        )}
        {entry.history.length > 0 && (
          <Detail k="history">
            {entry.history
              .slice()
              .reverse()
              .map((h) => `${h.version} (${when(h.installedAt)}, ${kindLabel[h.sourceKind]})`)
              .join(" · ")}
          </Detail>
        )}
        {entry.ignoredVersions.length > 0 && (
          <Detail k="ignored">{entry.ignoredVersions.join(", ")}</Detail>
        )}
        {entry.unresolvedDeps.length > 0 && (
          <Detail k="untranslated">
            <span className="text-warn">{entry.unresolvedDeps.join(", ")}</span>
          </Detail>
        )}
      </div>
    </motion.div>
  );
}

function Row({ entry }: { entry: InstalledEntry }) {
  const busy = useLibrary((s) => s.busy === entry.id || s.busy === "bulk");
  const note = useLibrary((s) => s.notes[entry.id]);
  const remove = useLibrary((s) => s.remove);
  const repair = useLibrary((s) => s.repair);
  const launch = useLibrary((s) => s.launch);
  const removed = useLibrary((s) => s.justRemoved.includes(entry.id));
  const selectMode = useLibrary((s) => s.selectMode);
  const selected = useLibrary((s) => s.selected.includes(entry.id));
  const toggleSelected = useLibrary((s) => s.toggleSelected);
  const expanded = useLibrary((s) => s.expanded === entry.id);
  const toggleExpanded = useLibrary((s) => s.toggleExpanded);
  const hasShortcut = useLibrary((s) => s.withDesktopShortcut.includes(entry.id));
  const setDesktopShortcut = useLibrary((s) => s.setDesktopShortcut);
  const chooseUpdateDir = useLibrary((s) => s.chooseUpdateDir);
  const clearUpdateDir = useLibrary((s) => s.clearUpdateDir);
  const [confirm, setConfirm] = useState(false);

  const doRemove = async () => {
    setConfirm(false);
    await remove(entry.id);
  };

  const where = entry.appimagePath ?? (entry.hostPackage ? `package ${entry.hostPackage}` : "");
  const revealTarget = entry.appimagePath ?? entry.launcher ?? entry.desktopFiles[0] ?? null;

  const menu = (
    <>
      <MenuLabel>{entry.name}</MenuLabel>
      <MenuItem onSelect={() => void launch(entry.id)} disabled={busy}>
        Open
      </MenuItem>
      {revealTarget && (
        <MenuItem onSelect={() => void revealItemInDir(revealTarget)}>Show in folder</MenuItem>
      )}
      {entry.homepage && (
        <MenuItem onSelect={() => void openUrl(entry.homepage ?? "")}>Open website</MenuItem>
      )}
      <MenuItem onSelect={() => toggleExpanded(entry.id)}>
        {expanded ? "Hide details" : "Show details"}
      </MenuItem>
      <MenuItem onSelect={() => void repair(entry.id)} disabled={busy}>
        Repair shortcuts
      </MenuItem>
      <MenuItem onSelect={() => void setDesktopShortcut(entry.id, !hasShortcut)} disabled={busy}>
        {hasShortcut ? "Remove desktop shortcut" : "Add desktop shortcut"}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => void chooseUpdateDir(entry.id)} disabled={busy}>
        {entry.updateDir ? "Change update folder…" : "Set update folder…"}
      </MenuItem>
      {entry.updateDir && (
        <MenuItem onSelect={() => void clearUpdateDir(entry.id)} disabled={busy}>
          Stop watching for updates
        </MenuItem>
      )}
      <MenuSeparator />
      {entry.appimagePath && (
        <MenuItem onSelect={() => void writeText(entry.appimagePath ?? "")}>
          Copy AppImage path
        </MenuItem>
      )}
      {entry.hostPackage && (
        <MenuItem onSelect={() => void writeText(entry.hostPackage ?? "")}>
          Copy package name
        </MenuItem>
      )}
      <MenuItem onSelect={() => void writeText(entry.originalPath)}>
        Copy original file path
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => setConfirm(true)} tone="stamp" disabled={busy}>
        Remove…
      </MenuItem>
    </>
  );

  return (
    <ContextMenu
      trigger={
        <motion.li
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative grid items-center gap-x-4 border-b border-rule py-3",
            selectMode ? "grid-cols-[20px_44px_1fr_auto]" : "grid-cols-[44px_1fr_auto]",
            busy && "opacity-70",
            selected && "bg-ink-faint",
          )}
          onClick={(e) => {
            if (selectMode) {
              toggleSelected(entry.id);
              return;
            }
            const target = e.target as HTMLElement;
            if (target.closest("button, a, [role=menuitem]")) return;
            toggleExpanded(entry.id);
          }}
        >
          {selectMode && (
            <span onClick={(e) => e.stopPropagation()}>
              <InkCheckbox
                checked={selected}
                onCheckedChange={() => toggleSelected(entry.id)}
                label=""
              />
            </span>
          )}
          <div className="grid size-[44px] place-items-center overflow-hidden rounded-card border border-rule bg-paper-raised">
            {iconSrc(entry) ? (
              <img
                src={iconSrc(entry) ?? undefined}
                alt=""
                className="size-[34px] object-contain"
                draggable={false}
              />
            ) : (
              <span className="font-display text-[20px] text-ink-soft">
                {entry.name.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <ChevronRight
                size={12}
                strokeWidth={1.5}
                className={cn(
                  "shrink-0 text-ink-soft transition-transform",
                  expanded && "rotate-90",
                )}
              />
              <span className="truncate font-display text-[18px] leading-tight text-ink">
                {entry.name}
              </span>
              <span className="font-mono text-[11px] text-ink-soft">{entry.version}</span>
              <span className="mono-label rounded-input border border-rule px-1.5 py-[1px] text-ink">
                {kindLabel[entry.sourceKind]}
              </span>
            </div>
            <div className="mt-0.5 truncate pl-[22px] font-mono text-[10.5px] text-ink-soft">
              {when(entry.installedAt)}
              {entry.maintainer ? ` · by ${entry.maintainer.replace(/\s*<[^>]*>\s*$/, "")}` : ""}
              {where ? ` · ${shortHome(where)}` : ""}
            </div>
            <AnimatePresence>
              {note && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mt-1 pl-[22px] text-[11.5px]",
                    note.tone === "warn" ? "text-stamp" : "text-ink-soft",
                  )}
                >
                  {note.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-4">
            <InkButton variant="link" disabled={busy} onClick={() => void launch(entry.id)}>
              Open
            </InkButton>
            <InkButton variant="link" disabled={busy} onClick={() => void repair(entry.id)}>
              Repair
            </InkButton>
            <Dialog.Root open={confirm} onOpenChange={setConfirm}>
              <Dialog.Trigger asChild>
                <InkButton variant="stamp" disabled={busy} className="px-3 py-1.5">
                  Remove
                </InkButton>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/25 backdrop-blur-[1px]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-[71] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-card border border-ink bg-paper p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)] focus:outline-none">
                  <Dialog.Title className="font-display text-[22px] leading-none text-ink">
                    Remove {entry.name}?
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-[13px] leading-snug text-ink-soft">
                    {entry.installKind === "appimage"
                      ? "The AppImage, its icon and its menu entry will be deleted."
                      : `The package ${entry.hostPackage ?? ""} will be uninstalled with your package manager, and its shortcuts removed.`}
                  </Dialog.Description>
                  <div className="mt-5 flex justify-end gap-3">
                    <Dialog.Close asChild>
                      <InkButton>Keep it</InkButton>
                    </Dialog.Close>
                    <InkButton variant="stamp" onClick={() => void doRemove()}>
                      Remove
                    </InkButton>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          <AnimatePresence initial={false}>
            {expanded && <Details entry={entry} indented={selectMode} />}
          </AnimatePresence>
          <AnimatePresence>
            {removed && (
              <motion.div
                className="pointer-events-none absolute inset-0 grid place-items-center"
                exit={{ opacity: 0 }}
              >
                <Stamp text="Removed" tone="void" className="scale-75" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.li>
      }
    >
      {menu}
    </ContextMenu>
  );
}

export function Ledger({ entries }: { entries: InstalledEntry[] }) {
  return (
    <ul className="border-t border-rule">
      <AnimatePresence initial={false}>
        {entries.map((e) => (
          <Row key={e.id} entry={e} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
