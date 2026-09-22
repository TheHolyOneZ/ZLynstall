import { create } from "zustand";
import { api, type SystemInfo } from "@/lib/tauri";
import { useAuth } from "./auth";

interface SystemState {
  info: SystemInfo | null;

  installing: string | null;
  toolNote: { text: string; tone: "ok" | "warn" } | null;
  load: () => Promise<void>;
  installTool: (pkg: string) => Promise<void>;
}

export const useSystem = create<SystemState>((set, get) => ({
  info: null,
  installing: null,
  toolNote: null,
  load: async () => {
    set({ info: await api.systemInfo() });
  },
  installTool: async (pkg) => {
    if (!(await useAuth.getState().ensureUnlocked())) return;
    set({ installing: pkg, toolNote: null });
    try {
      await api.installTool(pkg, (e) => {
        if (e.type === "narrate") set({ toolNote: { text: e.text, tone: "ok" } });
      });
      await get().load();
    } catch (err) {
      set({ toolNote: { text: String(err), tone: "warn" } });
    } finally {
      set({ installing: null });
    }
  },
}));
