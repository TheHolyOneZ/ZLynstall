import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { basename, kindFromName, kindLabel } from "@/lib/files";
import { cn } from "@/lib/cn";

interface Hover {
  paths: string[];
}

export function DropSlot({
  onFiles,
  disabled,
}: {
  onFiles: (paths: string[]) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<Hover | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      const p = event.payload;
      if (p.type === "enter") setHover({ paths: p.paths });
      else if (p.type === "leave") setHover(null);
      else if (p.type === "drop") {
        setHover(null);
        if (!disabled) onFiles(p.paths);
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, [onFiles, disabled]);

  const browse = async () => {
    const picked = await open({
      multiple: true,
      title: "Choose a package",
      filters: [{ name: "Packages", extensions: ["deb", "rpm", "AppImage", "appimage"] }],
    });
    if (!picked) return;
    onFiles(Array.isArray(picked) ? picked : [picked]);
  };

  const first = hover?.paths[0];
  const kind = first ? kindFromName(first) : null;
  const known = hover ? hover.paths.some((p) => kindFromName(p)) : false;
  const armed = hover !== null;

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[560px]"
      animate={{ scale: armed && !reduced ? 1.015 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
    >
      <span className="crop-marks" aria-hidden>
        <i />
      </span>
      <div
        className={cn(
          "relative flex aspect-[16/7.5] w-full flex-col items-center justify-center rounded-card transition-colors duration-200",
          armed && "bg-ink-faint",
        )}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <motion.rect
            x="0.5"
            y="0.5"
            rx="6"
            ry="6"
            fill="none"
            stroke={armed && !known ? "var(--warn)" : "var(--ink)"}
            strokeWidth="1"
            style={{ width: "calc(100% - 1px)", height: "calc(100% - 1px)" }}
            animate={{ strokeDasharray: armed ? "1 0" : "7 5", opacity: armed ? 1 : 0.75 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </svg>

        <AnimatePresence mode="wait" initial={false}>
          {armed ? (
            <motion.div
              key="hover"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              {known ? (
                <>
                  <span className="mono-label text-ink">{kind ? kindLabel[kind] : "package"}</span>
                  <span className="max-w-[420px] truncate px-4 font-display text-[22px] leading-tight text-ink">
                    {first ? basename(first) : ""}
                  </span>
                  <span className="mono-label">
                    {hover && hover.paths.length > 1 ? `+ ${hover.paths.length - 1} more · ` : ""}
                    release to inspect
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-[20px] text-warn">Not a package I know</span>
                  <span className="mono-label">.deb · .rpm · .AppImage only</span>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <PackageGlyph />
              <span className="font-display text-[24px] leading-none text-ink">
                Drop a package here
              </span>
              <span className="text-[12px] text-ink-soft">
                — or —{" "}
                <button
                  type="button"
                  onClick={() => void browse()}
                  disabled={disabled}
                  className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
                >
                  browse for one
                </button>
              </span>
              <span className="mono-label mt-2">.deb · .rpm · .AppImage</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PackageGlyph() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden className="text-ink">
      <path
        d="M8 16l14-7 14 7v14l-14 7-14-7V16z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M8 16l14 7 14-7M22 23v14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M22 3v9m-3.5-3.5L22 12l3.5-3.5"
        stroke="var(--stamp)"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
}
