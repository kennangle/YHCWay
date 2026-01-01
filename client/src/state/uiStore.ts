import { create } from "zustand";

type UIState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  viewMode: "board" | "list";
  setViewMode: (v: "board" | "list") => void;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  viewMode: "board",
  setViewMode: (v) => set({ viewMode: v }),
}));
