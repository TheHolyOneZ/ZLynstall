export type PackageKind = "deb" | "rpm" | "appimage";

export interface DesktopEntry {
  path: string;
  name: string;
  exec: string | null;
  icon: string | null;
  comment: string | null;
  categories: string[];
  noDisplay: boolean;
  raw: string;
}

export interface RawDependency {
  name: string;
  versionReq: string | null;
  alternatives: string[];
}

export interface PackageModel {
  kind: PackageKind;
  sourcePath: string;
  fileSize: number;
  name: string;
  displayName: string;
  version: string;
  arch: string;
  summary: string | null;
  description: string | null;
  homepage: string | null;
  license: string | null;
  maintainer: string | null;
  installedSize: number | null;
  dependencies: RawDependency[];
  desktopEntries: DesktopEntry[];
  iconDataUrl: string | null;
  fileCount: number;
  topLevelPaths: string[];
}

export type NativeFormat = "pacman" | "deb" | "rpm";

export type Strategy =
  | { type: "nativeInstall"; format: NativeFormat }
  | { type: "convertToNative"; target: NativeFormat }
  | { type: "appImageIntegrate" }
  | { type: "unsupported"; reason: string };

export type StageId = "inspect" | "translate" | "build" | "install" | "move" | "shortcuts";

export interface Stage {
  id: StageId;
  label: string;
}

export type DepResolution = { raw: string; resolved: string | null } & (
  { status: "found" } | { status: "unresolved" } | { status: "skipped"; reason: string }
);

export interface InstallPlan {
  package: PackageModel;
  host: import("./tauri").Family;
  strategy: Strategy;
  stages: Stage[];
  dependencies: DepResolution[];
  needsRoot: boolean;
  missingTools: import("./tauri").ToolStatus[];
  warnings: string[];
  updateOf: UpdateMatch | null;
}

export interface InstallOptions {
  menuEntry: boolean;
  desktopShortcut: boolean;
  removeOriginal: boolean;
}

export type InstallKind = "native" | "appimage";

export interface InstalledEntry {
  id: string;
  name: string;
  slug: string;
  version: string;
  sourceKind: PackageKind;
  installKind: InstallKind;
  hostPackage: string | null;
  appimagePath: string | null;
  desktopFiles: string[];
  launcher: string | null;
  iconPath: string | null;
  originalPath: string;
  installedAt: string;
  unresolvedDeps: string[];
  summary: string | null;
  description: string | null;
  maintainer: string | null;
  homepage: string | null;
  license: string | null;
  arch: string | null;
  fileSize: number | null;
  updateDir: string | null;
  ignoredVersions: string[];
  history: VersionRecord[];
}

export interface VersionRecord {
  version: string;
  installedAt: string;
  sourceKind: PackageKind;
}

export type Relation = "newer" | "same" | "older" | "unknown";
export type Confidence = "exact" | "name" | "fuzzy" | "folder";

export interface UpdateMatch {
  entryId: string;
  entryName: string;
  installedVersion: string;
  relation: Relation;
  confidence: Confidence;
}

export interface UpdateCandidate extends UpdateMatch {
  path: string;
  kind: PackageKind;
  name: string;
  version: string;
  folder: string;

  perApp: string | null;
}

export interface BulkResult {
  removed: string[];
  failed: [string, string][];
}

export type StageStatus = "pending" | "active" | "done" | "failed";

export type JobEvent =
  | { type: "stage"; index: number; status: StageStatus }
  | { type: "narrate"; text: string }
  | { type: "log"; line: string }
  | { type: "needsAuth" }
  | { type: "done"; entry: InstalledEntry }
  | { type: "failed"; message: string; hint: string | null };

export type PrivilegeMode = "session" | "each";

export interface PrivilegeStatus {
  mode: PrivilegeMode;
  sudoAvailable: boolean;
  pkexecAvailable: boolean;
  unlocked: boolean;
  isRoot: boolean;
}

export type UnlockError =
  | { kind: "wrongPassword" }
  | { kind: "notAllowed"; message: string }
  | { kind: "unavailable" }
  | { kind: "io"; message: string };
