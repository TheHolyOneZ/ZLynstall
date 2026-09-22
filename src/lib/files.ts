import type { PackageKind } from "./types";

export function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

export function kindFromName(path: string): PackageKind | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".deb")) return "deb";
  if (lower.endsWith(".rpm")) return "rpm";
  if (lower.endsWith(".appimage")) return "appimage";
  return null;
}

export const kindLabel: Record<PackageKind, string> = {
  deb: ".deb",
  rpm: ".rpm",
  appimage: "AppImage",
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

export function shortHome(p: string): string {
  const m = p.match(/^\/home\/[^/]+(\/.*)?$/);
  return m ? `~${m[1] ?? ""}` : p;
}
