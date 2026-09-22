import { familyLabel } from "@/lib/tauri";
import { useSystem } from "@/state/system";

export function TitleBlock() {
  const info = useSystem((s) => s.info);
  const cells: [string, string][] = [
    ["host", info ? `${info.prettyName} · ${familyLabel[info.family]}` : "detecting…"],
    [
      "desktop",
      info ? `${info.desktop ?? "unknown"}${info.session ? ` · ${info.session}` : ""}` : "…",
    ],
    ["arch", info?.arch ?? "…"],
  ];
  return (
    <div className="pointer-events-none absolute right-4 bottom-4 flex overflow-hidden rounded-[2px] border border-rule bg-paper/70 backdrop-blur-[2px]">
      {cells.map(([k, v], i) => (
        <div key={k} className={i > 0 ? "hairline-r border-l px-3 py-1.5" : "px-3 py-1.5"}>
          <div className="mono-label text-[8px]">{k}</div>
          <div className="font-mono text-[10px] leading-tight text-ink">{v}</div>
        </div>
      ))}
    </div>
  );
}
