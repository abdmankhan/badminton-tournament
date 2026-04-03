"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Square, RotateCcw, Plus, Minus, Trophy, Star, Flame, Crown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatchStore } from "@/stores/matchStore";
import { formatDuration } from "@/lib/utils";
import { getGameState } from "@/lib/scoring/engine";
import { saveMatchLocally, addToSyncQueue, isOffline } from "@/lib/offline/db";

export default function MatchScoring({ params }) {
  const { id: tournamentId, matchId } = params;
  const router = useRouter();

  const {
    currentMatch,
    loadMatch,
    addScoreEvent,
    undoLast,
    getCurrentScores,
    timerSeconds,
    timerRunning,
    startTimer,
    pauseTimer,
    clearMatch,
    setCurrentSet,
  } = useMatchStore();

  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameState, setGameState] = useState({ state: "normal", isGameOver: false });
  const [setsWon, setSetsWon] = useState({ A: 0, B: 0 });
  const [completedSets, setCompletedSets] = useState([]);
  const [showSetTransition, setShowSetTransition] = useState(false);
  
  // Sync control refs
  const syncTimeoutRef = useRef(null);
  const lastSyncedEventsRef = useRef(0);

  // Match configuration
  const matchType = currentMatch?.matchType;
  const isFinal = matchType === "final";
  const isPlayoffMatch = ['qualifier1', 'eliminator', 'qualifier2', 'final'].includes(matchType);
  const totalSets = currentMatch?.setCount || 1;
  const setsToWin = Math.ceil(totalSets / 2);
  const currentSetNum = currentMatch?.currentSet || 1;

  const getMatchTitle = () => {
    switch (matchType) {
      case 'qualifier1': return '🏅 Qualifier 1';
      case 'eliminator': return '⚔️ Eliminator';
      case 'qualifier2': return '🎯 Qualifier 2';
      case 'final': return '🏆 GRAND FINAL';
      default: return `Match #${currentMatch?.matchNumber}`;
    }
  };

  useEffect(() => {
    loadMatchData();
    return () => { 
      pauseTimer(); 
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [matchId]);

  // Calculate sets won from completed sets
  useEffect(() => {
    if (currentMatch?.sets) {
      const completed = currentMatch.sets.filter(s => s.isComplete);
      setCompletedSets(completed);
      const teamASets = completed.filter(s => 
        s.winnerId === (teamA?._id || teamA?.id) || 
        s.winnerId?.toString() === (teamA?._id || teamA?.id)?.toString()
      ).length;
      const teamBSets = completed.filter(s => 
        s.winnerId === (teamB?._id || teamB?.id) || 
        s.winnerId?.toString() === (teamB?._id || teamB?.id)?.toString()
      ).length;
      setSetsWon({ A: teamASets, B: teamBSets });
    }
  }, [currentMatch?.sets, teamA, teamB]);

  // Debounced sync to database
  const syncToDatabase = useCallback(async () => {
    const match = useMatchStore.getState().currentMatch;
    if (!match || isOffline()) return;
    
    const events = match.events || [];
    if (events.length === lastSyncedEventsRef.current) return;
    
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          events,
          sets: match.sets,
          currentSet: match.currentSet,
          timerState: { 
            status: useMatchStore.getState().timerRunning ? 'running' : 'paused',
            elapsedSeconds: useMatchStore.getState().timerSeconds
          }
        }),
      });
      lastSyncedEventsRef.current = events.length;
    } catch (error) {
      console.error("Sync error:", error);
    }
  }, [matchId]);

  const scheduleSyncToDatabase = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(syncToDatabase, 300);
  }, [syncToDatabase]);

  async function loadMatchData() {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        // Initialize sets array if not present
        if (!data.match.sets || data.match.sets.length === 0) {
          data.match.sets = [];
          for (let i = 1; i <= (data.match.setCount || 1); i++) {
            data.match.sets.push({ setNumber: i, teamAScore: 0, teamBScore: 0, winnerId: null, isComplete: false });
          }
        }
        if (!data.match.currentSet) data.match.currentSet = 1;
        loadMatch(data.match);
        setTeamA(data.teamA);
        setTeamB(data.teamB);
      }
    } catch (error) {
      toast.error("Failed to load match");
    } finally {
      setLoading(false);
    }
  }

  const scores = getCurrentScores();
  const teamAScore = scores?.teamA?.[currentSetNum] || 0;
  const teamBScore = scores?.teamB?.[currentSetNum] || 0;

  useEffect(() => {
    const newGameState = getGameState(teamAScore, teamBScore);
    setGameState(newGameState);
    
    // Check if current set is won
    if (newGameState.isGameOver && currentMatch?.status === "live" && !saving) {
      handleSetEnd(newGameState.winner);
    }
  }, [teamAScore, teamBScore]);

  // Handle end of a set
  const handleSetEnd = useCallback(async (setWinner) => {
    pauseTimer();
    const winnerId = setWinner === "A" ? (teamA?._id || teamA?.id) : (teamB?._id || teamB?.id);
    const winnerName = setWinner === "A" ? teamA?.name : teamB?.name;
    
    // Update current set as complete
    const updatedSets = [...(currentMatch.sets || [])];
    const setIdx = updatedSets.findIndex(s => s.setNumber === currentSetNum);
    if (setIdx >= 0) {
      updatedSets[setIdx] = {
        ...updatedSets[setIdx],
        teamAScore,
        teamBScore,
        winnerId,
        isComplete: true
      };
    }
    
    // Calculate new sets won
    const newSetsWonA = setsWon.A + (setWinner === "A" ? 1 : 0);
    const newSetsWonB = setsWon.B + (setWinner === "B" ? 1 : 0);
    
    // Check if match is won
    if (newSetsWonA >= setsToWin || newSetsWonB >= setsToWin) {
      // Match is over!
      toast.success(`🏆 ${winnerName} wins the ${isFinal ? 'FINAL' : 'match'}!`, { duration: 4000 });
      setTimeout(() => saveMatchResult(winnerId, updatedSets), 1500);
    } else {
      // More sets to play
      toast.success(`🎯 ${winnerName} wins Set ${currentSetNum}! (${newSetsWonA}-${newSetsWonB})`, { duration: 3000 });
      
      // Show set transition screen
      setShowSetTransition(true);
      
      // Update match with completed set and move to next
      const nextSet = currentSetNum + 1;
      const updatedMatch = {
        ...currentMatch,
        sets: updatedSets,
        currentSet: nextSet
      };
      loadMatch(updatedMatch);
      
      // Sync to database
      if (!isOffline()) {
        await fetch(`/api/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sets: updatedSets, 
            currentSet: nextSet,
            events: currentMatch.events
          }),
        });
      }
    }
  }, [teamA, teamB, teamAScore, teamBScore, currentSetNum, setsWon, setsToWin, currentMatch, isFinal]);

  async function saveMatchResult(winnerId, finalSets) {
    setSaving(true);
    try {
      const finalScores = getCurrentScores();
      
      const matchData = {
        ...currentMatch,
        status: "completed",
        winnerId,
        sets: finalSets,
        endedAt: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round(timerSeconds / 60)),
        timerState: { status: "stopped", elapsedSeconds: timerSeconds },
      };

      if (isOffline()) {
        await saveMatchLocally(matchData);
        await addToSyncQueue("match", "update", matchData);
      } else {
        await fetch(`/api/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(matchData),
        });
      }
      clearMatch();
      router.push(`/admin/tournaments/${tournamentId}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const canScore = timerRunning && currentMatch?.status === "live" && !showSetTransition;

  function handleScore(actorType, team, player = null, actionType) {
    if (!canScore || gameState.isGameOver) return;
    const teamData = team === "A" ? teamA : teamB;
    addScoreEvent({
      actorType,
      playerId: player?._id || player?.name,
      playerName: player?.name,
      teamId: teamData?._id || teamData?.id,
      teamName: teamData?.name,
      actionType,
    });
    scheduleSyncToDatabase();
  }

  function handleUndo() {
    const undoneEvent = undoLast();
    if (undoneEvent) {
      toast.info("Undone", { duration: 800 });
      scheduleSyncToDatabase();
    }
  }

  async function handleStartMatch() {
    if (showSetTransition) {
      setShowSetTransition(false);
    }
    if (currentMatch?.status !== "live") {
      const matchData = { 
        ...currentMatch, 
        status: "live", 
        startedAt: currentMatch?.startedAt || new Date().toISOString() 
      };
      loadMatch(matchData);
      if (!isOffline()) {
        await fetch(`/api/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live", startedAt: matchData.startedAt }),
        });
      }
    }
    startTimer();
  }

  async function handleEndMatch() {
    if (teamAScore === teamBScore) { 
      toast.error("Cannot end set in a tie"); 
      return; 
    }
    const setWinner = teamAScore > teamBScore ? "A" : "B";
    handleSetEnd(setWinner);
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-lg">Loading...</div>;

  const teamAPlayers = teamA?.players?.filter((p) => !p.isSubstitute) || [];
  const teamBPlayers = teamB?.players?.filter((p) => !p.isSubstitute) || [];

  const getStateDisplay = () => {
    if (gameState.state === "deuce") return { text: "DEUCE", bg: "bg-yellow-500", color: "text-black" };
    if (gameState.state === "matchPoint") return { text: "MATCH POINT", bg: "bg-pink-600", color: "text-white" };
    if (gameState.state === "advantage") {
      return { text: `ADV ${gameState.advantageTeam === "A" ? teamA?.name : teamB?.name}`, bg: "bg-orange-500", color: "text-white" };
    }
    if (gameState.state === "gamePoint") {
      const isChampionshipPoint = isFinal && (
        (gameState.gamePointTeam === "A" && setsWon.A === setsToWin - 1) ||
        (gameState.gamePointTeam === "B" && setsWon.B === setsToWin - 1)
      );
      return { 
        text: isChampionshipPoint ? "🏆 CHAMPIONSHIP POINT" : "GAME PT", 
        bg: isChampionshipPoint ? "bg-gradient-to-r from-yellow-500 to-amber-500" : "bg-purple-500", 
        color: "text-white" 
      };
    }
    if (gameState.state === "won") {
      return { text: `SET ${currentSetNum} WON!`, bg: "bg-green-600", color: "text-white" };
    }
    return null;
  };

  const stateDisplay = getStateDisplay();

  // Set transition screen for multi-set matches
  if (showSetTransition && totalSets > 1) {
    return (
      <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 items-center justify-center p-4 text-white">
        <div className="text-center space-y-6 animate-pulse">
          <div className="text-6xl mb-4">🏸</div>
          <h1 className="text-3xl font-bold">Set {currentSetNum - 1} Complete!</h1>
          
          <div className="flex items-center justify-center gap-8 my-8">
            <div className="text-center">
              <div className="text-lg opacity-80">{teamA?.name}</div>
              <div className="text-5xl font-bold">{setsWon.A}</div>
            </div>
            <div className="text-2xl opacity-50">-</div>
            <div className="text-center">
              <div className="text-lg opacity-80">{teamB?.name}</div>
              <div className="text-5xl font-bold">{setsWon.B}</div>
            </div>
          </div>
          
          <div className="text-lg opacity-80">
            {setsToWin - Math.max(setsWon.A, setsWon.B) === 1 
              ? "🔥 Next set decides the champion!" 
              : `First to ${setsToWin} sets wins`}
          </div>
          
          <Button 
            size="lg" 
            className="mt-8 bg-white text-purple-900 hover:bg-gray-100 h-14 px-8 text-lg"
            onClick={handleStartMatch}
          >
            <Play className="h-5 w-5 mr-2" />
            Start Set {currentSetNum}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden select-none ${
      isPlayoffMatch ? 'bg-gradient-to-b from-amber-50 to-orange-50' : 'bg-gray-100'
    }`}>
      {/* Header */}
      <header className={`border-b px-2 py-1 flex items-center justify-between shrink-0 ${
        isPlayoffMatch ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-white'
      }`}>
        <Link href={`/admin/tournaments/${tournamentId}`}>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${isPlayoffMatch ? 'text-white hover:bg-white/20' : ''}`}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isFinal && <Crown className="h-4 w-4" />}
          <span className="font-semibold text-sm">
            {getMatchTitle()}
          </span>
          {totalSets > 1 && (
            <Badge variant={isPlayoffMatch ? "secondary" : "outline"} className="text-xs">
              Set {currentSetNum}/{totalSets}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${isPlayoffMatch ? 'text-white hover:bg-white/20' : ''}`} onClick={handleUndo} disabled={gameState.isGameOver}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </header>

      {/* Sets Score for multi-set matches */}
      {totalSets > 1 && (
        <div className={`px-4 py-2 flex items-center justify-center gap-4 shrink-0 ${
          isPlayoffMatch ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' : 'bg-gray-800 text-white'
        }`}>
          <div className="text-center">
            <div className="text-xs opacity-80">{teamA?.name}</div>
            <div className="text-2xl font-bold">{setsWon.A}</div>
          </div>
          <div className="text-xs opacity-60 px-2">SETS</div>
          <div className="text-center">
            <div className="text-xs opacity-80">{teamB?.name}</div>
            <div className="text-2xl font-bold">{setsWon.B}</div>
          </div>
        </div>
      )}

      {/* Timer Row */}
      <div className="bg-white border-b px-3 py-2 flex items-center justify-center gap-3 shrink-0">
        {!timerRunning && !gameState.isGameOver ? (
          <Button size="icon" className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600" onClick={handleStartMatch}>
            <Play className="h-5 w-5 ml-0.5" />
          </Button>
        ) : !gameState.isGameOver ? (
          <Button size="icon" className="h-12 w-12 rounded-full bg-amber-500 hover:bg-amber-600" onClick={pauseTimer}>
            <Square className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="text-4xl font-bold tabular-nums">{formatDuration(timerSeconds)}</div>
        {!gameState.isGameOver && currentMatch?.status === "live" && teamAScore !== teamBScore && (
          <Button size="icon" className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600" onClick={handleEndMatch} disabled={saving}>
            <Square className="h-4 w-4 fill-current" />
          </Button>
        )}
      </div>

      {/* Game State */}
      {stateDisplay && (
        <div className={`text-center py-1.5 text-sm font-bold ${stateDisplay.bg} ${stateDisplay.color} shrink-0`}>
          {stateDisplay.text}
        </div>
      )}
      {!canScore && !gameState.isGameOver && !showSetTransition && (
        <div className="text-center py-0.5 text-[10px] text-amber-700 bg-amber-100 shrink-0">Press ▶ to start</div>
      )}

      {/* Scoring Area */}
      <div className="flex-1 flex flex-col p-2 gap-2 min-h-0 overflow-hidden">
        {/* Team Scores */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <TeamScoreCard
            team={teamA}
            score={teamAScore}
            color="blue"
            isFinal={isFinal}
            setsWon={setsWon.A}
            totalSets={totalSets}
            hasAdvantage={gameState.state === "advantage" && gameState.advantageTeam === "A"}
            onPlus={() => handleScore("team", "A", null, "+1")}
            onMinus={() => handleScore("team", "A", null, "-1")}
            disabled={!canScore || gameState.isGameOver}
          />
          <TeamScoreCard
            team={teamB}
            score={teamBScore}
            color="red"
            isFinal={isFinal}
            setsWon={setsWon.B}
            totalSets={totalSets}
            hasAdvantage={gameState.state === "advantage" && gameState.advantageTeam === "B"}
            onPlus={() => handleScore("team", "B", null, "+1")}
            onMinus={() => handleScore("team", "B", null, "-1")}
            disabled={!canScore || gameState.isGameOver}
          />
        </div>

        {/* Player Cards */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 min-h-0">
          {teamAPlayers.slice(0, 2).map((p) => (
            <PlayerCard key={p.name} player={p} color="blue" credits={scores?.playerCredits?.[p._id || p.name] || 0}
              onPlus={() => handleScore("player", "A", p, "+1")}
              onMinus={() => handleScore("player", "A", p, "-1")}
              disabled={!canScore || gameState.isGameOver} />
          ))}
          {teamBPlayers.slice(0, 2).map((p) => (
            <PlayerCard key={p.name} player={p} color="red" credits={scores?.playerCredits?.[p._id || p.name] || 0}
              onPlus={() => handleScore("player", "B", p, "+1")}
              onMinus={() => handleScore("player", "B", p, "-1")}
              disabled={!canScore || gameState.isGameOver} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamScoreCard({ team, score, color, isFinal, setsWon, totalSets, hasAdvantage, onPlus, onMinus, disabled }) {
  const bg = color === "blue" 
    ? (isFinal ? "bg-gradient-to-br from-blue-600 to-indigo-700" : "bg-blue-600") 
    : (isFinal ? "bg-gradient-to-br from-red-600 to-rose-700" : "bg-red-600");
  const initials = team?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  
  return (
    <div className={`${bg} rounded-2xl p-3 text-white text-center ${hasAdvantage ? "ring-4 ring-orange-400" : ""} ${isFinal ? "shadow-xl" : ""}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {team?.photoUrl ? (
          <img src={team.photoUrl} alt={team.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
            {initials}
          </div>
        )}
      </div>
      <span className="text-sm font-medium truncate block">{team?.name}</span>
      {totalSets > 1 && (
        <div className="flex justify-center gap-1 my-1">
          {Array.from({ length: totalSets }).map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full ${i < setsWon ? 'bg-yellow-400' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
      <div className="text-5xl font-bold leading-none my-2">{score}</div>
      <div className="flex justify-center gap-3">
        <Button size="icon" className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30" onClick={onPlus} disabled={disabled}>
          <Plus className="h-6 w-6" />
        </Button>
        <Button size="icon" variant="ghost" className="h-12 w-12 rounded-full text-white/60 hover:bg-white/10" onClick={onMinus} disabled={disabled || score <= 0}>
          <Minus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

function PlayerCard({ player, color, credits, onPlus, onMinus, disabled }) {
  const border = color === "blue" ? "border-blue-300" : "border-red-300";
  const bg = color === "blue" ? "bg-blue-50" : "bg-red-50";
  const text = color === "blue" ? "text-blue-600" : "text-red-600";
  const btn = color === "blue" ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600";
  const avatarBg = color === "blue" ? "bg-blue-500" : "bg-red-500";
  const initials = player.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} p-2 flex flex-col items-center justify-center`}>
      {player.photoUrl ? (
        <img src={player.photoUrl} alt={player.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg" />
      ) : (
        <div className={`w-14 h-14 rounded-full ${avatarBg} text-white flex items-center justify-center text-lg font-bold`}>
          {initials}
        </div>
      )}
      <div className="text-sm font-medium truncate w-full text-center mt-1">{player.name}</div>
      <div className={`text-3xl font-bold ${text} leading-none mt-1`}>{credits}</div>
      <div className="flex gap-2 mt-2">
        <Button size="icon" className={`h-10 w-10 rounded-full ${btn} text-white`} onClick={onPlus} disabled={disabled}>
          <Plus className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={onMinus} disabled={disabled || credits <= 0}>
          <Minus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
