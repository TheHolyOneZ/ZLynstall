import { getCurrentWindow } from "@tauri-apps/api/window";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { Lock, LockOpen } from "lucide-react";
import { useAuth } from "@/state/auth";

function WinButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-[22px] place-items-center rounded-full border border-rule text-ink-soft transition-colors duration-150",
        danger
          ? "hover:border-stamp hover:bg-stamp hover:text-paper"
          : "hover:border-ink hover:bg-ink hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}

function ZMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden data-tauri-drag-region>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" />
      <path d="M6.5 6.5h7l-7 7h7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
      <circle cx="15" cy="5" r="1.6" fill="var(--stamp)" />
    </svg>
  );
}

function SessionLock() {
  const status = useAuth((s) => s.status);
  const openDialog = useAuth((s) => s.openDialog);
  const lock = useAuth((s) => s.lock);
  if (!status || status.isRoot || status.mode !== "session" || !status.sudoAvailable) return null;
  const unlocked = status.unlocked;
  return (
    <button
      type="button"
      onClick={() => (unlocked ? void lock() : openDialog())}
      title={
        unlocked
          ? "Session unlocked — click to lock again"
          : "Session locked — click to unlock once for this session"
      }
      className={cn(
        "mr-2 flex items-center gap-1.5 rounded-full border px-2 py-[3px] font-mono text-[9px] tracking-[0.12em] uppercase transition-colors",
        unlocked
          ? "border-ok text-ok hover:bg-ok hover:text-paper"
          : "border-rule text-ink-soft hover:border-ink hover:text-ink",
      )}
    >
      {unlocked ? <LockOpen size={11} strokeWidth={1.5} /> : <Lock size={11} strokeWidth={1.5} />}
      {unlocked ? "unlocked" : "locked"}
    </button>
  );
}

export function TitleBar() {
  const win = getCurrentWindow();
  return (
    <header
      data-tauri-drag-region
      className="hairline-b col-span-2 flex h-10 items-center justify-between pr-3 pl-4"
    >
      <div data-tauri-drag-region className="flex items-center gap-3 text-ink">
        <ZMark />
        <span data-tauri-drag-region className="mono-label text-ink">
          ZLynstall
        </span>
        <span data-tauri-drag-region className="mono-label hidden sm:inline">
          · package installer
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SessionLock />
        <WinButton label="Minimise" onClick={() => void win.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </WinButton>
        <WinButton label="Maximise" onClick={() => void win.toggleMaximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <rect
              x="1.5"
              y="1.5"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </WinButton>
        <WinButton label="Close" danger onClick={() => void win.close()}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </WinButton>
      </div>
    </header>
  );
}
