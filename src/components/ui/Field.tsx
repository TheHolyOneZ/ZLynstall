import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 not-last:border-b not-last:border-rule">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-ink-soft">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Sheet({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative rounded-card border border-rule bg-paper/60 px-5 pt-3 pb-1">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="mono-label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
