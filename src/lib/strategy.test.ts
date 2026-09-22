import { describe, expect, it } from "vitest";
import { strategySentence } from "./strategy";

describe("strategySentence", () => {
  it("describes each strategy per host", () => {
    expect(strategySentence({ type: "convertToNative", target: "pacman" }, "arch")).toBe(
      "Convert to an Arch package and install it with pacman.",
    );
    expect(strategySentence({ type: "nativeInstall", format: "deb" }, "debian")).toBe(
      "Install with apt.",
    );
    expect(strategySentence({ type: "convertToNative", target: "rpm" }, "suse")).toContain(
      "zypper",
    );
    expect(strategySentence({ type: "appImageIntegrate" }, "fedora", "/home/me/Apps")).toBe(
      "Move to ~/Apps and add it to your app menu.",
    );
    expect(strategySentence({ type: "unsupported", reason: "nope" }, "unknown")).toBe("nope");
  });
});
