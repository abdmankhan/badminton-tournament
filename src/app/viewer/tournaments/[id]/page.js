'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, BarChart3, Calendar, Radio, Zap, Timer, History, PieChart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateStandings } from '@/lib/standings/calculator';
import { getGameState, calculateScoresFromEvents } from '@/lib/scoring/engine';
import { getInitials, formatDuration, generatePlayerCommentary, generateTeamCommentary, generateStateCommentary } from '@/lib/utils';

// Score Animation Overlay Component
function ScoreAnimation({ event, teamA, teamB, onComplete }) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1200); // Show for 1.2 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  if (!visible || !event) return null;
  
  const isTeamA = event.teamId === teamA?._id || event.teamId?.toString() === teamA?._id?.toString();
  const teamName = isTeamA ? teamA?.name : teamB?.name;
  const playerName = event.actorType === 'player' ? event.playerName : null;
  const isPlus = event.actionType === '+1';
  
  // Team colors
  const bgColor = isTeamA 
    ? 'from-blue-600 via-blue-500 to-blue-600' 
    : 'from-red-600 via-red-500 to-red-600';
  const emojis = ['🏸', '🔥', '⚡', '💪', '🎯'];
  const emoji = isPlus ? emojis[Math.floor(Math.random() * emojis.length)] : '↩️';
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgColor}`}
      style={{
        animation: 'fadeInScale 0.2s ease-out forwards',
      }}
    >
      <style jsx>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceEmoji {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      <div 
        className="text-center text-white"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        {/* Big emoji */}
        <div 
          className="text-8xl mb-4"
          style={{ animation: 'bounceEmoji 0.6s ease-in-out infinite' }}
        >
          {emoji}
        </div>
        
        {/* Score change */}
        <div className="text-6xl font-black mb-2 drop-shadow-lg">
          {isPlus ? '+1' : '-1'}
        </div>
        
        {/* Team name */}
        <div className="text-3xl font-bold mb-1 drop-shadow-md">{teamName}</div>
        
        {/* Player name if credited */}
        {playerName && (
          <div className="text-xl opacity-90 flex items-center justify-center gap-2">
            <span>⭐</span>
            <span>{playerName}</span>
            <span>⭐</span>
          </div>
        )}
      </div>
      
      {/* Decorative sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-3xl"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `sparkle 0.8s ease-in-out ${i * 0.1}s infinite`,
            }}
          >
            {['✨', '🏸', '⭐', '💫'][i % 4]}
          </div>
        ))}
      </div>
    </div>
  );
}

// Live Match Viewer Component
function LiveMatchViewer({ matchId, teams, onNoMatch }) {
  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [scoreAnimation, setScoreAnimation] = useState(null);
  const prevEventsRef = useRef([]);
  const commentaryRef = useRef(null);
  const viewerIdRef = useRef(null);

  // Generate unique viewer ID on mount
  useEffect(() => {
    viewerIdRef.current = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const fetchMatch = useCallback(async () => {
    try {
      const viewerId = viewerIdRef.current;
      const res = await fetch(`/api/matches/${matchId}?viewerId=${viewerId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) {
        onNoMatch?.();
        return;
      }
      const data = await res.json();
      
      // Update viewer count
      if (data.viewerCount !== undefined) {
        setViewerCount(data.viewerCount);
      }
      
      if (data.match?.status !== 'live') {
        onNoMatch?.();
        return;
      }

      // Check for new events and generate commentary
      const newEvents = data.match.events || [];
      const prevLen = prevEventsRef.current.length;
      
      if (newEvents.length > prevLen) {
        const addedEvents = newEvents.slice(prevLen);
        const teamAName = data.teamA?.name || 'Team A';
        const teamBName = data.teamB?.name || 'Team B';
        
        // Show score animation for the latest event (only +1 actions, not undos)
        const latestEvent = addedEvents[addedEvents.length - 1];
        if (latestEvent && !latestEvent.undone) {
          setScoreAnimation({
            ...latestEvent,
            teamAData: data.teamA,
            teamBData: data.teamB,
          });
        }
        
        // Calculate current scores for game state
        const scores = calculateScoresFromEvents(
          newEvents,
          data.teamA?._id,
          data.teamB?._id
        );
        const teamAScore = scores.teamA[1] || 0;
        const teamBScore = scores.teamB[1] || 0;
        const gameState = getGameState(teamAScore, teamBScore);

        const newCommentary = addedEvents
          .filter(e => !e.undone)
          .map(event => {
            let text;
            if (event.actorType === 'player' && event.playerName) {
              text = generatePlayerCommentary(event.playerName, event.teamName);
            } else {
              text = generateTeamCommentary(event.teamName);
            }
            
            const stateText = generateStateCommentary(gameState, teamAName, teamBName);
            
            return {
              id: event.id,
              text,
              stateText,
              timestamp: event.timestamp,
              gameState: gameState.state,
            };
          });

        setCommentary(prev => [...newCommentary, ...prev].slice(0, 20));
        prevEventsRef.current = newEvents;
      }

      setMatch(data.match);
      setTeamA(data.teamA);
      setTeamB(data.teamB);
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId, onNoMatch]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 2500); // Poll every 2.5 seconds
    return () => clearInterval(interval);
  }, [fetchMatch]);

  useEffect(() => {
    if (commentaryRef.current) {
      commentaryRef.current.scrollTop = 0;
    }
  }, [commentary]);

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-white text-lg animate-pulse">🏸 Loading match...</div>
      </div>
    );
  }

  if (!match || !teamA || !teamB) {
    return null;
  }

  const scores = calculateScoresFromEvents(
    match.events || [],
    teamA._id,
    teamB._id
  );
  const teamAScore = scores.teamA[1] || 0;
  const teamBScore = scores.teamB[1] || 0;
  const gameState = getGameState(teamAScore, teamBScore);
  const playerCredits = scores.playerCredits || {};
  
  const teamAPlayers = teamA.players?.filter(p => !p.isSubstitute) || [];
  const teamBPlayers = teamB.players?.filter(p => !p.isSubstitute) || [];
  
  const elapsedSeconds = match.timerState?.elapsedSeconds || 0;

  const getStateBadge = () => {
    switch (gameState.state) {
      case 'deuce':
        return <Badge className="bg-yellow-500 text-black animate-pulse text-lg px-4 py-1">⚔️ DEUCE</Badge>;
      case 'matchPoint':
        return <Badge className="bg-pink-600 text-white animate-pulse text-lg px-4 py-1">🎯 MATCH POINT 29-29</Badge>;
      case 'advantage':
        return (
          <Badge className="bg-orange-500 text-white animate-pulse text-lg px-4 py-1">
            🎯 ADVANTAGE {gameState.advantageTeam === 'A' ? teamA.name : teamB.name}
          </Badge>
        );
      case 'gamePoint':
        return (
          <Badge className="bg-purple-600 text-white animate-pulse text-lg px-4 py-1">
            🏆 GAME POINT {gameState.gamePointTeam === 'A' ? teamA.name : teamB.name}
          </Badge>
        );
      case 'won':
        return (
          <Badge className="bg-green-500 text-white text-lg px-4 py-1">
            🎉 {gameState.winner === 'A' ? teamA.name : teamB.name} WINS!
          </Badge>
        );
      default:
        return null;
    }
  };

  // Multi-set support
  const isFinal = match.matchType === 'final';
  const totalSets = match.setCount || 1;
  const currentSetNum = match.currentSet || 1;
  const completedSets = (match.sets || []).filter(s => s.isComplete);
  const setsWonA = completedSets.filter(s => 
    s.winnerId === teamA._id || s.winnerId?.toString() === teamA._id?.toString()
  ).length;
  const setsWonB = completedSets.filter(s => 
    s.winnerId === teamB._id || s.winnerId?.toString() === teamB._id?.toString()
  ).length;

  return (
    <div className={`h-[100dvh] flex flex-col text-white overflow-hidden ${
      isFinal 
        ? 'bg-gradient-to-b from-amber-900 via-orange-900 to-red-900' 
        : 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900'
    }`}>
      {/* Score Animation Overlay */}
      {scoreAnimation && (
        <ScoreAnimation
          event={scoreAnimation}
          teamA={teamA}
          teamB={teamB}
          onComplete={() => setScoreAnimation(null)}
        />
      )}
      
      {/* Header */}
      <div className={`flex-shrink-0 px-3 py-2 flex items-center justify-between ${
        isFinal ? 'bg-gradient-to-r from-yellow-600/50 to-amber-600/50' : 'bg-black/40'
      }`}>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
            <Radio className="h-3 w-3" /> LIVE
          </Badge>
          <span className="text-sm text-gray-300">
            {isFinal ? '🏆 GRAND FINAL' : `Match #${match.matchNumber}`}
            {totalSets > 1 && ` • Set ${currentSetNum}/${totalSets}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Viewer Count */}
          <div className="flex items-center gap-1 text-sm bg-gray-800/80 px-2 py-1 rounded">
            <Eye className="h-3 w-3 text-green-400" />
            <span className="text-green-400 font-medium">{viewerCount}</span>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-1 text-lg font-mono bg-gray-800 px-3 py-1 rounded">
            <Timer className="h-4 w-4 text-red-400" />
            <span className="text-red-400">{formatDuration(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Sets Score for Finals */}
      {totalSets > 1 && (
        <div className={`flex-shrink-0 px-4 py-2 flex items-center justify-center gap-6 ${
          isFinal ? 'bg-gradient-to-r from-yellow-700/30 to-amber-700/30' : 'bg-gray-800/50'
        }`}>
          <div className="text-center">
            <div className="text-xs opacity-70">{teamA.name}</div>
            <div className="text-3xl font-bold">{setsWonA}</div>
          </div>
          <div className="text-sm opacity-50">SETS</div>
          <div className="text-center">
            <div className="text-xs opacity-70">{teamB.name}</div>
            <div className="text-3xl font-bold">{setsWonB}</div>
          </div>
        </div>
      )}

      {/* Game State Banner */}
      {gameState.state !== 'normal' && (
        <div className="flex-shrink-0 flex justify-center py-2 bg-black/30">
          {getStateBadge()}
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="flex-shrink-0 px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* Team A */}
          <div className={`rounded-xl p-3 text-center transition-all ${
            teamAScore > teamBScore ? 'bg-green-900/50 ring-2 ring-green-500' : 'bg-gray-800/50'
          }`}>
            {teamA.photoUrl ? (
              <img src={teamA.photoUrl} alt={teamA.name} className="w-12 h-12 rounded-full mx-auto mb-1 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-600 mx-auto mb-1 flex items-center justify-center text-xl font-bold">
                {getInitials(teamA.name)}
              </div>
            )}
            <div className="text-xs text-gray-300 truncate">{teamA.name}</div>
            {totalSets > 1 && (
              <div className="flex justify-center gap-1 my-1">
                {Array.from({ length: totalSets }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < setsWonA ? 'bg-yellow-400' : 'bg-white/20'}`} />
                ))}
              </div>
            )}
            <div className="text-5xl font-bold mt-1">{teamAScore}</div>
          </div>

          {/* VS */}
          <div className="text-gray-500 text-xl font-bold">
            <Zap className="h-6 w-6 text-yellow-500" />
          </div>

          {/* Team B */}
          <div className={`rounded-xl p-3 text-center transition-all ${
            teamBScore > teamAScore ? 'bg-green-900/50 ring-2 ring-green-500' : 'bg-gray-800/50'
          }`}>
            {teamB.photoUrl ? (
              <img src={teamB.photoUrl} alt={teamB.name} className="w-12 h-12 rounded-full mx-auto mb-1 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-600 mx-auto mb-1 flex items-center justify-center text-xl font-bold">
                {getInitials(teamB.name)}
              </div>
            )}
            <div className="text-xs text-gray-300 truncate">{teamB.name}</div>
            {totalSets > 1 && (
              <div className="flex justify-center gap-1 my-1">
                {Array.from({ length: totalSets }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < setsWonB ? 'bg-yellow-400' : 'bg-white/20'}`} />
                ))}
              </div>
            )}
            <div className="text-5xl font-bold mt-1">{teamBScore}</div>
          </div>
        </div>
      </div>

      {/* Player Cards - 2x2 Grid */}
      <div className="flex-shrink-0 px-3 pb-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Team A Players */}
          {teamAPlayers.slice(0, 2).map((player, idx) => (
            <div key={idx} className="bg-blue-900/30 rounded-lg p-2 flex items-center gap-2">
              {player.photoUrl ? (
                <img src={player.photoUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-sm font-medium">
                  {getInitials(player.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 truncate">{player.name}</div>
                <div className="text-lg font-bold text-blue-400">
                  {playerCredits[player._id] || 0} pts
                </div>
              </div>
            </div>
          ))}
          
          {/* Team B Players */}
          {teamBPlayers.slice(0, 2).map((player, idx) => (
            <div key={idx} className="bg-red-900/30 rounded-lg p-2 flex items-center gap-2">
              {player.photoUrl ? (
                <img src={player.photoUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center text-sm font-medium">
                  {getInitials(player.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 truncate">{player.name}</div>
                <div className="text-lg font-bold text-red-400">
                  {playerCredits[player._id] || 0} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commentary Feed */}
      <div className="flex-1 overflow-hidden bg-black/20 mx-3 mb-3 rounded-xl">
        <div className="px-3 py-2 bg-black/30 border-b border-gray-700 flex items-center gap-2">
          <span className="text-sm font-medium">📣 Live Commentary</span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        <div 
          ref={commentaryRef}
          className="h-full overflow-y-auto p-3 space-y-2"
          style={{ maxHeight: 'calc(100% - 40px)' }}
        >
          {commentary.length === 0 ? (
            <div className="text-gray-500 text-center text-sm py-4">
              Waiting for action... 🏸
            </div>
          ) : (
            commentary.map((item, idx) => (
              <div 
                key={item.id || idx}
                className={`text-sm p-2 rounded-lg ${
                  idx === 0 ? 'bg-yellow-900/30 animate-pulse' : 'bg-gray-800/50'
                }`}
              >
                <div>{item.text}</div>
                {item.stateText && (
                  <div className="text-xs mt-1 text-yellow-400 font-medium">
                    {item.stateText}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ViewerTournament({ params }) {
  const { id } = params;
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLiveMatch, setShowLiveMatch] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll tournament data every 10s
    return () => clearInterval(interval);
  }, [id]);

  async function loadData() {
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
        setTeams(data.teams);
        setMatches(data.matches);
        setStandings(calculateStandings(data.teams, data.matches));
        
        // Check for live match
        const live = data.matches.find(m => m.status === 'live');
        if (live) {
          setLiveMatchId(live._id);
        } else {
          setLiveMatchId(null);
          setShowLiveMatch(false);
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Tournament not found</h2>
          <Link href="/viewer">
            <Button>Back to Tournaments</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If showing live match view
  if (showLiveMatch && liveMatchId) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowLiveMatch(false)}
          className="absolute top-2 left-2 z-50 bg-black/50 text-white p-2 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <LiveMatchViewer 
          matchId={liveMatchId} 
          teams={teams}
          onNoMatch={() => setShowLiveMatch(false)}
        />
      </div>
    );
  }

  const leagueMatches = matches.filter(m => m.matchType === 'league');
  const completedMatches = leagueMatches.filter(m => m.status === 'completed');
  const liveMatch = matches.find(m => m.status === 'live');
  
  // Playoffs matches
  const isPlayoffs = tournament.format === 'playoffs';
  const qualifier1 = matches.find(m => m.matchType === 'qualifier1');
  const eliminator = matches.find(m => m.matchType === 'eliminator');
  const qualifier2 = matches.find(m => m.matchType === 'qualifier2');
  const finalMatch = matches.find(m => m.matchType === 'final');
  const playoffsGenerated = tournament.playoffsGenerated;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/viewer">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={tournament.status === 'active' ? 'success' : 'secondary'}>
                {tournament.status}
              </Badge>
              <span>{teams.length} teams</span>
              <span>-</span>
              <span>{completedMatches.length}/{leagueMatches.length} matches</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Links - Temporarily hidden
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link href={`/viewer/tournaments/${id}/analytics`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="py-3 flex items-center justify-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-sm">Analytics</span>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/viewer/tournaments/${id}/players`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="py-3 flex items-center justify-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <span className="font-medium text-sm">Leaderboard</span>
              </CardContent>
            </Card>
          </Link>
          <Link href={`/viewer/tournaments/${id}/history`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-orange-50 to-amber-50">
              <CardContent className="py-3 flex items-center justify-center gap-2">
                <History className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-sm">History</span>
              </CardContent>
            </Card>
          </Link>
        </div>
        */}

        {/* Live Match Banner */}
        {liveMatch && (
          <Card 
            className="mb-6 border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setLiveMatchId(liveMatch._id || liveMatch.id);
              setShowLiveMatch(true);
            }}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                    <Radio className="h-3 w-3" /> LIVE NOW
                  </Badge>
                  <span className="font-semibold">
                    {teams.find(t => t._id?.toString() === liveMatch.teamA?.toString())?.name} vs{' '}
                    {teams.find(t => t._id?.toString() === liveMatch.teamB?.toString())?.name}
                  </span>
                  {liveMatch.matchType !== 'league' && (
                    <Badge variant="secondary" className="text-xs">
                      {liveMatch.matchType === 'qualifier1' ? '🏅 Qualifier 1' :
                       liveMatch.matchType === 'eliminator' ? '⚔️ Eliminator' :
                       liveMatch.matchType === 'qualifier2' ? '🎯 Qualifier 2' :
                       liveMatch.matchType === 'final' ? '🏆 Final' : ''}
                    </Badge>
                  )}
                </div>
                <Button size="sm" variant="destructive">
                  Watch Live 📺
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="standings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="standings">
              <BarChart3 className="h-4 w-4 mr-2" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="h-4 w-4 mr-2" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="players">
              <Trophy className="h-4 w-4 mr-2" />
              Players
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <CardTitle>League Standings</CardTitle>
                <CardDescription>Updated after each match</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">#</th>
                        <th className="text-left py-3 px-2">Team</th>
                        <th className="text-center py-3 px-2">P</th>
                        <th className="text-center py-3 px-2">W</th>
                        <th className="text-center py-3 px-2">L</th>
                        <th className="text-center py-3 px-2">Pts</th>
                        <th className="text-center py-3 px-2">PF</th>
                        <th className="text-center py-3 px-2">PA</th>
                        <th className="text-center py-3 px-2">PD</th>
                        <th className="text-center py-3 px-2">TES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, idx) => {
                        // For playoffs: highlight top 4, for regular: highlight top 2
                        const qualifiesForPlayoffs = isPlayoffs ? idx < 4 : idx < 2;
                        const rowClass = qualifiesForPlayoffs 
                          ? (idx < 2 ? 'bg-green-100' : 'bg-green-50') 
                          : '';
                        return (
                          <tr key={s.teamId} className={`border-b ${rowClass}`}>
                            <td className="py-3 px-2 font-medium">
                              {s.rank}
                              {isPlayoffs && idx < 4 && (
                                <span className="ml-1 text-xs">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4️⃣'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 font-medium">{s.teamName}</td>
                            <td className="text-center py-3 px-2">{s.matchesPlayed}</td>
                            <td className="text-center py-3 px-2">{s.wins}</td>
                            <td className="text-center py-3 px-2">{s.losses}</td>
                            <td className="text-center py-3 px-2 font-bold">{s.leaguePoints}</td>
                            <td className="text-center py-3 px-2">{s.pointsFor}</td>
                            <td className="text-center py-3 px-2">{s.pointsAgainst}</td>
                            <td className="text-center py-3 px-2">{s.pointDifference > 0 ? '+' : ''}{s.pointDifference}</td>
                            <td className="text-center py-3 px-2">{s.efficiencyScore.toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p><strong>Ranking:</strong> League Points → TES → Head-to-Head → Point Difference → Points For</p>
                  <p className="mt-1"><strong>TES:</strong> Sum of (Points For - Points Against) / Match Duration for each match</p>
                  {isPlayoffs ? (
                    <p className="mt-1 text-purple-600 font-medium">🏆 Top 4 teams qualify for IPL-style playoffs</p>
                  ) : (
                    <p className="mt-1">Top 2 teams (highlighted) qualify for the final.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            {/* Playoffs Section for viewer */}
            {isPlayoffs && playoffsGenerated && (
              <Card className="mb-6 border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-purple-800">🏆 IPL-Style Playoffs</CardTitle>
                  </div>
                  <CardDescription>Top 4 teams battle for the championship</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Playoffs bracket visualization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Qualifier 1 */}
                      {qualifier1 && (
                        <ViewerPlayoffCard 
                          match={qualifier1} 
                          teams={teams} 
                          title="Qualifier 1"
                          subtitle="1st vs 2nd • Winner → Final"
                          color="blue"
                          onWatchLive={() => {
                            if (qualifier1.status === 'live') {
                              setLiveMatchId(qualifier1._id || qualifier1.id);
                              setShowLiveMatch(true);
                            }
                          }}
                        />
                      )}
                      
                      {/* Eliminator */}
                      {eliminator && (
                        <ViewerPlayoffCard 
                          match={eliminator} 
                          teams={teams} 
                          title="Eliminator"
                          subtitle="3rd vs 4th • Loser OUT"
                          color="red"
                          onWatchLive={() => {
                            if (eliminator.status === 'live') {
                              setLiveMatchId(eliminator._id || eliminator.id);
                              setShowLiveMatch(true);
                            }
                          }}
                        />
                      )}
                    </div>
                    
                    {/* Qualifier 2 */}
                    {qualifier2 && (
                      <ViewerPlayoffCard 
                        match={qualifier2} 
                        teams={teams} 
                        title="Qualifier 2"
                        subtitle="Q1 Loser vs Eliminator Winner"
                        color="orange"
                        isPending={qualifier2.status === 'pending'}
                        onWatchLive={() => {
                          if (qualifier2.status === 'live') {
                            setLiveMatchId(qualifier2._id || qualifier2.id);
                            setShowLiveMatch(true);
                          }
                        }}
                      />
                    )}
                    
                    {/* Final */}
                    {finalMatch && (
                      <ViewerPlayoffCard 
                        match={finalMatch} 
                        teams={teams} 
                        title="🏆 GRAND FINAL"
                        subtitle="Q1 Winner vs Q2 Winner"
                        color="gold"
                        isFinal={true}
                        isPending={finalMatch.status === 'pending'}
                        onWatchLive={() => {
                          if (finalMatch.status === 'live') {
                            setLiveMatchId(finalMatch._id || finalMatch.id);
                            setShowLiveMatch(true);
                          }
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>League Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leagueMatches.map((match, idx) => {
                    const teamAData = teams.find(t => t._id?.toString() === match.teamA?.toString());
                    const teamBData = teams.find(t => t._id?.toString() === match.teamB?.toString());
                    const isLive = match.status === 'live';
                    const isCompleted = match.status === 'completed';
                    
                    const formatMatchDuration = (seconds) => {
                      if (!seconds) return '';
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };
                    const duration = match.timerState?.elapsedSeconds || (match.durationMinutes ? match.durationMinutes * 60 : 0);
                    
                    return (
                      <div
                        key={match._id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isLive ? 'border-red-500 bg-red-50 cursor-pointer' : 
                          isCompleted ? 'bg-green-50/30' : ''
                        }`}
                        onClick={() => {
                          if (isLive) {
                            setLiveMatchId(match._id || match.id);
                            setShowLiveMatch(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground w-8">#{match.matchNumber}</span>
                          <div>
                            <div className={`font-medium ${match.winnerId?.toString() === teamAData?._id?.toString() ? 'text-green-600' : ''}`}>
                              {teamAData?.name || 'TBD'}
                            </div>
                            <div className={`font-medium ${match.winnerId?.toString() === teamBData?._id?.toString() ? 'text-green-600' : ''}`}>
                              {teamBData?.name || 'TBD'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isCompleted && match.sets && (
                            <div className="text-right">
                              <div className={`font-mono ${match.winnerId?.toString() === teamAData?._id?.toString() ? 'font-bold' : ''}`}>
                                {match.sets[0]?.teamAScore || 0}
                              </div>
                              <div className={`font-mono ${match.winnerId?.toString() === teamBData?._id?.toString() ? 'font-bold' : ''}`}>
                                {match.sets[0]?.teamBScore || 0}
                              </div>
                            </div>
                          )}
                          {isLive && match.sets && (
                            <div className="text-right">
                              <div className="font-mono text-red-600">{match.sets[0]?.teamAScore || 0}</div>
                              <div className="font-mono text-red-600">{match.sets[0]?.teamBScore || 0}</div>
                            </div>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={
                              isCompleted ? 'success' :
                              isLive ? 'destructive' :
                              'secondary'
                            } className={isLive ? 'animate-pulse' : ''}>
                              {isLive ? '🔴 LIVE' : match.status}
                            </Badge>
                            {isCompleted && duration > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {formatMatchDuration(duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle>🏆 Player Leaderboard</CardTitle>
                <CardDescription>Top performers based on credited points</CardDescription>
              </CardHeader>
              <CardContent>
                <PlayerLeaderboard teams={teams} matches={matches} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team, idx) => {
                const standingIdx = standings.findIndex(s => s.teamId?.toString() === (team._id || team.id)?.toString());
                const isTop4 = isPlayoffs && standingIdx >= 0 && standingIdx < 4;
                const rankBadge = isPlayoffs && standingIdx >= 0 && standingIdx < 4 
                  ? ['🥇', '🥈', '🥉', '4️⃣'][standingIdx] 
                  : null;
                
                return (
                  <Card key={team._id || team.id} className={isTop4 ? 'ring-2 ring-green-400 bg-green-50/50' : ''}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {rankBadge && <span className="text-sm">{rankBadge}</span>}
                        {team.photoUrl ? (
                          <img src={team.photoUrl} alt={team.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {team.name?.charAt(0)}
                          </div>
                        )}
                        {team.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Players:</p>
                        {team.players?.filter(p => !p.isSubstitute).map((player, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {player.photoUrl ? (
                              <img src={player.photoUrl} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {player.name?.charAt(0)}
                              </div>
                            )}
                            {player.name}
                          </div>
                        ))}
                        {team.players?.filter(p => p.isSubstitute).length > 0 && (
                          <>
                            <p className="text-sm font-medium mt-4 text-muted-foreground">Substitutes:</p>
                            {team.players?.filter(p => p.isSubstitute).map((player, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                  {player.name?.charAt(0)}
                                </div>
                                {player.name}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Player Leaderboard Component
function PlayerLeaderboard({ teams, matches }) {
  const playerStats = [];

  teams.forEach(team => {
    team.players?.forEach(player => {
      if (player.isSubstitute) return;

      let totalCredits = 0;
      let matchesPlayed = 0;
      let matchesWon = 0;

      matches.forEach(match => {
        if (match.status !== 'completed') return;
        
        const isTeamA = match.teamA?.toString() === team._id?.toString();
        const isTeamB = match.teamB?.toString() === team._id?.toString();
        
        if (!isTeamA && !isTeamB) return;

        const playerEvents = (match.events || []).filter(
          e => e.playerId?.toString() === player._id?.toString() && !e.undone
        );

        if (playerEvents.length > 0) {
          matchesPlayed++;
          
          const credits = playerEvents.reduce((sum, e) => 
            sum + (e.actionType === '+1' ? 1 : -1), 0
          );
          totalCredits += credits;

          const teamWon = match.winnerId?.toString() === team._id?.toString();
          if (teamWon) matchesWon++;
        }
      });

      playerStats.push({
        name: player.name,
        teamName: team.name,
        photoUrl: player.photoUrl,
        totalCredits,
        matchesPlayed,
        matchesWon,
      });
    });
  });

  playerStats.sort((a, b) => b.totalCredits - a.totalCredits);

  return (
    <div className="space-y-2">
      {playerStats.map((player, idx) => (
        <div 
          key={idx}
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            idx < 3 ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
          }`}
        >
          <span className="w-6 text-center font-bold text-gray-500">
            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
          </span>
          {player.photoUrl ? (
            <img src={player.photoUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {getInitials(player.name)}
            </div>
          )}
          <div className="flex-1">
            <div className="font-medium">{player.name}</div>
            <div className="text-xs text-gray-500">{player.teamName}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{player.totalCredits}</div>
            <div className="text-xs text-gray-500">
              {player.matchesWon}W / {player.matchesPlayed}M
            </div>
          </div>
        </div>
      ))}
      {playerStats.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No player stats yet. Complete some matches first!
        </div>
      )}
    </div>
  );
}

// Viewer Playoff Match Card Component
function ViewerPlayoffCard({ match, teams, title, subtitle, color, isFinal, isPending, onWatchLive }) {
  const teamA = teams.find(t => (t._id || t.id)?.toString() === (match.teamA?._id || match.teamA)?.toString());
  const teamB = teams.find(t => (t._id || t.id)?.toString() === (match.teamB?._id || match.teamB)?.toString());
  
  const colorClasses = {
    blue: 'border-blue-400 bg-blue-50',
    red: 'border-red-400 bg-red-50',
    orange: 'border-orange-400 bg-orange-50',
    gold: 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg',
  };
  
  const headerColors = {
    blue: 'text-blue-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
    gold: 'text-yellow-700',
  };
  
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  
  return (
    <div 
      className={`border-2 rounded-lg p-4 ${colorClasses[color] || 'border-gray-300 bg-gray-50'} ${isLive ? 'cursor-pointer' : ''}`}
      onClick={() => isLive && onWatchLive?.()}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className={`font-bold ${headerColors[color] || 'text-gray-700'}`}>{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant={
          isCompleted ? 'success' :
          isLive ? 'destructive' :
          isPending ? 'outline' :
          'secondary'
        } className={isLive ? 'animate-pulse' : ''}>
          {isPending ? 'Waiting' : isLive ? '🔴 LIVE' : match.status}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className={`font-semibold ${match.winnerId?.toString() === teamA?._id?.toString() ? 'text-green-600' : ''}`}>
              {isPending ? 'TBD' : (teamA?.name || 'TBD')}
            </div>
            {isCompleted && (
              <div className="text-xs text-muted-foreground">
                {match.sets?.map(s => s.teamAScore).join(' - ')}
              </div>
            )}
          </div>
          <span className="text-muted-foreground font-bold">vs</span>
          <div className="text-center">
            <div className={`font-semibold ${match.winnerId?.toString() === teamB?._id?.toString() ? 'text-green-600' : ''}`}>
              {isPending ? 'TBD' : (teamB?.name || 'TBD')}
            </div>
            {isCompleted && (
              <div className="text-xs text-muted-foreground">
                {match.sets?.map(s => s.teamBScore).join(' - ')}
              </div>
            )}
          </div>
        </div>
        
        {isLive && (
          <Button size="sm" variant="destructive">
            Watch Live 📺
          </Button>
        )}
        {isCompleted && (
          <div className="text-sm font-medium text-green-600">
            ✓ {teams.find(t => (t._id || t.id)?.toString() === match.winnerId?.toString())?.name} won
          </div>
        )}
      </div>
    </div>
  );
}
