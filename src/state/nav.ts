import { create } from "zustand";

export type Page = "install" | "library" | "settings" | "about";

interface NavState {
  page: Page;
  go: (page: Page) => void;
}

export const useNav = create<NavState>((set) => ({
  page: "install",
  go: (page) => set({ page }),
}));
