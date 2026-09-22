import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import { useJobs } from "@/state/jobs";
import { useUpdates } from "@/state/updates";
import { useAuth } from "@/state/auth";
import { UnlockDialog } from "@/components/blueprint/UnlockDialog";
import { AnimatePresence, motion } from "motion/react";
import { Paper } from "@/components/chrome/Paper";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { InstallPage } from "@/pages/InstallPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AboutPage } from "@/pages/AboutPage";
import { useNav } from "@/state/nav";
import { useSettings } from "@/state/settings";
import { useSystem } from "@/state/system";

const pages = {
  install: InstallPage,
  library: LibraryPage,
  settings: SettingsPage,
  about: AboutPage,
} as const;

export default function App() {
  const page = useNav((s) => s.page);
  const settings = useSettings((s) => s.settings);
  const loadSettings = useSettings((s) => s.load);
  const loadSystem = useSystem((s) => s.load);

  useEffect(() => {
    void loadSettings();
    void loadSystem();
    void useAuth.getState().refresh();
  }, [loadSettings, loadSystem]);

  useEffect(() => {
    const open = (paths: string[]) => {
      if (!paths.length) return;
      useNav.getState().go("install");
      useJobs.getState().enqueue(paths);
    };
    void api.startupFiles().then(open);
    const un = listen<string[]>("zlynstall://open-files", (e) => open(e.payload));
    return () => {
      void un.then((f) => f());
    };
  }, []);

  const scanned = useRef(false);
  useEffect(() => {
    if (!settings || scanned.current) return;
    scanned.current = true;
    if (!settings.checkUpdatesOnStart) return;
    const autoApply = settings.autoApplyUpdates;
    void useUpdates
      .getState()
      .scan()
      .then((found) => {
        if (autoApply && found.length) useUpdates.getState().applyAll();
      });
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
    if (settings.systemFrame) root.dataset.frame = "system";
    else delete root.dataset.frame;
    void getCurrentWindow().setDecorations(settings.systemFrame);
  }, [settings]);

  const Page = pages[page];

  return (
    <TooltipProvider>
      <Paper>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            className="h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Page />
          </motion.div>
        </AnimatePresence>
      </Paper>
      <UnlockDialog />
    </TooltipProvider>
  );
}
