import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "@/lib/tauri";
import type { InstalledEntry, JobEvent, PackageKind } from "@/lib/types";
import { useUpdates } from "./updates";
import { useAuth } from "./auth";

export type KindFilter = "all" | PackageKind;
export type SortOrder = "newest" | "oldest" | "name";

interface LibraryState {
  entries: InstalledEntry[];
  loaded: boolean;

  busy: string | null;

  notes: Record<string, { text: string; tone: "ok" | "warn" }>;

  justRemoved: string[];

  query: string;
  kind: KindFilter;
  sort: SortOrder;
  selectMode: boolean;
  selected: string[];
  expanded: string | null;
  bulkNote: { text: string; tone: "ok" | "warn" } | null;

  withDesktopShortcut: string[];

  load: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
  removeMany: (ids: string[]) => Promise<void>;
  repair: (id: string) => Promise<boolean>;
  repairMany: (ids: string[]) => Promise<void>;
  launch: (id: string) => Promise<void>;
  clearNote: (id: string) => void;
  setQuery: (q: string) => void;
  setKind: (k: KindFilter) => void;
  setSort: (s: SortOrder) => void;
  setSelectMode: (on: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  toggleExpanded: (id: string) => void;
  setDesktopShortcut: (id: string, want: boolean) => Promise<void>;
  chooseUpdateDir: (id: string) => Promise<void>;
  clearUpdateDir: (id: string) => Promise<void>;
}

const LINGER = 900;

export function matchesQuery(e: InstalledEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const date = new Date(e.installedAt);
  const dateText = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
  const hay = [
    e.name,
    e.slug,
    e.version,
    e.hostPackage,
    e.maintainer,
    e.summary,
    e.sourceKind,
    e.appimagePath,
    e.originalPath,
    dateText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

export function visibleEntries(
  entries: InstalledEntry[],
  query: string,
  kind: KindFilter,
  sort: SortOrder,
): InstalledEntry[] {
  const list = entries.filter(
    (e) => (kind === "all" || e.sourceKind === kind) && matchesQuery(e, query),
  );
  const time = (e: InstalledEntry) => new Date(e.installedAt).getTime() || 0;
  if (sort === "name")
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  else if (sort === "oldest") list.sort((a, b) => time(a) - time(b));
  else list.sort((a, b) => time(b) - time(a));
  return list;
}

export const useLibrary = create<LibraryState>((set, get) => {
  const note = (id: string, text: string, tone: "ok" | "warn" = "ok") =>
    set({ notes: { ...get().notes, [id]: { text, tone } } });
  const onEvent = (id: string) => (e: JobEvent) => {
    if (e.type === "narrate") note(id, e.text);
  };
  const dropEntries = async (ids: string[]) => {
    set({ justRemoved: [...get().justRemoved, ...ids] });
    await new Promise((r) => setTimeout(r, LINGER));
    set({
      entries: get().entries.filter((e) => !ids.includes(e.id)),
      justRemoved: get().justRemoved.filter((id) => !ids.includes(id)),
      selected: get().selected.filter((id) => !ids.includes(id)),
    });
  };

  return {
    entries: [],
    loaded: false,
    busy: null,
    notes: {},
    justRemoved: [],
    query: "",
    kind: "all",
    sort: "newest",
    selectMode: false,
    selected: [],
    expanded: null,
    bulkNote: null,
    withDesktopShortcut: [],

    load: async () => {
      const [entries, withDesktopShortcut] = await Promise.all([
        api.listInstalled(),
        api.desktopShortcutIds(),
      ]);
      set({ entries, withDesktopShortcut, loaded: true });
    },

    remove: async (id) => {
      const entry = get().entries.find((e) => e.id === id);
      if (entry?.installKind === "native" && !(await useAuth.getState().ensureUnlocked()))
        return false;
      set({ busy: id });
      try {
        await api.uninstallEntry(id, onEvent(id));
        await dropEntries([id]);
        return true;
      } catch (err) {
        note(id, String(err), "warn");
        return false;
      } finally {
        set({ busy: null });
      }
    },

    removeMany: async (ids) => {
      if (!ids.length) return;
      const anyNative = get().entries.some((e) => ids.includes(e.id) && e.installKind === "native");
      if (anyNative && !(await useAuth.getState().ensureUnlocked())) return;
      set({ busy: "bulk", bulkNote: null });
      try {
        const result = await api.uninstallEntries(ids, (e) => {
          if (e.type === "narrate") set({ bulkNote: { text: e.text, tone: "ok" } });
        });
        for (const [id, message] of result.failed) note(id, message, "warn");
        if (result.removed.length) await dropEntries(result.removed);
        set({
          bulkNote:
            result.failed.length > 0
              ? {
                  text: `${result.removed.length} removed, ${result.failed.length} failed`,
                  tone: "warn",
                }
              : null,
        });
      } catch (err) {
        set({ bulkNote: { text: String(err), tone: "warn" } });
      } finally {
        set({ busy: null, selectMode: get().selected.length > 0 });
      }
    },

    repair: async (id) => {
      set({ busy: id });
      try {
        const updated = await api.repairEntry(id, onEvent(id));
        set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
        return true;
      } catch (err) {
        note(id, String(err), "warn");
        return false;
      } finally {
        set({ busy: null });
      }
    },

    repairMany: async (ids) => {
      set({ busy: "bulk", bulkNote: null });
      let ok = 0;
      for (const id of ids) {
        try {
          const updated = await api.repairEntry(id, onEvent(id));
          set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
          ok++;
        } catch (err) {
          note(id, String(err), "warn");
        }
      }
      set({
        busy: null,
        bulkNote: {
          text: `Repaired ${ok} of ${ids.length}`,
          tone: ok === ids.length ? "ok" : "warn",
        },
      });
    },

    launch: async (id) => {
      try {
        await api.launchEntry(id);
        note(id, "Launched");
      } catch (err) {
        note(id, String(err), "warn");
      }
    },

    clearNote: (id) => {
      const notes = { ...get().notes };
      delete notes[id];
      set({ notes });
    },

    setQuery: (query) => set({ query }),
    setKind: (kind) => set({ kind }),
    setSort: (sort) => set({ sort }),
    setSelectMode: (selectMode) => set({ selectMode, selected: selectMode ? get().selected : [] }),
    toggleSelected: (id) =>
      set({
        selected: get().selected.includes(id)
          ? get().selected.filter((x) => x !== id)
          : [...get().selected, id],
      }),
    selectAll: (ids) => set({ selected: ids }),
    clearSelection: () => set({ selected: [] }),
    toggleExpanded: (id) => set({ expanded: get().expanded === id ? null : id }),

    setDesktopShortcut: async (id, want) => {
      try {
        const updated = await api.setDesktopShortcut(id, want);
        set({
          entries: get().entries.map((e) => (e.id === id ? updated : e)),
          withDesktopShortcut: want
            ? [...new Set([...get().withDesktopShortcut, id])]
            : get().withDesktopShortcut.filter((x) => x !== id),
        });
        note(id, want ? "Desktop shortcut added" : "Desktop shortcut removed");
      } catch (err) {
        note(id, String(err), "warn");
      }
    },

    chooseUpdateDir: async (id) => {
      const entry = get().entries.find((e) => e.id === id);
      const dir = await open({
        directory: true,
        title: `Update folder for ${entry?.name ?? "this app"}`,
        defaultPath: entry?.updateDir ?? undefined,
      });
      if (typeof dir !== "string") return;
      try {
        const updated = await api.setUpdateDir(id, dir);
        set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
        note(id, `Watching ${dir} for new versions`);
        void useUpdates.getState().scan();
      } catch (err) {
        note(id, String(err), "warn");
      }
    },

    clearUpdateDir: async (id) => {
      try {
        const updated = await api.setUpdateDir(id, null);
        set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
        note(id, "Update folder cleared");
        void useUpdates.getState().scan();
      } catch (err) {
        note(id, String(err), "warn");
      }
    },
  };
});
