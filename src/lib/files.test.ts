import { describe, expect, it } from "vitest";
import { basename, formatBytes, kindFromName, shortHome } from "./files";

describe("files helpers", () => {
  it("guesses the kind from the extension, case-insensitively", () => {
    expect(kindFromName("/x/discord.deb")).toBe("deb");
    expect(kindFromName("/x/hello.RPM")).toBe("rpm");
    expect(kindFromName("/x/Obsidian.AppImage")).toBe("appimage");
    expect(kindFromName("/x/notes.txt")).toBeNull();
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(82 * 1024 * 1024)).toBe("82 MB");
  });

  it("shortens home paths and takes basenames", () => {
    expect(shortHome("/home/me/Applications/x.AppImage")).toBe("~/Applications/x.AppImage");
    expect(shortHome("/opt/x")).toBe("/opt/x");
    expect(basename("/a/b/c.deb")).toBe("c.deb");
  });
});
