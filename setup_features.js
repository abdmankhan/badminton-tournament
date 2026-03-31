// Setup script to create player stats API directory and route
// Run this with: node setup_features.js
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Create player-stats directory
const playerStatsDir = path.join(rootDir, 'src', 'app', 'api', 'tournaments', '[id]', 'player-stats');
fs.mkdirSync(playerStatsDir, { recursive: true });
console.log('Created:', playerStatsDir);

// Create the route.js file
const routeContent = `import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Tournament from '@/lib/db/models/Tournament';
import Match from '@/lib/db/models/Match';
import { calculateTournamentPlayerStats, getTopPerformers } from '@/lib/standings/playerStats';

/**
 * GET /api/tournaments/[id]/player-stats
 * Get all player statistics for a tournament
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    // Get tournament with teams
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all completed matches
    const matches = await Match.find({
      tournamentId: id,
      status: 'completed',
    }).lean();

    // Calculate player stats
    const playerStats = calculateTournamentPlayerStats(tournament.teams, matches);
    const topPerformers = getTopPerformers(playerStats);

    // Return with no-cache headers
    return NextResponse.json(
      {
        playerStats,
        topPerformers,
        totalMatches: matches.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
`;

fs.writeFileSync(path.join(playerStatsDir, 'route.js'), routeContent);
console.log('Created:', path.join(playerStatsDir, 'route.js'));

// Create analytics directory
const analyticsDir = path.join(rootDir, 'src', 'app', 'api', 'tournaments', '[id]', 'analytics');
fs.mkdirSync(analyticsDir, { recursive: true });
console.log('Created:', analyticsDir);

// Create analytics route.js
const analyticsContent = `import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
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
`;

fs.writeFileSync(path.join(analyticsDir, 'route.js'), analyticsContent);
console.log('Created:', path.join(analyticsDir, 'route.js'));

// Create match-history directory
const historyDir = path.join(rootDir, 'src', 'app', 'api', 'tournaments', '[id]', 'match-history');
fs.mkdirSync(historyDir, { recursive: true });
console.log('Created:', historyDir);

// Create match-history route.js
const historyContent = `import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Tournament from '@/lib/db/models/Tournament';
import Match from '@/lib/db/models/Match';

/**
 * GET /api/tournaments/[id]/match-history
 * Get detailed match history with event timeline
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const matches = await Match.find({ 
      tournamentId: id,
      status: 'completed' 
    }).sort({ endedAt: -1 }).lean();

    // Build team lookup map
    const teamMap = {};
    tournament.teams.forEach(team => {
      teamMap[team._id.toString()] = team;
    });

    // Enrich match data
    const enrichedMatches = matches.map(match => {
      const teamA = teamMap[match.teamA?.toString()];
      const teamB = teamMap[match.teamB?.toString()];
      const winner = teamMap[match.winnerId?.toString()];

      // Calculate point timeline from events
      const events = match.events || [];
      const timeline = [];
      let runningScoreA = 0;
      let runningScoreB = 0;

      events.filter(e => !e.undone && e.actionType === '+1').forEach((event, idx) => {
        const isTeamA = event.teamId?.toString() === match.teamA?.toString();
        if (isTeamA) runningScoreA++;
        else runningScoreB++;

        timeline.push({
          index: idx + 1,
          scoreA: runningScoreA,
          scoreB: runningScoreB,
          team: isTeamA ? 'A' : 'B',
          playerName: event.playerName || null,
          timestamp: event.timestamp,
        });
      });

      // Calculate momentum shifts (when lead changes)
      let momentumShifts = 0;
      let lastLeader = null;
      timeline.forEach(point => {
        const leader = point.scoreA > point.scoreB ? 'A' : point.scoreB > point.scoreA ? 'B' : null;
        if (leader && leader !== lastLeader) {
          momentumShifts++;
          lastLeader = leader;
        }
      });

      // Find key moments (deuce, game points, etc.)
      const keyMoments = [];
      timeline.forEach((point, idx) => {
        if (point.scoreA === 20 && point.scoreB === 20) {
          keyMoments.push({ type: 'deuce', point: idx + 1, score: '20-20' });
        }
        if ((point.scoreA === 20 && point.scoreB < 20) || (point.scoreB === 20 && point.scoreA < 20)) {
          keyMoments.push({ 
            type: 'gamePoint', 
            point: idx + 1, 
            team: point.scoreA === 20 ? 'A' : 'B',
            score: \`\${point.scoreA}-\${point.scoreB}\`
          });
        }
      });

      return {
        _id: match._id,
        matchNumber: match.matchNumber,
        matchType: match.matchType,
        teamA: teamA ? { name: teamA.name, photoUrl: teamA.photoUrl } : null,
        teamB: teamB ? { name: teamB.name, photoUrl: teamB.photoUrl } : null,
        score: match.score,
        winner: winner ? { name: winner.name, photoUrl: winner.photoUrl } : null,
        duration: match.duration,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
        timeline,
        momentumShifts,
        keyMoments,
        totalEvents: events.filter(e => !e.undone).length,
      };
    });

    return NextResponse.json({
      matches: enrichedMatches,
      totalMatches: enrichedMatches.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching match history:', error);
    return NextResponse.json({ error: 'Failed to fetch match history' }, { status: 500 });
  }
}
`;

