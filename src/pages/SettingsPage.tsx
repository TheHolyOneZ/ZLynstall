import { open } from "@tauri-apps/plugin-dialog";
import { Check, X } from "lucide-react";
import { Field, Sheet } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Segmented } from "@/components/ui/Segmented";
import { InkButton } from "@/components/blueprint/InkButton";
import { useSettings } from "@/state/settings";
import { useSystem } from "@/state/system";
import { familyLabel, type Theme } from "@/lib/tauri";
import type { PrivilegeMode } from "@/lib/types";
import { useAuth } from "@/state/auth";

export function SettingsPage() {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const info = useSystem((s) => s.info);
  const installing = useSystem((s) => s.installing);
  const toolNote = useSystem((s) => s.toolNote);
  const installTool = useSystem((s) => s.installTool);
  const auth = useAuth((s) => s.status);
  const refreshAuth = useAuth((s) => s.refresh);

  if (!settings) return null;

  const pickUpdateDir = async () => {
    const dir = await open({
      directory: true,
      defaultPath: settings.updateDir ?? undefined,
      title: "Update folder",
    });
    if (typeof dir === "string") void update({ updateDir: dir });
  };

  const pickAppImageDir = async () => {
    const dir = await open({
      directory: true,
      defaultPath: settings.appimageDir,
      title: "AppImage folder",
    });
    if (typeof dir === "string") void update({ appimageDir: dir });
  };

  return (
    <div className="h-full overflow-y-auto px-10 pt-8 pb-24">
      <h1 className="font-display text-[26px] leading-none text-ink">Settings</h1>
      <p className="mono-label mt-2">sheet preferences</p>

      <div className="mt-8 grid max-w-[720px] gap-5">
        <Sheet title="Folders">
          <Field
            label="AppImage folder"
            hint="AppImages are moved here so they don't live in Downloads."
          >
            <div className="flex items-center gap-3">
              <span className="max-w-[260px] truncate font-mono text-[11px] text-ink-soft">
                {settings.appimageDir}
              </span>
              <InkButton onClick={() => void pickAppImageDir()}>Change</InkButton>
            </div>
          </Field>
        </Sheet>

        <Sheet title="Defaults">
          <Field label="Desktop shortcut" hint="Also place a launcher on the desktop by default.">
            <Switch
              checked={settings.desktopShortcutDefault}
              onCheckedChange={(v) => void update({ desktopShortcutDefault: v })}
              label="Desktop shortcut by default"
            />
          </Field>
          <Field
            label="Tidy up AppImages"
            hint="Remove the original file once it's been moved into the AppImage folder."
          >
            <Switch
              checked={settings.removeOriginalAppimage}
              onCheckedChange={(v) => void update({ removeOriginalAppimage: v })}
              label="Remove original AppImage"
            />
          </Field>
          <Field label="Tidy up packages" hint="Delete the .deb / .rpm after a successful install.">
            <Switch
              checked={settings.removeOriginalPackage}
              onCheckedChange={(v) => void update({ removeOriginalPackage: v })}
              label="Remove original package"
            />
          </Field>
        </Sheet>

        <Sheet title="Password">
          <Field
            label="Ask for your password"
            hint={
              auth?.sudoAvailable === false
                ? "sudo isn't installed, so the system prompt is used every time."
                : "Once per session: ZLynstall asks in its own dialog and hands the password to sudo, which remembers it while the app is open. Every time: the system (polkit) prompt for each command."
            }
          >
            <Segmented<PrivilegeMode>
              name="privilege"
              value={settings.privilegeMode}
              onChange={(v) => {
                void update({ privilegeMode: v }).then(() => refreshAuth());
              }}
              options={[
                { value: "session", label: "Once per session" },
                { value: "each", label: "Every time" },
              ]}
            />
          </Field>
        </Sheet>

        <Sheet title="Updates">
          <Field
            label="Update folder"
            hint="ZLynstall looks here for newer versions of apps in the Library — a file is only used when it clearly belongs to an installed app and is newer."
          >
            <div className="flex items-center gap-3">
              <span className="max-w-[220px] truncate font-mono text-[11px] text-ink-soft">
                {settings.updateDir ?? "not set"}
              </span>
              {settings.updateDir && (
                <InkButton variant="link" onClick={() => void update({ updateDir: null })}>
                  Clear
                </InkButton>
              )}
              <InkButton onClick={() => void pickUpdateDir()}>
                {settings.updateDir ? "Change" : "Choose"}
              </InkButton>
            </div>
          </Field>
          <Field
            label="Check when ZLynstall starts"
            hint="Scans the update folder and every per-app folder on launch."
          >
            <Switch
              checked={settings.checkUpdatesOnStart}
              onCheckedChange={(v) => void update({ checkUpdatesOnStart: v })}
              label="Check for updates on start"
            />
          </Field>
          <Field
            label="Install updates automatically"
            hint="Found updates are installed right away on start. AppImages need nothing; packages still ask for your password."
          >
            <Switch
              checked={settings.autoApplyUpdates}
              onCheckedChange={(v) => void update({ autoApplyUpdates: v })}
              label="Install updates automatically"
            />
          </Field>
        </Sheet>

        <Sheet title="Appearance">
          <Field label="Theme" hint="Paper is ink on cream; Blueprint is white lines on navy.">
            <Segmented<Theme>
              name="theme"
              value={settings.theme}
              onChange={(v) => void update({ theme: v })}
              options={[
                { value: "system", label: "System" },
                { value: "paper", label: "Paper" },
                { value: "blueprint", label: "Blueprint" },
              ]}
            />
          </Field>
          <Field
            label="Use system window frame"
            hint="Turn on if the window has no shadow or rounded corners on your desktop."
          >
            <Switch
              checked={settings.systemFrame}
              onCheckedChange={(v) => void update({ systemFrame: v })}
              label="System window frame"
            />
          </Field>
        </Sheet>

        <Sheet title="Sound">
          <Field
            label="Sound effects"
            hint="A soft slide on drop, ticks per stage, a thunk on the stamp."
          >
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(v) => void update({ soundEnabled: v })}
              label="Sound effects"
            />
          </Field>
          <Field label="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              disabled={!settings.soundEnabled}
              onChange={(e) => void update({ soundVolume: Number(e.target.value) })}
              className="w-40 accent-(--ink)"
              aria-label="Volume"
            />
          </Field>
        </Sheet>

        <Sheet
          title="Tools"
          aside={
            info && (
              <span className="mono-label">
                {info.prettyName} · {familyLabel[info.family]} · {info.desktop ?? "no desktop"}
              </span>
            )
          }
        >
          {info?.tools.map((t) => {
            const present = t.path !== null;
            return (
              <Field
                key={t.name}
                label={t.name}
                hint={`${t.kind === "library" ? "library" : "command"} · needed for ${t.requiredFor}${t.optional ? " (optional)" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {present ? (
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
                      <Check size={14} strokeWidth={1.5} /> {t.path}
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-warn">
                        <X size={14} strokeWidth={1.5} /> missing
                      </span>
                      {t.package && (
                        <InkButton
                          disabled={installing !== null}
                          onClick={() => void installTool(t.package ?? "")}
                        >
                          {installing === t.package ? "Installing…" : `Install ${t.package}`}
                        </InkButton>
                      )}
                    </>
                  )}
                </div>
              </Field>
            );
          })}
          {toolNote && (
            <p
              className={
                toolNote.tone === "warn"
                  ? "py-2 text-[12px] text-stamp"
                  : "py-2 text-[12px] text-ink-soft"
              }
            >
              {toolNote.text}
            </p>
          )}
        </Sheet>
      </div>
    </div>
  );
}
