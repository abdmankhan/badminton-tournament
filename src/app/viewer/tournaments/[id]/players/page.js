"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Trophy, Target, TrendingUp, Medal, 
  Zap, Star, Users, BarChart3, Award, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlayersPage({ params }) {
  const { id } = params;
  const [playerStats, setPlayerStats] = useState([]);
  const [topPerformers, setTopPerformers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    fetchPlayerStats();
  }, [id]);

  async function fetchPlayerStats() {
    try {
      const res = await fetch(`/api/tournaments/${id}/player-stats`);
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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

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
            <Users className="h-5 w-5 text-blue-500" />
            Player Leaderboard
          </h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Top Performers Cards */}
        {topPerformers && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topPerformers.mvp && (
              <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300">
                <CardContent className="p-3 text-center">
                  <Trophy className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                  <p className="text-xs text-yellow-700">MVP</p>
                  <p className="font-bold text-sm truncate text-gray-900">{topPerformers.mvp.playerName}</p>
                  <p className="text-xs text-gray-600">{topPerformers.mvp.impactScore} Impact</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.topScorer && (
              <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300">
                <CardContent className="p-3 text-center">
                  <Target className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                  <p className="text-xs text-purple-700">Top Scorer</p>
                  <p className="font-bold text-sm truncate text-gray-900">{topPerformers.topScorer.playerName}</p>
                  <p className="text-xs text-gray-600">{topPerformers.topScorer.totalPoints} pts</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.highestWinRate && (
              <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xs text-green-700">Highest Win%</p>
                  <p className="font-bold text-sm truncate text-gray-900">{topPerformers.highestWinRate.playerName}</p>
                  <p className="text-xs text-gray-600">{topPerformers.highestWinRate.winRate}% wins</p>
                </CardContent>
              </Card>
            )}
            {topPerformers.clutchPlayer && (
              <Card className="bg-gradient-to-br from-red-100 to-red-200 border-red-300">
                <CardContent className="p-3 text-center">
                  <Zap className="h-6 w-6 mx-auto text-red-600 mb-1" />
                  <p className="text-xs text-red-700">Clutch King</p>
                  <p className="font-bold text-sm truncate text-gray-900">{topPerformers.clutchPlayer.playerName}</p>
                  <p className="text-xs text-gray-600">{topPerformers.clutchPlayer.clutchPoints} clutch pts</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Player List */}
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              All Players by Impact Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {playerStats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No player stats available yet. Complete some matches first!</p>
            ) : (
              playerStats.map((player, index) => (
                <div 
                  key={player.playerId}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedPlayer?.playerId === player.playerId 
                      ? 'bg-blue-50 border-blue-400' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  } ${index < 3 ? 'ring-1 ring-yellow-300' : ''}`}
                  onClick={() => setSelectedPlayer(selectedPlayer?.playerId === player.playerId ? null : player)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
                        {player.playerName?.charAt(0) || '?'}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-gray-900">{player.playerName}</p>
                      <p className="text-xs text-gray-500">{player.teamName}</p>
                    </div>

                    {/* Impact Score */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{player.impactScore}</p>
                      <p className="text-xs text-gray-500">Impact</p>
                    </div>

                    <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                      selectedPlayer?.playerId === player.playerId ? 'rotate-90' : ''
                    }`} />
                  </div>

                  {/* Expanded Stats */}
                  {selectedPlayer?.playerId === player.playerId && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{player.totalPoints}</p>
                        <p className="text-xs text-gray-500">Total Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{player.matchesPlayed}</p>
                        <p className="text-xs text-gray-500">Matches</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{player.winRate}%</p>
                        <p className="text-xs text-gray-500">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{player.averagePointsPerMatch}</p>
                        <p className="text-xs text-gray-500">Avg/Match</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{player.contributionRate}%</p>
                        <p className="text-xs text-gray-500">Contribution</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-500">{player.clutchPoints}</p>
                        <p className="text-xs text-gray-500">Clutch Pts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{player.matchesWon}</p>
                        <p className="text-xs text-gray-500">Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-500">{player.matchesPlayed - player.matchesWon}</p>
                        <p className="text-xs text-gray-500">Losses</p>
                      </div>

                      {/* Match History */}
                      {player.matchHistory && player.matchHistory.length > 0 && (
                        <div className="col-span-full mt-2">
                          <p className="text-sm font-semibold mb-2 text-gray-700">Match History</p>
                          <div className="flex flex-wrap gap-2">
                            {player.matchHistory.map((match, mIdx) => (
                              <div 
                                key={mIdx}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  match.won 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}
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
