import { create } from "zustand";

type SelectionState = {
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
}));
