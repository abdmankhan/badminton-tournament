"use client";

import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    loadMatchData();
    return () => { pauseTimer(); };
  }, [matchId]);

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
  }

  function handleUndo() {
    const undoneEvent = undoLast();
    if (undoneEvent) toast.info("Undone", { duration: 800 });
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
      <div className="bg-white border-b px-2 py-1.5 flex items-center justify-center gap-2 shrink-0">
        {!timerRunning && !gameState.isGameOver ? (
          <Button size="icon" className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-600" onClick={handleStartMatch}>
            <Play className="h-4 w-4 ml-0.5" />
          </Button>
        ) : !gameState.isGameOver ? (
          <Button size="icon" className="h-9 w-9 rounded-full bg-amber-500 hover:bg-amber-600" onClick={pauseTimer}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <div className="text-2xl font-bold tabular-nums">{formatDuration(timerSeconds)}</div>
        {!gameState.isGameOver && currentMatch?.status === "live" && teamAScore !== teamBScore && (
          <Button size="icon" className="h-9 w-9 rounded-full bg-red-500 hover:bg-red-600" onClick={handleEndMatch} disabled={saving}>
            <Square className="h-3.5 w-3.5 fill-current" />
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
      <div className="flex-1 flex flex-col p-1.5 gap-1.5 min-h-0 overflow-hidden">
        {/* Team Scores */}
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
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
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1.5 min-h-0">
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
  return (
    <div className={`${bg} rounded-lg p-1.5 text-white text-center ${hasAdvantage ? "ring-2 ring-orange-400" : ""}`}>
      <div className="text-[10px] font-medium truncate">{team?.name}</div>
      <div className="text-3xl font-bold leading-none my-1">{score}</div>
      <div className="flex justify-center gap-1.5">
        <Button size="icon" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30" onClick={onPlus} disabled={disabled}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10" onClick={onMinus} disabled={disabled || score <= 0}>
          <Minus className="h-4 w-4" />
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
  const initials = player.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className={`rounded-lg border ${border} ${bg} p-1 flex flex-col items-center justify-center`}>
      <div className={`w-8 h-8 rounded-full ${color === "blue" ? "bg-blue-500" : "bg-red-500"} text-white flex items-center justify-center text-xs font-bold`}>
        {initials}
      </div>
      <div className="text-[10px] font-medium truncate w-full text-center">{player.name}</div>
      <div className={`text-xl font-bold ${text} leading-none`}>{credits}</div>
      <div className="flex gap-1 mt-0.5">
        <Button size="icon" className={`h-7 w-7 rounded-full ${btn} text-white`} onClick={onPlus} disabled={disabled}>
          <Plus className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={onMinus} disabled={disabled || credits <= 0}>
          <Minus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
