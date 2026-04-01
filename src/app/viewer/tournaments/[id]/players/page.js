"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Trophy, Target, TrendingUp, Medal, 
  Zap, Star, Users, BarChart3, Award, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <Link href={`/viewer/tournaments/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white">
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
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedPlayer?.playerId === player.playerId 
                      ? 'bg-blue-600/30 border border-blue-500' 
                      : 'bg-gray-700/50 hover:bg-gray-700'
                  } ${index < 3 ? 'ring-1 ring-yellow-500/30' : ''}`}
                  onClick={() => setSelectedPlayer(selectedPlayer?.playerId === player.playerId ? null : player)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-gray-300'
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

                    <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform ${
                      selectedPlayer?.playerId === player.playerId ? 'rotate-90' : ''
                    }`} />
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
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  match.won 
                                    ? 'bg-green-600/30 text-green-300' 
                                    : 'bg-red-600/30 text-red-300'
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
