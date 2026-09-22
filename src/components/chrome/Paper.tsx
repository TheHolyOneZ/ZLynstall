import type { ReactNode } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";

export function Paper({ children }: { children: ReactNode }) {
  return (
    <div className="paper">
      <TitleBar />
      <Sidebar />
      <main className="sheet-grid relative overflow-hidden">{children}</main>
    </div>
  );
}
