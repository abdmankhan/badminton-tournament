/**
 * Player Statistics Calculator
 * Calculates comprehensive player stats including Impact Score
 */

/**
 * Calculate Impact Score for a player
 * Impact Score = weighted combination of:
 * - Points per match (40%)
 * - Win contribution (30%)
 * - Consistency (20%)
 * - Clutch factor (10%)
 */
export function calculateImpactScore(stats) {
  if (!stats || stats.matchesPlayed === 0) return 0;

  // Points per match (normalized to 0-100, assuming 15 pts/match is excellent)
  const ptsPerMatch = stats.totalPoints / stats.matchesPlayed;
  const ptsScore = Math.min(100, (ptsPerMatch / 15) * 100);

  // Win contribution = (points in won matches / total team points in won matches) * 100
  const winContribution = stats.winPoints > 0 && stats.teamWinPoints > 0
    ? (stats.winPoints / stats.teamWinPoints) * 100
    : 0;

  // Consistency = inverse of variance in points per match (normalized)
  // Higher consistency = less variance = better
  const avgPts = stats.totalPoints / stats.matchesPlayed;
  const variance = stats.pointsPerMatch?.reduce((sum, pts) => 
    sum + Math.pow(pts - avgPts, 2), 0) / stats.matchesPlayed || 0;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, 100 - stdDev * 10);

  // Clutch factor = performance in close games (deuce, final set, etc.)
  const clutchScore = stats.clutchPoints > 0 && stats.clutchOpportunities > 0
    ? (stats.clutchPoints / stats.clutchOpportunities) * 100
    : 50; // Default to neutral if no clutch situations

  // Weighted combination
  const impactScore = (
    ptsScore * 0.40 +
    winContribution * 0.30 +
    consistencyScore * 0.20 +
    clutchScore * 0.10
  );

  return Math.round(impactScore * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate player statistics from match events
 */
export function calculatePlayerStats(playerId, playerName, matches, teamId) {
  const stats = {
    playerId,
    playerName,
    teamId,
    matchesPlayed: 0,
    matchesWon: 0,
    totalPoints: 0,
    winPoints: 0,
    teamWinPoints: 0,
    lossPoints: 0,
    pointsPerMatch: [],
    clutchPoints: 0,
    clutchOpportunities: 0,
    averagePointsPerMatch: 0,
    winRate: 0,
    contributionRate: 0,
    impactScore: 0,
    matchHistory: [],
  };

  for (const match of matches) {
    if (match.status !== 'completed') continue;

    // Check if player participated in this match
    const isTeamA = match.teamA?.toString() === teamId?.toString() ||
                    match.teamA?._id?.toString() === teamId?.toString();
    const isTeamB = match.teamB?.toString() === teamId?.toString() ||
                    match.teamB?._id?.toString() === teamId?.toString();
    
    if (!isTeamA && !isTeamB) continue;

    const events = match.events || [];
    const playerEvents = events.filter(e => 
      !e.undone && 
      e.actorType === 'player' && 
      (e.playerId === playerId || e.playerId === playerName || e.playerName === playerName)
    );

    if (playerEvents.length === 0) continue;

    // Player participated in this match
    stats.matchesPlayed++;

    // Calculate points in this match
    const matchPoints = playerEvents.reduce((sum, e) => 
      sum + (e.actionType === '+1' ? 1 : -1), 0);
    stats.totalPoints += Math.max(0, matchPoints);
    stats.pointsPerMatch.push(Math.max(0, matchPoints));

    // Check if team won
    const teamWon = match.winnerId?.toString() === teamId?.toString();
    
    // Calculate team total points
    const teamEvents = events.filter(e => 
      !e.undone && 
      e.actionType === '+1' &&
      (e.teamId === teamId || e.teamId?.toString() === teamId?.toString())
    );
    const teamTotalPoints = teamEvents.length;

    if (teamWon) {
      stats.matchesWon++;
      stats.winPoints += Math.max(0, matchPoints);
      stats.teamWinPoints += teamTotalPoints;
    } else {
      stats.lossPoints += Math.max(0, matchPoints);
    }

    // Clutch analysis - points scored when score was 18+ for either team
    for (const event of playerEvents) {
      if (event.actionType !== '+1') continue;
      
      const eventIndex = events.indexOf(event);
      const priorEvents = events.slice(0, eventIndex).filter(e => !e.undone && e.actionType === '+1');
      const teamAPoints = priorEvents.filter(e => 
        (isTeamA && (e.teamId === match.teamA || e.teamId?.toString() === match.teamA?.toString())) ||
        (!isTeamA && (e.teamId === match.teamB || e.teamId?.toString() === match.teamB?.toString()))
      ).length;
      const teamBPoints = priorEvents.length - teamAPoints;
      
      if (Math.max(teamAPoints, teamBPoints) >= 18) {
        stats.clutchOpportunities++;
        stats.clutchPoints++;
      }
    }

    // Match history entry
    stats.matchHistory.push({
      matchId: match._id,
      matchNumber: match.matchNumber,
      matchType: match.matchType,
      points: Math.max(0, matchPoints),
      teamPoints: teamTotalPoints,
      won: teamWon,
      date: match.endedAt || match.startedAt,
    });
  }

  // Calculate derived stats
  if (stats.matchesPlayed > 0) {
    stats.averagePointsPerMatch = Math.round((stats.totalPoints / stats.matchesPlayed) * 10) / 10;
    stats.winRate = Math.round((stats.matchesWon / stats.matchesPlayed) * 100);
    
    // Contribution rate = player points / team points in won matches
    if (stats.teamWinPoints > 0) {
      stats.contributionRate = Math.round((stats.winPoints / stats.teamWinPoints) * 100);
    }
  }

  // Calculate Impact Score
  stats.impactScore = calculateImpactScore(stats);

  return stats;
}

/**
 * Calculate all player stats for a tournament
 */
export function calculateTournamentPlayerStats(teams, matches) {
  const allPlayerStats = [];

  for (const team of teams) {
    const teamId = team._id || team.id;
    const players = team.players || [];

    for (const player of players) {
      if (player.isSubstitute) continue;
      
      const playerId = player._id || player.name;
      const stats = calculatePlayerStats(playerId, player.name, matches, teamId);
      
      allPlayerStats.push({
        ...stats,
        teamName: team.name,
        photoUrl: player.photoUrl,
      });
    }
  }

  // Sort by impact score
  allPlayerStats.sort((a, b) => b.impactScore - a.impactScore);

  // Add rank
  allPlayerStats.forEach((player, index) => {
    player.rank = index + 1;
  });

  return allPlayerStats;
}

/**
 * Get top performers in specific categories
 */
export function getTopPerformers(playerStats) {
  return {
    topScorer: [...playerStats].sort((a, b) => b.totalPoints - a.totalPoints)[0],
    mostConsistent: [...playerStats].sort((a, b) => {
      const aVar = calculateVariance(a.pointsPerMatch);
      const bVar = calculateVariance(b.pointsPerMatch);
      return aVar - bVar; // Lower variance = more consistent
    })[0],
    highestWinRate: [...playerStats].filter(p => p.matchesPlayed >= 2)
      .sort((a, b) => b.winRate - a.winRate)[0],
    clutchPlayer: [...playerStats].sort((a, b) => b.clutchPoints - a.clutchPoints)[0],
    mvp: playerStats[0], // Highest impact score
  };
}

function calculateVariance(arr) {
  if (!arr || arr.length === 0) return Infinity;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}
