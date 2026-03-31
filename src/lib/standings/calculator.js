/**
 * Calculate standings for all teams in a tournament
 */
export function calculateStandings(teams, matches) {
  const completedMatches = matches.filter(m => m.status === 'completed' && m.matchType === 'league');
  
  // Initialize stats for each team
  const standings = teams.map(team => ({
    teamId: team._id || team.id,
    teamName: team.name,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    leaguePoints: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
    totalDurationMinutes: 0,
    efficiencyScore: 0,
    headToHead: {},
  }));

  const standingsMap = new Map(standings.map(s => [s.teamId?.toString(), s]));

  // Process each completed match
  for (const match of completedMatches) {
    const teamAId = (match.teamA?._id || match.teamA)?.toString();
    const teamBId = (match.teamB?._id || match.teamB)?.toString();
    const winnerId = match.winnerId?.toString();

    const teamAStats = standingsMap.get(teamAId);
    const teamBStats = standingsMap.get(teamBId);

    if (!teamAStats || !teamBStats) continue;

    // Calculate total points for each team in this match
    let teamAPoints = 0;
    let teamBPoints = 0;

    if (match.sets && match.sets.length > 0) {
      for (const set of match.sets) {
        teamAPoints += set.teamAScore || 0;
        teamBPoints += set.teamBScore || 0;
      }
    }

    const duration = match.durationMinutes || 1;

    // Update Team A stats
    teamAStats.matchesPlayed++;
    teamAStats.pointsFor += teamAPoints;
    teamAStats.pointsAgainst += teamBPoints;
    teamAStats.totalDurationMinutes += duration;

    // Update Team B stats
    teamBStats.matchesPlayed++;
    teamBStats.pointsFor += teamBPoints;
    teamBStats.pointsAgainst += teamAPoints;
    teamBStats.totalDurationMinutes += duration;

    // Update wins/losses
    if (winnerId === teamAId) {
      teamAStats.wins++;
      teamAStats.leaguePoints += 2;
      teamBStats.losses++;
      teamAStats.headToHead[teamBId] = 'win';
      teamBStats.headToHead[teamAId] = 'loss';
    } else if (winnerId === teamBId) {
      teamBStats.wins++;
      teamBStats.leaguePoints += 2;
      teamAStats.losses++;
      teamBStats.headToHead[teamAId] = 'win';
      teamAStats.headToHead[teamBId] = 'loss';
    }

    // Calculate match efficiency for this match
    const teamAMatchEfficiency = (teamAPoints - teamBPoints) / duration;
    const teamBMatchEfficiency = (teamBPoints - teamAPoints) / duration;

    teamAStats.efficiencyScore += teamAMatchEfficiency;
    teamBStats.efficiencyScore += teamBMatchEfficiency;
  }

  // Calculate point differences and round efficiency scores
  for (const s of standings) {
    s.pointDifference = s.pointsFor - s.pointsAgainst;
    s.efficiencyScore = Math.round(s.efficiencyScore * 1000) / 1000;
  }

  // Sort standings
  standings.sort((a, b) => {
    // 1. League points (descending)
    if (b.leaguePoints !== a.leaguePoints) {
      return b.leaguePoints - a.leaguePoints;
    }

    // 2. Tournament Efficiency Score (descending)
    if (b.efficiencyScore !== a.efficiencyScore) {
      return b.efficiencyScore - a.efficiencyScore;
    }

    // 3. Head-to-head result
    const h2h = a.headToHead[b.teamId?.toString()];
    if (h2h === 'win') return -1;
    if (h2h === 'loss') return 1;

    // 4. Point difference (descending)
    if (b.pointDifference !== a.pointDifference) {
      return b.pointDifference - a.pointDifference;
    }

    // 5. Points for (descending)
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  standings.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return standings;
}

/**
 * Get top N teams from standings
 */
export function getTopTeams(standings, n) {
  return standings.slice(0, n);
}

/**
 * Format efficiency score for display
 */
export function formatEfficiencyScore(score) {
  if (score === 0) return '0.000';
  return score > 0 ? `+${score.toFixed(3)}` : score.toFixed(3);
}
