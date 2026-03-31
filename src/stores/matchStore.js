import { create } from 'zustand';
import { createScoreEvent, calculateScoresFromEvents, undoLastEvent } from '@/lib/scoring/engine';

export const useMatchStore = create((set, get) => ({
  // Current match being scored
  currentMatch: null,
  
  // Timer state
  timerSeconds: 0,
  timerRunning: false,
  timerInterval: null,

  // Load a match for scoring
  loadMatch: (match) => {
    const state = get();
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
    
    set({
      currentMatch: match,
      timerSeconds: match.timerState?.elapsedSeconds || 0,
      timerRunning: false,
      timerInterval: null,
    });
  },

  // Add a score event
  addScoreEvent: (eventData) => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    const event = createScoreEvent({
      ...eventData,
      setNumber: currentMatch.currentSet || 1,
    });

    const updatedEvents = [...(currentMatch.events || []), event];
    const updatedMatch = { ...currentMatch, events: updatedEvents };

    set({ currentMatch: updatedMatch });
    return event;
  },

  // Undo last event
  undoLast: () => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    const { events, undoneEvent } = undoLastEvent(currentMatch.events || []);
    const updatedMatch = { ...currentMatch, events };

    set({ currentMatch: updatedMatch });
    return undoneEvent;
  },

  // Get current scores
  getCurrentScores: () => {
    const { currentMatch } = get();
    if (!currentMatch) return null;

    return calculateScoresFromEvents(
      currentMatch.events || [],
      currentMatch.teamA?._id || currentMatch.teamA,
      currentMatch.teamB?._id || currentMatch.teamB
    );
  },

  // Timer controls
  startTimer: () => {
    const { timerRunning, timerInterval } = get();
    if (timerRunning) return;

    const interval = setInterval(() => {
      set((state) => ({ timerSeconds: state.timerSeconds + 1 }));
    }, 1000);

    set({ timerRunning: true, timerInterval: interval });
  },

  pauseTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({ timerRunning: false, timerInterval: null });
  },

  resetTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({ timerSeconds: 0, timerRunning: false, timerInterval: null });
  },

  // Update current set
  setCurrentSet: (setNumber) => {
    const { currentMatch } = get();
    if (!currentMatch) return;

    set({
      currentMatch: { ...currentMatch, currentSet: setNumber },
    });
  },

  // Clear match
  clearMatch: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    set({
      currentMatch: null,
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null,
    });
  },
}));
