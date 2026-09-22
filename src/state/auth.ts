import { create } from "zustand";
import { api } from "@/lib/tauri";
import type { PrivilegeStatus, UnlockError } from "@/lib/types";

interface AuthState {
  status: PrivilegeStatus | null;
  dialogOpen: boolean;
  error: string | null;
  busy: boolean;
  resolver: ((ok: boolean) => void) | null;
  refresh: () => Promise<PrivilegeStatus>;

  ensureUnlocked: () => Promise<boolean>;
  openDialog: () => void;
  submit: (password: string) => Promise<void>;
  cancel: () => void;
  lock: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: null,
  dialogOpen: false,
  error: null,
  busy: false,
  resolver: null,

  refresh: async () => {
    const status = await api.privilegeStatus();
    set({ status });
    return status;
  },

  ensureUnlocked: async () => {
    const status = get().status ?? (await get().refresh());
    if (status.isRoot || status.mode !== "session" || !status.sudoAvailable) return true;
    if (status.unlocked) return true;

    const fresh = await get().refresh();
    if (fresh.unlocked) return true;
    return new Promise<boolean>((resolve) =>
      set({ dialogOpen: true, error: null, resolver: resolve }),
    );
  },

  openDialog: () => set({ dialogOpen: true, error: null, resolver: null }),

  submit: async (password) => {
    set({ busy: true, error: null });
    try {
      await api.unlockSession(password);
      await get().refresh();
      const resolver = get().resolver;
      set({ dialogOpen: false, resolver: null });
      resolver?.(true);
    } catch (err) {
      const e = err as UnlockError;
      if (e && typeof e === "object" && "kind" in e) {
        if (e.kind === "wrongPassword") set({ error: "Wrong password — try again." });
        else if (e.kind === "notAllowed" || e.kind === "unavailable") {
          set({ error: null, dialogOpen: false });
          const resolver = get().resolver;
          set({ resolver: null });
          await get().refresh();
          resolver?.(true);
          return;
        } else set({ error: e.message });
      } else set({ error: String(err) });
    } finally {
      set({ busy: false });
    }
  },

  cancel: () => {
    const resolver = get().resolver;
    set({ dialogOpen: false, resolver: null, error: null });
    resolver?.(false);
  },

  lock: async () => {
    await api.lockSession();
    await get().refresh();
  },
}));
