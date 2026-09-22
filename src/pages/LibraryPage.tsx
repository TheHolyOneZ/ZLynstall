import { useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Ledger } from "@/components/blueprint/Ledger";
import { UpdatesPanel } from "@/components/blueprint/UpdatesPanel";
import { InkButton } from "@/components/blueprint/InkButton";
import { Segmented } from "@/components/ui/Segmented";
import { useLibrary, visibleEntries, type KindFilter, type SortOrder } from "@/state/library";
import { cn } from "@/lib/cn";

export function LibraryPage() {
  const entries = useLibrary((s) => s.entries);
  const loaded = useLibrary((s) => s.loaded);
  const load = useLibrary((s) => s.load);
  const query = useLibrary((s) => s.query);
  const kind = useLibrary((s) => s.kind);
  const sort = useLibrary((s) => s.sort);
  const setQuery = useLibrary((s) => s.setQuery);
  const setKind = useLibrary((s) => s.setKind);
  const setSort = useLibrary((s) => s.setSort);
  const selectMode = useLibrary((s) => s.selectMode);
  const setSelectMode = useLibrary((s) => s.setSelectMode);
  const selected = useLibrary((s) => s.selected);
  const selectAll = useLibrary((s) => s.selectAll);
  const clearSelection = useLibrary((s) => s.clearSelection);
  const removeMany = useLibrary((s) => s.removeMany);
  const repairMany = useLibrary((s) => s.repairMany);
  const busy = useLibrary((s) => s.busy);
  const bulkNote = useLibrary((s) => s.bulkNote);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => visibleEntries(entries, query, kind, sort),
    [entries, query, kind, sort],
  );
  const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.includes(e.id));

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-10 pt-8 pb-28">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-[26px] leading-none text-ink">Library</h1>
            <p className="mono-label mt-2">everything zlynstall installed</p>
          </div>
          {entries.length > 0 && (
            <span className="mono-label">
              {visible.length === entries.length
                ? `${entries.length} item${entries.length === 1 ? "" : "s"}`
                : `${visible.length} of ${entries.length}`}
            </span>
          )}
        </div>

        {entries.length > 0 && <UpdatesPanel />}

        {entries.length > 0 && (
          <div className="mt-6 flex max-w-[760px] flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="relative flex flex-1 items-center gap-2 border-b border-rule pb-1.5 focus-within:border-ink">
                <Search size={14} strokeWidth={1.5} className="shrink-0 text-ink-soft" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search name, version, package, author, date…"
                  className="w-full bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-ink-soft/70"
                  aria-label="Search the library"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-ink-soft hover:text-ink"
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                )}
              </label>
              <InkButton
                variant={selectMode ? "ink" : "outline"}
                onClick={() => setSelectMode(!selectMode)}
                className="px-3 py-1.5"
              >
                {selectMode ? "Done" : "Select"}
              </InkButton>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Segmented<KindFilter>
                name="kind"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "all", label: "All" },
                  { value: "deb", label: ".deb" },
                  { value: "rpm", label: ".rpm" },
                  { value: "appimage", label: "AppImage" },
                ]}
              />
              <Segmented<SortOrder>
                name="sort"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "oldest", label: "Oldest" },
                  { value: "name", label: "A–Z" },
                ]}
              />
            </div>
          </div>
        )}

        {loaded && entries.length === 0 ? (
          <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <EmptyShelf />
            <p className="text-[13px] text-ink-soft">Nothing installed through ZLynstall yet.</p>
          </div>
        ) : visible.length === 0 && loaded ? (
          <p className="mt-10 text-center text-[13px] text-ink-soft">Nothing matches “{query}”.</p>
        ) : (
          <div className="mt-5 max-w-[760px]">
            <Ledger entries={visible} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-x-10 bottom-5 flex items-center gap-4 rounded-card border border-ink bg-paper px-4 py-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,.6)]"
          >
            <span className="mono-label text-ink">{selected.length} selected</span>
            <InkButton
              variant="link"
              onClick={() =>
                allVisibleSelected ? clearSelection() : selectAll(visible.map((e) => e.id))
              }
            >
              {allVisibleSelected ? "Select none" : "Select all"}
            </InkButton>
            {bulkNote && (
              <span
                className={cn(
                  "truncate text-[12px]",
                  bulkNote.tone === "warn" ? "text-stamp" : "text-ink-soft",
                )}
              >
                {bulkNote.text}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <InkButton
                disabled={busy !== null || selected.length === 0}
                onClick={() => void repairMany(selected)}
              >
                Repair {selected.length > 0 ? selected.length : ""}
              </InkButton>
              <InkButton
                variant="stamp"
                disabled={busy !== null || selected.length === 0}
                onClick={() => void removeMany(selected)}
              >
                Remove {selected.length > 0 ? selected.length : ""}
              </InkButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyShelf() {
  return (
    <svg
      width="160"
      height="72"
      viewBox="0 0 160 72"
      fill="none"
      aria-hidden
      className="text-ink-soft"
    >
      <path d="M8 24h144M8 48h144" stroke="currentColor" strokeWidth="1" />
      <path
        d="M16 24v-8M144 24v-8M16 48v-8M144 48v-8"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <path
        d="M40 24v-14h14v14M60 24l8-12 8 12"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text
        x="80"
        y="66"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="8"
        letterSpacing="2"
        fill="currentColor"
      >
        SHELF · EMPTY
      </text>
    </svg>
  );
}
