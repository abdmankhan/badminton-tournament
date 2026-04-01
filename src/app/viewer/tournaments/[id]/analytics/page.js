"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, BarChart3, Trophy, Target, Clock, 
  TrendingUp, Zap, Users, Activity, Award, Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage({ params }) {
  const { id } = params;
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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center text-gray-700">
        <p>No analytics data available</p>
      </div>
    );
  }

  const { matchStats, scoringTrends, teamPerformance, playerStats, tournament } = analytics;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/viewer/tournaments/${id}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Analytics
          </h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tournament Overview */}
        <Card className="bg-gradient-to-br from-purple-100 to-blue-100 border-purple-300">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-2 text-gray-900">{tournament.name}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-purple-600">{tournament.teamsCount}</p>
                <p className="text-xs text-gray-600">Teams</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{matchStats.completed}</p>
                <p className="text-xs text-gray-600">Matches Played</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{matchStats.total - matchStats.completed}</p>
                <p className="text-xs text-gray-600">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 text-center">
              <Activity className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{scoringTrends.averagePointsPerMatch}</p>
              <p className="text-xs text-gray-500">Avg Points/Match</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 text-center">
              <Clock className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{scoringTrends.averageDuration}m</p>
              <p className="text-xs text-gray-500">Avg Duration</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 text-center">
              <Zap className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{scoringTrends.deuceGames}</p>
              <p className="text-xs text-gray-500">Deuce Games</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-3 text-center">
              <Target className="h-6 w-6 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{scoringTrends.maxDeuceScore || 21}</p>
              <p className="text-xs text-gray-500">Highest Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Highlight Matches */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Match Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {scoringTrends.highestScore?.matchId && (
              <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700 mb-1">🔥 Highest Scoring Match</p>
                <p className="text-xl font-bold text-gray-900">{scoringTrends.highestScore.teamA} - {scoringTrends.highestScore.teamB}</p>
                <p className="text-xs text-gray-600">Total: {scoringTrends.highestScore.teamA + scoringTrends.highestScore.teamB} points</p>
              </div>
            )}
            {scoringTrends.closestGame?.matchId && (
              <div className="p-3 bg-gradient-to-r from-red-100 to-pink-100 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 mb-1">⚡ Closest Match</p>
                <p className="text-xl font-bold text-gray-900">{scoringTrends.closestGame.scoreA} - {scoringTrends.closestGame.scoreB}</p>
                <p className="text-xs text-gray-600">Difference: {scoringTrends.closestGame.diff} point(s)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-blue-500" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamPerformance.map((team, index) => (
              <div key={team.teamId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-400 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {team.photoUrl ? (
                  <img src={team.photoUrl} alt={team.teamName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
                    {team.teamName?.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{team.teamName}</p>
                  <p className="text-xs text-gray-500">{team.wins}W - {team.losses}L</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{team.winRate}%</p>
                  <p className="text-xs text-gray-500">Win Rate</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${team.pointDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {team.pointDiff >= 0 ? '+' : ''}{team.pointDiff}
                  </p>
                  <p className="text-xs text-gray-500">Pt Diff</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Players */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Award className="h-5 w-5 text-purple-500" />
              Top 5 Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {playerStats.slice(0, 5).map((player, index) => (
              <div key={player.playerId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{player.playerName}</p>
                  <p className="text-xs text-gray-500">{player.teamName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{player.impactScore}</p>
                  <p className="text-xs text-gray-500">Impact</p>
                </div>
              </div>
            ))}
            <Link href={`/viewer/tournaments/${id}/players`} className="block text-center text-blue-600 hover:text-blue-700 text-sm mt-2">
              View All Players →
            </Link>
          </CardContent>
        </Card>

        {/* Scoring Distribution */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <Percent className="h-5 w-5 text-green-500" />
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
                      className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      title={`${score} points: ${count} times`}
                    />
                    {score % 5 === 0 && (
                      <span className="text-xs text-gray-500 mt-1">{score}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">Final scores distribution (0-21 points)</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
