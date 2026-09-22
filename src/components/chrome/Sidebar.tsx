import { ArrowDownToLine, Info, Rows3, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useNav, type Page } from "@/state/nav";
import { APP_VERSION } from "@/lib/version";
import { useUpdates } from "@/state/updates";

const items: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "install", label: "Install", icon: ArrowDownToLine },
  { id: "library", label: "Library", icon: Rows3 },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
  { id: "about", label: "About", icon: Info },
];

export function Sidebar() {
  const page = useNav((s) => s.page);
  const go = useNav((s) => s.go);
  const updates = useUpdates((s) => s.candidates.length);
  return (
    <nav className="hairline-r relative flex flex-col items-stretch pt-2" aria-label="Sections">
      {items.map(({ id, label, icon: Icon }) => {
        const active = page === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 py-3.5 transition-colors",
              active ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={1.25} />
              {id === "library" && updates > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-stamp px-1 font-mono text-[9px] leading-none text-paper"
                  aria-label={`${updates} updates available`}
                >
                  {updates}
                </span>
              )}
            </span>
            <span className="mono-label text-[9px] text-current">{label}</span>
            {active && (
              <motion.span
                layoutId="nav-dash"
                className="absolute bottom-1 left-[28px] h-px w-4 bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
      <div className="mt-auto pb-3 text-center">
        <span className="mono-label text-[9px]" title="ZLynstall version">
          v{APP_VERSION}
        </span>
      </div>
    </nav>
  );
}
