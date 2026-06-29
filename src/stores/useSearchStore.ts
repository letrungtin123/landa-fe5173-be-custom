import { create } from "zustand";

interface SearchState {
  globalSearchTerm: string;
  isSearchOpen: boolean;
  setGlobalSearchTerm: (term: string) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  globalSearchTerm: "",
  isSearchOpen: false,
  setGlobalSearchTerm: (term) => set({ globalSearchTerm: term }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
