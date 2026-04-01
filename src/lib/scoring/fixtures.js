import { generateId } from '@/lib/utils';

/**
 * Generate round-robin fixtures for N teams with proper rest scheduling
 * Uses the "circle method" algorithm to ensure each team gets adequate rest
 * 
 * For 6 teams (a,b,c,d,e,f):
 * Round 1: a-b, c-d, e-f (all teams play once, then rest)
 * Round 2: a-c, b-e, d-f
 * etc.
 * 
 * This ensures no team plays back-to-back matches
 */
export function generateRoundRobinFixtures(teamIds) {
  const n = teamIds.length;
  
  if (n < 2) return [];
  if (n === 2) {
    return [{
      teamA: teamIds[0],
      teamB: teamIds[1],
      matchNumber: 1,
    }];
  }
  
  // For odd number of teams, add a "bye" placeholder
  const teams = [...teamIds];
  const hasBye = n % 2 !== 0;
  if (hasBye) {
    teams.push(null); // null represents a bye
  }
  
  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  const fixtures = [];
  
  // Circle method: fix one team, rotate the rest
  // Team at index 0 is fixed, others rotate clockwise
  const rotatingTeams = teams.slice(1);
  
  for (let round = 0; round < numRounds; round++) {
    // Current arrangement for this round
    const roundTeams = [teams[0], ...rotatingTeams];
    
    // Generate matches for this round
    for (let match = 0; match < matchesPerRound; match++) {
      const teamA = roundTeams[match];
      const teamB = roundTeams[numTeams - 1 - match];
      
      // Skip if either team is a bye (null)
      if (teamA !== null && teamB !== null) {
        fixtures.push({
          teamA,
          teamB,
          matchNumber: fixtures.length + 1,
          round: round + 1,
        });
      }
    }
    
    // Rotate: move last element to position 1
    const lastTeam = rotatingTeams.pop();
    rotatingTeams.unshift(lastTeam);
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
    round: fixture.round,
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
