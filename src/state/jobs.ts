import { create } from "zustand";
import { api } from "@/lib/tauri";
import { play } from "@/lib/sound";
import type {
  InstallOptions,
  InstallPlan,
  InstalledEntry,
  JobEvent,
  StageStatus,
} from "@/lib/types";
import { useAuth } from "./auth";
import { useLibrary } from "./library";
import { useSettings } from "./settings";

export type Sheet =
  | { status: "idle" }
  | { status: "inspecting"; path: string }
  | { status: "planned"; plan: InstallPlan; options: InstallOptions }
  | { status: "error"; path: string; message: string }
  | {
      status: "running";
      plan: InstallPlan;
      options: InstallOptions;
      stages: StageStatus[];
      narration: string[];
      log: string[];
      needsAuth: boolean;
    }
  | {
      status: "done";
      plan: InstallPlan;
      options: InstallOptions;
      entry: InstalledEntry;
      stages: StageStatus[];
      narration: string[];
      log: string[];
    }
  | {
      status: "failed";
      plan: InstallPlan;
      options: InstallOptions;
      message: string;
      hint: string | null;
      stages: StageStatus[];
      narration: string[];
      log: string[];
    };

export interface QueueItem {
  path: string;

  auto: boolean;
}

interface JobsState {
  sheet: Sheet;
  queue: QueueItem[];
  enqueue: (paths: string[], opts?: { auto?: boolean }) => void;
  next: () => Promise<void>;
  setOptions: (patch: Partial<InstallOptions>) => void;
  install: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

const MAX_LOG = 3000;

function defaultOptions(plan: InstallPlan): InstallOptions {
  const s = useSettings.getState().settings;
  const isAppImage = plan.strategy.type === "appImageIntegrate";
  return {
    menuEntry: true,
    desktopShortcut: s?.desktopShortcutDefault ?? false,
    removeOriginal: isAppImage
      ? (s?.removeOriginalAppimage ?? true)
      : (s?.removeOriginalPackage ?? false),
  };
}

export const useJobs = create<JobsState>((set, get) => ({
  sheet: { status: "idle" },
  queue: [],

  enqueue: (paths, opts) => {
    const sheet = get().sheet;
    const current =
      sheet.status === "inspecting"
        ? sheet.path
        : "plan" in sheet
          ? sheet.plan.package.sourcePath
          : null;
    const queued = get().queue.map((q) => q.path);
    const fresh = paths.filter((p) => p !== current && !queued.includes(p));
    if (fresh.length === 0) return;
    play("drop");
    set({ queue: [...get().queue, ...fresh.map((path) => ({ path, auto: opts?.auto ?? false }))] });
    if (
      sheet.status === "idle" ||
      sheet.status === "error" ||
      (opts?.auto && sheet.status === "done")
    ) {
      void get().next();
    }
  },

  next: async () => {
    const [item, ...rest] = get().queue;
    if (!item) {
      set({ sheet: { status: "idle" } });
      return;
    }
    const { path, auto } = item;
    set({ queue: rest, sheet: { status: "inspecting", path } });
    try {
      const model = await api.inspectFile(path);
      const plan = await api.planInstall(model);
      set({ sheet: { status: "planned", plan, options: defaultOptions(plan) } });
      if (auto && plan.strategy.type !== "unsupported" && plan.missingTools.length === 0) {
        await new Promise((r) => setTimeout(r, 600));
        if (get().sheet.status === "planned") void get().install();
      }
    } catch (e) {
      set({ sheet: { status: "error", path, message: String(e) } });
    }
  },

  setOptions: (patch) => {
    const sheet = get().sheet;
    if (sheet.status !== "planned") return;
    set({ sheet: { ...sheet, options: { ...sheet.options, ...patch } } });
  },

  install: async () => {
    const sheet = get().sheet;
    if (sheet.status !== "planned") return;
    const { plan, options } = sheet;
    if (plan.needsRoot && !(await useAuth.getState().ensureUnlocked())) return;
    if (get().sheet !== sheet) return;
    set({
      sheet: {
        status: "running",
        plan,
        options,
        stages: plan.stages.map(() => "pending"),
        narration: [],
        log: [],
        needsAuth: false,
      },
    });

    const apply = (e: JobEvent) => {
      const s = get().sheet;
      if (s.status !== "running") return;
      switch (e.type) {
        case "stage": {
          const stages = [...s.stages];
          stages[e.index] = e.status;
          if (e.status === "done") play("tick");
          set({ sheet: { ...s, stages, needsAuth: e.status === "done" ? false : s.needsAuth } });
          break;
        }
        case "narrate":
          set({ sheet: { ...s, narration: [...s.narration, e.text] } });
          break;
        case "log":
          set({ sheet: { ...s, log: [...s.log.slice(-MAX_LOG), e.line] } });
          break;
        case "needsAuth":
          set({ sheet: { ...s, needsAuth: true } });
          break;
        case "done":
          play("stamp");
          set({
            sheet: {
              status: "done",
              plan,
              options,
              entry: e.entry,
              stages: s.stages.map(() => "done"),
              narration: s.narration,
              log: s.log,
            },
          });
          void useLibrary.getState().load();

          if (get().queue[0]?.auto) setTimeout(() => get().reset(), 1800);
          break;
        case "failed": {
          play("error");
          const stages = [...s.stages];
          const active = stages.indexOf("active");
          if (active >= 0) stages[active] = "failed";
          set({
            sheet: {
              status: "failed",
              plan,
              options,
              message: e.message,
              hint: e.hint,
              stages,
              narration: s.narration,
              log: s.log,
            },
          });
          break;
        }
      }
    };

    const STAGE_GAP = 420;
    const pending: JobEvent[] = [];
    let draining = false;
    let lastStageAt = 0;
    const drain = async () => {
      if (draining) return;
      draining = true;
      while (pending.length) {
        const e = pending.shift()!;
        if (e.type === "stage" || e.type === "done" || e.type === "failed") {
          const wait = lastStageAt + STAGE_GAP - Date.now();
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          lastStageAt = Date.now();
        }
        apply(e);
      }
      draining = false;
    };
    const onEvent = (e: JobEvent) => {
      if (e.type === "log") {
        apply(e);
        return;
      }
      pending.push(e);
      void drain();
    };

    try {
      await api.runInstall(plan, options, onEvent);
    } catch (err) {
      const s = get().sheet;
      if (s.status === "running") {
        play("error");
        set({
          sheet: {
            status: "failed",
            plan,
            options,
            message: String(err),
            hint: null,
            stages: s.stages,
            narration: s.narration,
            log: s.log,
          },
        });
      }
    }
  },

  cancel: async () => {
    await api.cancelJob();
  },

  reset: () => {
    set({ sheet: { status: "idle" } });
    if (get().queue.length) void get().next();
  },
}));
