import create from 'zustand';
export const useGameStore = create(set => ({
 state: null,
 setState: (s) => set({ state: s })
}));
