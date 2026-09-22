import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ArrowUpRight, Check } from "lucide-react";
import { Sheet } from "@/components/ui/Field";
import { InkButton } from "@/components/blueprint/InkButton";
import { APP_VERSION } from "@/lib/version";
import { AUTHOR, LICENSE, LINKS } from "@/lib/links";
import { familyLabel } from "@/lib/tauri";
import { useSystem } from "@/state/system";
import { useAuth } from "@/state/auth";

function LinkRow({ label, hint, href }: { label: string; hint: string; href: string }) {
  const pretty = href.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <button
      type="button"
      onClick={() => void openUrl(href)}
      className="group flex w-full items-center justify-between gap-6 py-3 text-left not-last:border-b not-last:border-rule"
    >
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] text-ink-soft">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-ink-soft underline decoration-rule underline-offset-4 group-hover:text-ink group-hover:decoration-ink">
        {pretty}
        <ArrowUpRight size={12} strokeWidth={1.5} />
      </span>
    </button>
  );
}

export function AboutPage() {
  const info = useSystem((s) => s.info);
  const auth = useAuth((s) => s.status);
  const [copied, setCopied] = useState(false);

  const diagnostics = () => {
    const tools = info?.tools.map((t) => `${t.name}: ${t.path ?? "missing"}`).join("\n  ") ?? "";
    return [
      `ZLynstall v${APP_VERSION}`,
      `host: ${info?.prettyName ?? "?"} (${info ? familyLabel[info.family] : "?"}) · ${info?.arch ?? "?"}`,
      `desktop: ${info?.desktop ?? "?"} · ${info?.session ?? "?"}`,
      `privileges: ${auth?.mode ?? "?"} · sudo ${auth?.sudoAvailable ? "yes" : "no"} · pkexec ${auth?.pkexecAvailable ? "yes" : "no"}`,
      `tools:\n  ${tools}`,
    ].join("\n");
  };

  const copy = async () => {
    try {
      await writeText(diagnostics());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-10 pt-8 pb-24">
      <div className="flex items-start gap-5">
        <img
          src="/icon.png"
          alt=""
          className="size-[72px] rounded-[18px] border border-rule"
          draggable={false}
        />
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-none text-ink">ZLynstall</h1>
          <p className="mono-label mt-2">
            v{APP_VERSION} · {LICENSE} · drawn by {AUTHOR}
          </p>
          <p className="mt-3 max-w-[560px] text-[13px] leading-snug text-ink-soft">
            Drop a <span className="font-mono text-ink">.deb</span>, an{" "}
            <span className="font-mono text-ink">.rpm</span> or an AppImage and it gets installed
            the right way for this distro — as a real native package where it has to be, with a menu
            entry, and a Library to remove or update it from. It never runs as root, never runs what
            you drop, and never touches the network.
          </p>
        </div>
      </div>

      <div className="mt-8 grid max-w-[720px] gap-5">
        <Sheet title="Links">
          <LinkRow
            label="This project"
            hint="Website, downloads and release notes"
            href={LINKS.website}
          />
          <LinkRow
            label="Source code"
            hint="Read it, build it, report a bug, send a patch"
            href={LINKS.source}
          />
          <LinkRow label="The developer" hint={`${AUTHOR} on GitHub`} href={LINKS.developer} />
          <LinkRow
            label="More projects like this"
            hint="Other tools by the same hand"
            href={LINKS.moreProjects}
          />
          <LinkRow label="Game mods" hint="The other half of the workshop" href={LINKS.gameMods} />
        </Sheet>

        <Sheet title="Licence">
          <p className="py-3 text-[13px] leading-snug text-ink-soft">
            ZLynstall is free software: you can redistribute it and modify it under the terms of the{" "}
            <button
              type="button"
              onClick={() => void openUrl(LINKS.license)}
              className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              GNU General Public License, version 3
            </button>{" "}
            or any later version. It comes without any warranty. © 2026 {AUTHOR}.
          </p>
        </Sheet>

        <Sheet title="Built with">
          <div className="grid grid-cols-2 gap-x-6 py-2 font-mono text-[11.5px] text-ink-soft sm:grid-cols-4">
            <span>Tauri 2</span>
            <span>Rust</span>
            <span>React 19</span>
            <span>Tailwind 4</span>
            <span>Fraunces</span>
            <span>IBM Plex Mono</span>
            <span>Inter</span>
            <span>WebKitGTK</span>
          </div>
        </Sheet>

        <Sheet
          title="This computer"
          aside={
            <InkButton variant="link" onClick={() => void copy()}>
              {copied ? (
                <>
                  <Check size={12} strokeWidth={1.5} /> copied
                </>
              ) : (
                "copy diagnostics"
              )}
            </InkButton>
          }
        >
          <pre className="py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-ink-soft select-text">
            {diagnostics()}
          </pre>
        </Sheet>
      </div>
    </div>
  );
}