fs.writeFileSync(path.join(historyDir, 'route.js'), historyContent);
console.log('Created:', path.join(historyDir, 'route.js'));

// Create viewer player profile page directory
const playerProfileDir = path.join(rootDir, 'src', 'app', 'viewer', 'tournaments', '[id]', 'players');
fs.mkdirSync(playerProfileDir, { recursive: true });
console.log('Created:', playerProfileDir);

// Create player profile page
const playerProfileContent = `"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Trophy, Target, TrendingUp, Medal, 
  Zap, Star, Users, BarChart3, Award, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PlayersPage({ params }) {
  const { id } = use(params);
  const [playerStats, setPlayerStats] = useState([]);
  const [topPerformers, setTopPerformers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    fetchPlayerStats();
  }, [id]);

  async function fetchPlayerStats() {
    try {
      const res = await fetch(\`/api/tournaments/\${id}/player-stats\`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPlayerStats(data.playerStats || []);
      setTopPerformers(data.topPerformers || null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={\`/viewer/tournaments/\${id}\`} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Player Leaderboard
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Top Performers Cards */}
        {topPerformers && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topPerformers.mvp && (
              <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-600/50">
                <CardContent className="p-3 text-center">
                  <Trophy className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
                  <p className="text-xs text-yellow-300">MVP</p>
                  <p className="font-bold text-sm truncate">{topPerformers.mvp.playerName}</p>
                  <p className="text-xs text-gray-400">{topPerformers.mvp.impactScore} Impact</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.topScorer && (
              <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/50">
                <CardContent className="p-3 text-center">
                  <Target className="h-6 w-6 mx-auto text-purple-400 mb-1" />
                  <p className="text-xs text-purple-300">Top Scorer</p>
                  <p className="font-bold text-sm truncate">{topPerformers.topScorer.playerName}</p>
                  <p className="text-xs text-gray-400">{topPerformers.topScorer.totalPoints} pts</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.highestWinRate && (
              <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/50">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto text-green-400 mb-1" />
                  <p className="text-xs text-green-300">Highest Win%</p>
                  <p className="font-bold text-sm truncate">{topPerformers.highestWinRate.playerName}</p>
                  <p className="text-xs text-gray-400">{topPerformers.highestWinRate.winRate}% wins</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.clutchPlayer && (
              <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-600/50">
                <CardContent className="p-3 text-center">
                  <Zap className="h-6 w-6 mx-auto text-red-400 mb-1" />
                  <p className="text-xs text-red-300">Clutch King</p>
                  <p className="font-bold text-sm truncate">{topPerformers.clutchPlayer.playerName}</p>
                  <p className="text-xs text-gray-400">{topPerformers.clutchPlayer.clutchPoints} clutch pts</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Player List */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              All Players by Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {playerStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No player stats available yet. Complete some matches first!</p>
            ) : (
              playerStats.map((player, index) => (
                <div 
                  key={player.playerId}
                  className={\`p-3 rounded-lg cursor-pointer transition-all \${
                    selectedPlayer?.playerId === player.playerId 
                      ? 'bg-blue-600/30 border border-blue-500' 
                      : 'bg-gray-700/50 hover:bg-gray-700'
                  } \${index < 3 ? 'ring-1 ring-yellow-500/30' : ''}\`}
                  onClick={() => setSelectedPlayer(selectedPlayer?.playerId === player.playerId ? null : player)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm \${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-gray-300'
                    }\`}>
                      {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
                    </div>

                    {/* Photo or Initials */}
                    {player.photoUrl ? (
                      <img 
                        src={player.photoUrl} 
                        alt={player.playerName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                        {player.playerName?.charAt(0) || '?'}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{player.playerName}</p>
                      <p className="text-xs text-gray-400">{player.teamName}</p>
                    </div>

                    {/* Impact Score */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-400">{player.impactScore}</p>
                      <p className="text-xs text-gray-400">Impact</p>
                    </div>

                    <ChevronRight className={\`h-5 w-5 text-gray-500 transition-transform \${
                      selectedPlayer?.playerId === player.playerId ? 'rotate-90' : ''
                    }\`} />
                  </div>

                  {/* Expanded Stats */}
                  {selectedPlayer?.playerId === player.playerId && (
                    <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{player.totalPoints}</p>
                        <p className="text-xs text-gray-400">Total Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{player.matchesPlayed}</p>
                        <p className="text-xs text-gray-400">Matches</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{player.winRate}%</p>
                        <p className="text-xs text-gray-400">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">{player.averagePointsPerMatch}</p>
                        <p className="text-xs text-gray-400">Avg/Match</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{player.contributionRate}%</p>
                        <p className="text-xs text-gray-400">Contribution</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">{player.clutchPoints}</p>
                        <p className="text-xs text-gray-400">Clutch Pts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{player.matchesWon}</p>
                        <p className="text-xs text-gray-400">Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">{player.matchesPlayed - player.matchesWon}</p>
                        <p className="text-xs text-gray-400">Losses</p>
                      </div>

                      {/* Match History */}
                      {player.matchHistory && player.matchHistory.length > 0 && (
                        <div className="col-span-full mt-2">
                          <p className="text-sm font-semibold mb-2 text-gray-300">Match History</p>
                          <div className="flex flex-wrap gap-2">
                            {player.matchHistory.map((match, mIdx) => (
                              <div 
                                key={mIdx}
                                className={\`px-3 py-1 rounded-full text-xs font-medium \${
                                  match.won 
                                    ? 'bg-green-600/30 text-green-300' 
                                    : 'bg-red-600/30 text-red-300'
                                }\`}
                              >
                                {match.matchType === 'final' ? '🏆' : ''} 
                                M{match.matchNumber}: {match.points} pts ({match.won ? 'W' : 'L'})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(playerProfileDir, 'page.js'), playerProfileContent);
console.log('Created:', path.join(playerProfileDir, 'page.js'));

// Create analytics page directory
const analyticsPageDir = path.join(rootDir, 'src', 'app', 'viewer', 'tournaments', '[id]', 'analytics');
fs.mkdirSync(analyticsPageDir, { recursive: true });
console.log('Created:', analyticsPageDir);

// Create analytics page
const analyticsPageContent = `"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, BarChart3, Trophy, Target, Clock, 
  TrendingUp, Zap, Users, Activity, Award, Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AnalyticsPage({ params }) {
  const { id } = use(params);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [id]);

  async function fetchAnalytics() {
    try {
      const res = await fetch(\`/api/tournaments/\${id}/analytics\`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center text-white">
        <p>No analytics data available</p>
      </div>
    );
  }

  const { matchStats, scoringTrends, teamPerformance, playerStats, tournament } = analytics;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={\`/viewer/tournaments/\${id}\`} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Analytics
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tournament Overview */}
        <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/50">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-2">{tournament.name}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-purple-400">{tournament.teamsCount}</p>
                <p className="text-xs text-gray-400">Teams</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{matchStats.completed}</p>
                <p className="text-xs text-gray-400">Matches Played</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">{matchStats.total - matchStats.completed}</p>
                <p className="text-xs text-gray-400">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-3 text-center">
              <Activity className="h-6 w-6 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold">{scoringTrends.averagePointsPerMatch}</p>
              <p className="text-xs text-gray-400">Avg Points/Match</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-3 text-center">
              <Clock className="h-6 w-6 mx-auto text-green-400 mb-1" />
              <p className="text-2xl font-bold">{scoringTrends.averageDuration}m</p>
              <p className="text-xs text-gray-400">Avg Duration</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-3 text-center">
              <Zap className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
              <p className="text-2xl font-bold">{scoringTrends.deuceGames}</p>
              <p className="text-xs text-gray-400">Deuce Games</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-3 text-center">
              <Target className="h-6 w-6 mx-auto text-red-400 mb-1" />
              <p className="text-2xl font-bold">{scoringTrends.maxDeuceScore || 21}</p>
              <p className="text-xs text-gray-400">Highest Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Highlight Matches */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Match Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {scoringTrends.highestScore?.matchId && (
              <div className="p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg">
                <p className="text-xs text-yellow-300 mb-1">🔥 Highest Scoring Match</p>
                <p className="text-xl font-bold">{scoringTrends.highestScore.teamA} - {scoringTrends.highestScore.teamB}</p>
                <p className="text-xs text-gray-400">Total: {scoringTrends.highestScore.teamA + scoringTrends.highestScore.teamB} points</p>
              </div>
            )}
            {scoringTrends.closestGame?.matchId && (
              <div className="p-3 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-lg">
                <p className="text-xs text-red-300 mb-1">⚡ Closest Match</p>
                <p className="text-xl font-bold">{scoringTrends.closestGame.scoreA} - {scoringTrends.closestGame.scoreB}</p>
                <p className="text-xs text-gray-400">Difference: {scoringTrends.closestGame.diff} point(s)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamPerformance.map((team, index) => (
              <div key={team.teamId} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm \${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-600'
                }\`}>
                  {index + 1}
                </div>
                {team.photoUrl ? (
                  <img src={team.photoUrl} alt={team.teamName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                    {team.teamName?.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{team.teamName}</p>
                  <p className="text-xs text-gray-400">{team.wins}W - {team.losses}L</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">{team.winRate}%</p>
                  <p className="text-xs text-gray-400">Win Rate</p>
                </div>
                <div className="text-right">
                  <p className={\`text-lg font-bold \${team.pointDiff >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                    {team.pointDiff >= 0 ? '+' : ''}{team.pointDiff}
                  </p>
                  <p className="text-xs text-gray-400">Pt Diff</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-400" />
              Top 5 Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {playerStats.slice(0, 5).map((player, index) => (
              <div key={player.playerId} className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold \${
                  index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600'
                }\`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{player.playerName}</p>
                  <p className="text-xs text-gray-400">{player.teamName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">{player.impactScore}</p>
                  <p className="text-xs text-gray-400">Impact</p>
                </div>
              </div>
            ))}
            <Link href={\`/viewer/tournaments/\${id}/players\`} className="block text-center text-blue-400 hover:text-blue-300 text-sm mt-2">
              View All Players →
            </Link>
          </CardContent>
        </Card>

        {/* Scoring Distribution */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-green-400" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-1">
              {scoringTrends.scoringDistribution?.slice(0, 22).map((count, score) => {
                const maxCount = Math.max(...scoringTrends.scoringDistribution);
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={score} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t transition-all"
                      style={{ height: \`\${height}%\`, minHeight: count > 0 ? '4px' : '0' }}
                      title={\`\${score} points: \${count} times\`}
                    />
                    {score % 5 === 0 && (
                      <span className="text-xs text-gray-400 mt-1">{score}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Final scores distribution (0-21 points)</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(analyticsPageDir, 'page.js'), analyticsPageContent);
console.log('Created:', path.join(analyticsPageDir, 'page.js'));

// Create match history page
const historyPageDir = path.join(rootDir, 'src', 'app', 'viewer', 'tournaments', '[id]', 'history');
fs.mkdirSync(historyPageDir, { recursive: true });
console.log('Created:', historyPageDir);

const historyPageContent = `"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, History, Trophy, Clock, TrendingUp, 
  ChevronDown, ChevronUp, Zap, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function MatchHistoryPage({ params }) {
  const { id } = use(params);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  async function fetchHistory() {
    try {
      const res = await fetch(\`/api/tournaments/\${id}/match-history\`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={\`/viewer/tournaments/\${id}\`} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-orange-400" />
            Match History
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {matches.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400">No completed matches yet</p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card 
              key={match._id}
              className={\`bg-gray-800/50 border-gray-700 cursor-pointer transition-all \${
                match.matchType === 'final' ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-900/20 to-amber-900/20' : ''
              }\`}
              onClick={() => setExpandedMatch(expandedMatch === match._id ? null : match._id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {match.matchType === 'final' && (
                      <Trophy className="h-5 w-5 text-yellow-400" />
                    )}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        {match.matchType === 'final' ? '🏆 FINAL' : \`Match #\${match.matchNumber}\`}
                      </p>
                      <p className="font-semibold">
                        {match.teamA?.name || 'Team A'} vs {match.teamB?.name || 'Team B'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold">
                        <span className={match.winner?.name === match.teamA?.name ? 'text-green-400' : ''}>
                          {match.score?.teamA || 0}
                        </span>
                        <span className="text-gray-500 mx-1">-</span>
                        <span className={match.winner?.name === match.teamB?.name ? 'text-green-400' : ''}>
                          {match.score?.teamB || 0}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(match.duration)}
                      </p>
                    </div>
                    {expandedMatch === match._id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedMatch === match._id && (
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                    {/* Key Moments */}
                    {match.keyMoments && match.keyMoments.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          Key Moments
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {match.keyMoments.map((moment, idx) => (
                            <span 
                              key={idx}
                              className={\`px-2 py-1 rounded text-xs \${
                                moment.type === 'deuce' ? 'bg-yellow-600/30 text-yellow-300' :
                                'bg-purple-600/30 text-purple-300'
                              }\`}
                            >
                              {moment.type === 'deuce' ? '🎯 Deuce!' : '🎾 Game Point'} @ {moment.score}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-blue-400">{match.totalEvents || 0}</p>
                        <p className="text-xs text-gray-400">Total Points</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-purple-400">{match.momentumShifts || 0}</p>
                        <p className="text-xs text-gray-400">Lead Changes</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-400">{match.winner?.name?.split(' ')[0] || 'TBD'}</p>
                        <p className="text-xs text-gray-400">Winner</p>
                      </div>
                    </div>

                    {/* Point Timeline Mini Visualization */}
                    {match.timeline && match.timeline.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          Score Progression
                        </p>
                        <div className="h-16 flex items-end gap-px">
                          {match.timeline.map((point, idx) => {
                            const diff = point.scoreA - point.scoreB;
                            const height = Math.abs(diff) * 3;
                            const isTeamA = diff > 0;
                            return (
                              <div 
                                key={idx}
                                className="flex-1 flex flex-col justify-end items-center"
                              >
                                <div 
                                  className={\`w-full rounded-t \${
                                    isTeamA ? 'bg-blue-500' : diff < 0 ? 'bg-red-500' : 'bg-gray-500'
                                  }\`}
                                  style={{ height: \`\${Math.max(4, height)}px\` }}
                                  title={\`\${point.scoreA}-\${point.scoreB}\`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Start</span>
                          <span>{match.teamA?.name} leading (blue) / {match.teamB?.name} leading (red)</span>
                          <span>End</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(historyPageDir, 'page.js'), historyPageContent);
console.log('Created:', path.join(historyPageDir, 'page.js'));

console.log('\\n✅ All files created successfully!');
console.log('\\nNew features added:');
console.log('1. Player Stats API: /api/tournaments/[id]/player-stats');
console.log('2. Analytics API: /api/tournaments/[id]/analytics');
console.log('3. Match History API: /api/tournaments/[id]/match-history');
console.log('4. Player Leaderboard Page: /viewer/tournaments/[id]/players');
console.log('5. Analytics Dashboard: /viewer/tournaments/[id]/analytics');
console.log('6. Match History Page: /viewer/tournaments/[id]/history');
