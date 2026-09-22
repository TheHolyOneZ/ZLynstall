import { describe, expect, it } from "vitest";
import type { InstalledEntry } from "@/lib/types";
import { matchesQuery, visibleEntries } from "./library";

function entry(over: Partial<InstalledEntry>): InstalledEntry {
  return {
    id: over.id ?? "id",
    name: "App",
    slug: "app",
    version: "1.0.0",
    sourceKind: "deb",
    installKind: "native",
    hostPackage: null,
    appimagePath: null,
    desktopFiles: [],
    launcher: null,
    iconPath: null,
    originalPath: "/tmp/app.deb",
    installedAt: "2026-09-21T10:00:00Z",
    unresolvedDeps: [],
    summary: null,
    description: null,
    maintainer: null,
    homepage: null,
    license: null,
    arch: null,
    fileSize: null,
    updateDir: null,
    ignoredVersions: [],
    history: [],
    ...over,
  };
}

const a = entry({
  id: "a",
  name: "ZFontManager",
  slug: "z-font-manager",
  version: "0.6.0",
  maintainer: "Etienne",
  installedAt: "2026-09-21T10:00:00Z",
});
const b = entry({
  id: "b",
  name: "Obsidian",
  slug: "obsidian",
  version: "1.6.7",
  sourceKind: "appimage",
  installKind: "appimage",
  installedAt: "2026-09-22T10:00:00Z",
});

describe("library search and ordering", () => {
  it("matches every word against name, version, package and author", () => {
    expect(matchesQuery(a, "font")).toBe(true);
    expect(matchesQuery(a, "0.6")).toBe(true);
    expect(matchesQuery(a, "etienne font")).toBe(true);
    expect(matchesQuery(a, "obsidian")).toBe(false);
    expect(matchesQuery(a, "")).toBe(true);
  });

  it("filters by kind and sorts", () => {
    expect(visibleEntries([a, b], "", "appimage", "newest").map((e) => e.id)).toEqual(["b"]);
    expect(visibleEntries([a, b], "", "all", "newest").map((e) => e.id)).toEqual(["b", "a"]);
    expect(visibleEntries([a, b], "", "all", "oldest").map((e) => e.id)).toEqual(["a", "b"]);
    expect(visibleEntries([a, b], "", "all", "name").map((e) => e.id)).toEqual(["b", "a"]);
  });
});
