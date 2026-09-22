import type { InstallPlan, Strategy } from "./types";

const familyPkg: Record<InstallPlan["host"], string> = {
  arch: "an Arch package",
  debian: "a Debian package",
  fedora: "an RPM",
  suse: "an RPM",
  unknown: "a package",
};
const familyPm: Record<InstallPlan["host"], string> = {
  arch: "pacman",
  debian: "apt",
  fedora: "dnf",
  suse: "zypper",
  unknown: "the package manager",
};

export function strategySentence(
  strategy: Strategy,
  host: InstallPlan["host"],
  appimageDir?: string,
): string {
  switch (strategy.type) {
    case "convertToNative":
      return `Convert to ${familyPkg[host]} and install it with ${familyPm[host]}.`;
    case "nativeInstall":
      return `Install with ${familyPm[host]}.`;
    case "appImageIntegrate":
      return `Move to ${appimageDir ? shortHome(appimageDir) : "~/Applications"} and add it to your app menu.`;
    case "unsupported":
      return strategy.reason;
  }
}

function shortHome(p: string): string {
  const m = p.match(/^\/home\/[^/]+(\/.*)?$/);
  return m ? `~${m[1] ?? ""}` : p;
}
