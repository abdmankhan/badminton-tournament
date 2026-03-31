import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useTournamentStore = create(
  persist(
    (set, get) => ({
      // Current active tournament
      activeTournament: null,
      teams: [],
      matches: [],
      standings: [],

      // Mode
      isAdmin: false,
      setIsAdmin: (isAdmin) => set({ isAdmin }),

      // Set active tournament
      setActiveTournament: (tournament) => set({ activeTournament: tournament }),

      // Set teams
      setTeams: (teams) => set({ teams }),

      // Set matches
      setMatches: (matches) => set({ matches }),

      // Update a single match
      updateMatch: (matchId, updates) => set((state) => ({
        matches: state.matches.map((m) =>
          (m._id === matchId || m.id === matchId) ? { ...m, ...updates } : m
        ),
      })),

      // Set standings
      setStandings: (standings) => set({ standings }),

      // Clear all data
      clearData: () => set({
        activeTournament: null,
        teams: [],
        matches: [],
        standings: [],
      }),
    }),
    {
      name: 'tournament-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
