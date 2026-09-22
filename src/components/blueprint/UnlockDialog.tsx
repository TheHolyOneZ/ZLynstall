import { useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { motion } from "motion/react";
import { Dialog } from "radix-ui";
import { InkButton } from "./InkButton";
import { useAuth } from "@/state/auth";

export function UnlockDialog() {
  const open = useAuth((s) => s.dialogOpen);
  const error = useAuth((s) => s.error);
  const busy = useAuth((s) => s.busy);
  const submit = useAuth((s) => s.submit);
  const cancel = useAuth((s) => s.cancel);
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const go = async () => {
    if (!password || busy) return;
    await submit(password);
    setPassword("");

    if (useAuth.getState().error) setShake((n) => n + 1);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/25 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-[91] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-card border border-ink bg-paper p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)] focus:outline-none"
          onEscapeKeyDown={cancel}
        >
          <motion.div
            key={shake}
            animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-[34px] place-items-center rounded-full border border-ink text-ink">
                <KeyRound size={15} strokeWidth={1.5} />
              </span>
              <div>
                <Dialog.Title className="font-display text-[22px] leading-none text-ink">
                  Unlock this session
                </Dialog.Title>
                <Dialog.Description className="mono-label mt-1.5">
                  one password, valid while zlynstall is open
                </Dialog.Description>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-snug text-ink-soft">
              Installing and removing packages needs administrator rights. Your password goes
              straight to <span className="font-mono text-ink">sudo</span> and isn't kept — sudo
              remembers you until you close ZLynstall or lock it again.
            </p>
            <label className="mt-4 block">
              <span className="mono-label">password</span>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void go()}
                autoComplete="current-password"
                className="mt-1.5 w-full border-b border-ink bg-transparent py-1.5 font-mono text-[14px] tracking-[0.2em] text-ink outline-none"
                aria-invalid={!!error}
              />
            </label>
            <div className="mt-1.5 min-h-[18px] text-[12px] text-stamp">{error}</div>
            <div className="mt-3 flex justify-end gap-3">
              <InkButton onClick={cancel} disabled={busy}>
                Cancel
              </InkButton>
              <InkButton variant="ink" onClick={() => void go()} disabled={busy || !password}>
                {busy ? "Checking…" : "Unlock"}
              </InkButton>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
