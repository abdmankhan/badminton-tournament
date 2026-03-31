"use client";

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
      const res = await fetch(`/api/tournaments/${id}/analytics`);
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
          <Link href={`/viewer/tournaments/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white">
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-600'
                }`}>
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
                  <p className={`text-lg font-bold ${team.pointDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600'
                }`}>
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
            <Link href={`/viewer/tournaments/${id}/players`} className="block text-center text-blue-400 hover:text-blue-300 text-sm mt-2">
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
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      title={`${score} points: ${count} times`}
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
