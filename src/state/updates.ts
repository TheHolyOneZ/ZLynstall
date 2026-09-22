import { create } from "zustand";
import { api } from "@/lib/tauri";
import type { UpdateCandidate } from "@/lib/types";
import { useJobs } from "./jobs";
import { useNav } from "./nav";

interface UpdatesState {
  candidates: UpdateCandidate[];
  scanning: boolean;
  lastScan: number | null;
  scan: () => Promise<UpdateCandidate[]>;
  ignore: (c: UpdateCandidate) => Promise<void>;

  apply: (c: UpdateCandidate) => void;
  applyAll: () => void;
  dismiss: (path: string) => void;
}

export const useUpdates = create<UpdatesState>((set, get) => ({
  candidates: [],
  scanning: false,
  lastScan: null,

  scan: async () => {
    set({ scanning: true });
    try {
      const candidates = await api.scanUpdates();
      set({ candidates, lastScan: Date.now() });
      return candidates;
    } finally {
      set({ scanning: false });
    }
  },

  ignore: async (c) => {
    await api.ignoreVersion(c.entryId, c.version);
    set({ candidates: get().candidates.filter((x) => x.path !== c.path) });
  },

  apply: (c) => {
    useNav.getState().go("install");
    useJobs.getState().enqueue([c.path], { auto: true });
    set({ candidates: get().candidates.filter((x) => x.path !== c.path) });
  },

  applyAll: () => {
    const all = get().candidates;
    if (!all.length) return;
    useNav.getState().go("install");
    useJobs.getState().enqueue(
      all.map((c) => c.path),
      { auto: true },
    );
    set({ candidates: [] });
  },

  dismiss: (path) => set({ candidates: get().candidates.filter((x) => x.path !== path) }),
}));
