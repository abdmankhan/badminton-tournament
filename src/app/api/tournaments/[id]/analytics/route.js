import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Tournament from '@/lib/db/models/Tournament';
import Match from '@/lib/db/models/Match';
import { calculateTournamentPlayerStats } from '@/lib/standings/playerStats';

/**
 * GET /api/tournaments/[id]/analytics
 * Get comprehensive tournament analytics
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const matches = await Match.find({ tournamentId: id }).lean();
    const completedMatches = matches.filter(m => m.status === 'completed');

    // Calculate match statistics
    const matchStats = {
      total: matches.length,
      completed: completedMatches.length,
      live: matches.filter(m => m.status === 'live').length,
      scheduled: matches.filter(m => m.status === 'scheduled').length,
      league: matches.filter(m => m.matchType === 'league').length,
      finals: matches.filter(m => m.matchType === 'final').length,
    };

    // Calculate scoring trends
    let totalPoints = 0;
    let totalDuration = 0;
    let highestScore = { teamA: 0, teamB: 0, matchId: null };
    let closestGame = { diff: Infinity, matchId: null };
    let longestMatch = { duration: 0, matchId: null };
    const scoringDistribution = Array(22).fill(0); // 0-21 points distribution

    for (const match of completedMatches) {
      const scoreA = match.score?.teamA || 0;
      const scoreB = match.score?.teamB || 0;
      totalPoints += scoreA + scoreB;

      // Track highest scoring game
      if (scoreA + scoreB > highestScore.teamA + highestScore.teamB) {
        highestScore = { teamA: scoreA, teamB: scoreB, matchId: match._id };
      }

      // Track closest game
      const diff = Math.abs(scoreA - scoreB);
      if (diff < closestGame.diff) {
        closestGame = { diff, matchId: match._id, scoreA, scoreB };
      }

      // Track duration
      if (match.duration) {
        totalDuration += match.duration;
        if (match.duration > longestMatch.duration) {
          longestMatch = { duration: match.duration, matchId: match._id };
        }
      }

      // Scoring distribution
      if (scoreA <= 21) scoringDistribution[scoreA]++;
      if (scoreB <= 21) scoringDistribution[scoreB]++;
    }

    // Calculate team performance
    const teamPerformance = tournament.teams.map(team => {
      const teamMatches = completedMatches.filter(m => 
        m.teamA?.toString() === team._id?.toString() || 
        m.teamB?.toString() === team._id?.toString()
      );
      
      const wins = teamMatches.filter(m => m.winnerId?.toString() === team._id?.toString()).length;
      const losses = teamMatches.length - wins;
      
      let pointsFor = 0;
      let pointsAgainst = 0;
      
      teamMatches.forEach(m => {
        const isTeamA = m.teamA?.toString() === team._id?.toString();
        pointsFor += isTeamA ? (m.score?.teamA || 0) : (m.score?.teamB || 0);
        pointsAgainst += isTeamA ? (m.score?.teamB || 0) : (m.score?.teamA || 0);
      });

      return {
        teamId: team._id,
        teamName: team.name,
        photoUrl: team.photoUrl,
        played: teamMatches.length,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        pointDiff: pointsFor - pointsAgainst,
        winRate: teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : 0,
      };
    }).sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff);

    // Player stats
    const playerStats = calculateTournamentPlayerStats(tournament.teams, completedMatches);

    // Deuce analysis
    let deuceGames = 0;
    let maxDeuceScore = 0;
    
    for (const match of completedMatches) {
      const scoreA = match.score?.teamA || 0;
      const scoreB = match.score?.teamB || 0;
      if (scoreA >= 21 && scoreB >= 19 || scoreB >= 21 && scoreA >= 19) {
        deuceGames++;
        const maxScore = Math.max(scoreA, scoreB);
        if (maxScore > maxDeuceScore) maxDeuceScore = maxScore;
      }
    }

    return NextResponse.json({
      tournament: {
        name: tournament.name,
        status: tournament.status,
        teamsCount: tournament.teams.length,
        createdAt: tournament.createdAt,
      },
      matchStats,
      scoringTrends: {
        averagePointsPerMatch: completedMatches.length > 0 
          ? Math.round(totalPoints / completedMatches.length) 
          : 0,
        averageDuration: completedMatches.length > 0 
          ? Math.round(totalDuration / completedMatches.length / 60) 
          : 0, // in minutes
        highestScore,
        closestGame,
        longestMatch,
        deuceGames,
        maxDeuceScore,
        scoringDistribution,
      },
      teamPerformance,
      playerStats: playerStats.slice(0, 10), // Top 10 players
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
