import { generateId } from '@/lib/utils';

/**
 * Generate round-robin fixtures for N teams
 * Returns array of match pairings [{teamA, teamB}]
 */
export function generateRoundRobinFixtures(teamIds) {
  const fixtures = [];
  const n = teamIds.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push({
        teamA: teamIds[i],
        teamB: teamIds[j],
        matchNumber: fixtures.length + 1,
      });
    }
  }

  return fixtures;
}

/**
 * Create match objects from fixtures
 */
export function createMatchesFromFixtures(fixtures, tournamentId, setCount = 1) {
  return fixtures.map((fixture, idx) => ({
    _id: generateId(),
    tournamentId,
    teamA: fixture.teamA,
    teamB: fixture.teamB,
    matchType: 'league',
    matchNumber: idx + 1,
    setCount,
    currentSet: 1,
    status: 'scheduled',
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      teamAScore: 0,
      teamBScore: 0,
      winnerId: null,
      isComplete: false,
    })),
    timerState: {
      status: 'stopped',
      elapsedSeconds: 0,
      lastStartedAt: null,
    },
    winnerId: null,
    events: [],
    startedAt: null,
    endedAt: null,
    durationMinutes: 0,
  }));
}

/**
 * Create final match between top 2 teams
 */
export function createFinalMatch(tournamentId, teamAId, teamBId, setCount = 3) {
  return {
    _id: generateId(),
    tournamentId,
    teamA: teamAId,
    teamB: teamBId,
    matchType: 'final',
    matchNumber: 0, // Finals don't have match numbers in the league sequence
    setCount,
    currentSet: 1,
    status: 'scheduled',
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      teamAScore: 0,
      teamBScore: 0,
      winnerId: null,
      isComplete: false,
    })),
    timerState: {
      status: 'stopped',
      elapsedSeconds: 0,
      lastStartedAt: null,
    },
    winnerId: null,
    events: [],
    startedAt: null,
    endedAt: null,
    durationMinutes: 0,
  };
}
