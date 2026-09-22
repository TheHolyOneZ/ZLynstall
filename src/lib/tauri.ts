import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  BulkResult,
  InstallOptions,
  InstallPlan,
  InstalledEntry,
  JobEvent,
  PackageModel,
  PrivilegeMode,
  PrivilegeStatus,
  UpdateCandidate,
} from "./types";

export type Family = "arch" | "debian" | "fedora" | "suse" | "unknown";

export interface ToolStatus {
  name: string;
  kind: "binary" | "library";
  path: string | null;
  requiredFor: string;
  package: string | null;
  optional: boolean;
}

export interface SystemInfo {
  family: Family;
  id: string;
  prettyName: string;
  idLike: string;
  desktop: string | null;
  session: string | null;
  arch: string;
  isRoot: boolean;
  tools: ToolStatus[];
}

export type Theme = "system" | "paper" | "blueprint";

export interface Settings {
  appimageDir: string;
  desktopShortcutDefault: boolean;
  removeOriginalAppimage: boolean;
  removeOriginalPackage: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  theme: Theme;
  systemFrame: boolean;
  updateDir: string | null;
  checkUpdatesOnStart: boolean;
  autoApplyUpdates: boolean;
  privilegeMode: PrivilegeMode;
}

export const api = {
  systemInfo: () => invoke<SystemInfo>("get_system_info"),
  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) => invoke<void>("set_settings", { settings }),
  startupFiles: () => invoke<string[]>("get_startup_files"),
  inspectFile: (path: string) => invoke<PackageModel>("inspect_file", { path }),
  planInstall: (model: PackageModel) => invoke<InstallPlan>("plan_install", { model }),
  runInstall: (plan: InstallPlan, options: InstallOptions, onEvent: (e: JobEvent) => void) => {
    const channel = new Channel<JobEvent>();
    channel.onmessage = onEvent;
    return invoke<void>("run_install", { plan, options, onEvent: channel });
  },
  cancelJob: () => invoke<void>("cancel_job"),
  listInstalled: () => invoke<InstalledEntry[]>("list_installed"),
  uninstallEntry: (id: string, onEvent: (e: JobEvent) => void) => {
    const channel = new Channel<JobEvent>();
    channel.onmessage = onEvent;
    return invoke<InstalledEntry>("uninstall_entry", { id, onEvent: channel });
  },
  repairEntry: (id: string, onEvent: (e: JobEvent) => void) => {
    const channel = new Channel<JobEvent>();
    channel.onmessage = onEvent;
    return invoke<InstalledEntry>("repair_entry", { id, onEvent: channel });
  },
  launchEntry: (id: string) => invoke<void>("launch_entry", { id }),
  uninstallEntries: (ids: string[], onEvent: (e: JobEvent) => void) => {
    const channel = new Channel<JobEvent>();
    channel.onmessage = onEvent;
    return invoke<BulkResult>("uninstall_entries", { ids, onEvent: channel });
  },
  scanUpdates: () => invoke<UpdateCandidate[]>("scan_updates"),
  setUpdateDir: (id: string, dir: string | null) =>
    invoke<InstalledEntry>("set_update_dir", { id, dir }),
  ignoreVersion: (id: string, version: string) =>
    invoke<InstalledEntry>("ignore_version", { id, version }),
  setDesktopShortcut: (id: string, want: boolean) =>
    invoke<InstalledEntry>("set_desktop_shortcut", { id, want }),
  desktopShortcutIds: () => invoke<string[]>("desktop_shortcut_ids"),
  privilegeStatus: () => invoke<PrivilegeStatus>("privilege_status"),
  unlockSession: (password: string) => invoke<void>("unlock_session", { password }),
  lockSession: () => invoke<void>("lock_session"),
  installTool: (pkg: string, onEvent: (e: JobEvent) => void) => {
    const channel = new Channel<JobEvent>();
    channel.onmessage = onEvent;
    return invoke<void>("install_tool", { package: pkg, onEvent: channel });
  },
};

export const familyLabel: Record<Family, string> = {
  arch: "Arch",
  debian: "Debian",
  fedora: "Fedora",
  suse: "openSUSE",
  unknown: "Unknown",
};
