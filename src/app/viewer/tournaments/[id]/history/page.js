"use client";

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
      const res = await fetch(`/api/tournaments/${id}/match-history`);
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              className={`bg-gray-800/50 border-gray-700 cursor-pointer transition-all ${
                match.matchType === 'final' ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-900/20 to-amber-900/20' : ''
              }`}
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
                        {match.matchType === 'final' ? '🏆 FINAL' : `Match #${match.matchNumber}`}
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
                              className={`px-2 py-1 rounded text-xs ${
                                moment.type === 'deuce' ? 'bg-yellow-600/30 text-yellow-300' :
                                'bg-purple-600/30 text-purple-300'
                              }`}
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
                                  className={`w-full rounded-t ${
                                    isTeamA ? 'bg-blue-500' : diff < 0 ? 'bg-red-500' : 'bg-gray-500'
                                  }`}
                                  style={{ height: `${Math.max(4, height)}px` }}
                                  title={`${point.scoreA}-${point.scoreB}`}
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
