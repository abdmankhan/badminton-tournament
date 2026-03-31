"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Square, RotateCcw, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  } = useMatchStore();

  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameState, setGameState] = useState({ state: "normal", isGameOver: false });
  
  // Sync control refs
  const syncTimeoutRef = useRef(null);
  const lastSyncedEventsRef = useRef(0);

  useEffect(() => {
    loadMatchData();
    return () => { 
      pauseTimer(); 
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [matchId]);

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
  const teamAScore = scores?.teamA?.[currentMatch?.currentSet || 1] || 0;
  const teamBScore = scores?.teamB?.[currentMatch?.currentSet || 1] || 0;

  useEffect(() => {
    const newGameState = getGameState(teamAScore, teamBScore);
    setGameState(newGameState);
    if (newGameState.isGameOver && currentMatch?.status === "live") {
      handleAutoEndMatch(newGameState.winner);
    }
  }, [teamAScore, teamBScore]);

  const handleAutoEndMatch = useCallback(async (winner) => {
    pauseTimer();
    const winnerId = winner === "A" ? (teamA?._id || teamA?.id) : (teamB?._id || teamB?.id);
    const winnerName = winner === "A" ? teamA?.name : teamB?.name;
    toast.success(`🏆 ${winnerName} wins!`, { duration: 3000 });
    setTimeout(() => saveMatchResult(winnerId), 1000);
  }, [teamA, teamB, timerSeconds, currentMatch]);

  async function saveMatchResult(winnerId) {
    setSaving(true);
    try {
      const finalScores = getCurrentScores();
      const teamATotal = Object.values(finalScores?.teamA || {}).reduce((a, b) => a + b, 0);
      const teamBTotal = Object.values(finalScores?.teamB || {}).reduce((a, b) => a + b, 0);

      const matchData = {
        ...currentMatch,
        status: "completed",
        winnerId,
        endedAt: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round(timerSeconds / 60)),
        timerState: { status: "stopped", elapsedSeconds: timerSeconds },
        sets: [{ setNumber: 1, teamAScore: teamATotal, teamBScore: teamBTotal, winnerId, isComplete: true }],
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

  const canScore = timerRunning && currentMatch?.status === "live";

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
    if (currentMatch?.status !== "live") {
      const matchData = { ...currentMatch, status: "live", startedAt: currentMatch?.startedAt || new Date().toISOString() };
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
    if (teamAScore === teamBScore) { toast.error("Cannot end in a tie"); return; }
    const winnerId = teamAScore > teamBScore ? (teamA?._id || teamA?.id) : (teamB?._id || teamB?.id);
    await saveMatchResult(winnerId);
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
      return { text: `GAME PT`, bg: "bg-purple-500", color: "text-white" };
    }
    if (gameState.state === "won") {
      return { text: `${gameState.winner === "A" ? teamA?.name : teamB?.name} WINS!`, bg: "bg-green-600", color: "text-white" };
    }
    return null;
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100 overflow-hidden select-none">
      {/* Header */}
      <header className="bg-white border-b px-2 py-1 flex items-center justify-between shrink-0">
        <Link href={`/admin/tournaments/${tournamentId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <span className="font-semibold text-sm">Match #{currentMatch?.matchNumber}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={gameState.isGameOver}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </header>

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
        <div className={`text-center py-1 text-xs font-bold ${stateDisplay.bg} ${stateDisplay.color} shrink-0`}>
          {stateDisplay.text}
        </div>
      )}
      {!canScore && !gameState.isGameOver && (
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
            hasAdvantage={gameState.state === "advantage" && gameState.advantageTeam === "A"}
            onPlus={() => handleScore("team", "A", null, "+1")}
            onMinus={() => handleScore("team", "A", null, "-1")}
            disabled={!canScore || gameState.isGameOver}
          />
          <TeamScoreCard
            team={teamB}
            score={teamBScore}
            color="red"
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

function TeamScoreCard({ team, score, color, hasAdvantage, onPlus, onMinus, disabled }) {
  const bg = color === "blue" ? "bg-blue-600" : "bg-red-600";
  const initials = team?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  
  return (
    <div className={`${bg} rounded-2xl p-3 text-white text-center ${hasAdvantage ? "ring-4 ring-orange-400" : ""}`}>
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
