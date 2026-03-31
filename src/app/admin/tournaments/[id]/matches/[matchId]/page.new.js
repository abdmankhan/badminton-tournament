"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Square, RotateCcw, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMatchStore } from "@/stores/matchStore";
import { formatDuration } from "@/lib/utils";
import { getGameState, GAME_POINT } from "@/lib/scoring/engine";
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
  const [gameState, setGameState] = useState({
    state: "normal",
    isGameOver: false,
  });

  useEffect(() => {
    loadMatchData();
    return () => {
      pauseTimer();
    };
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

  // Check game state on score change
  useEffect(() => {
    const newGameState = getGameState(teamAScore, teamBScore);
    setGameState(newGameState);

    if (newGameState.isGameOver && currentMatch?.status === "live") {
      handleAutoEndMatch(newGameState.winner);
    }
  }, [teamAScore, teamBScore]);

  const handleAutoEndMatch = useCallback(
    async (winner) => {
      pauseTimer();
      const winnerId =
        winner === "A" ? teamA?._id || teamA?.id : teamB?._id || teamB?.id;
      const winnerName = winner === "A" ? teamA?.name : teamB?.name;
      toast.success(`🏆 ${winnerName} wins!`, { duration: 3000 });
      setTimeout(() => saveMatchResult(winnerId), 1000);
    },
    [teamA, teamB, timerSeconds, currentMatch],
  );

  async function saveMatchResult(winnerId) {
    setSaving(true);
    try {
      const finalScores = getCurrentScores();
      const teamATotal = Object.values(finalScores?.teamA || {}).reduce(
        (a, b) => a + b,
        0,
      );
      const teamBTotal = Object.values(finalScores?.teamB || {}).reduce(
        (a, b) => a + b,
        0,
      );

      const matchData = {
        ...currentMatch,
        status: "completed",
        winnerId,
        endedAt: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round(timerSeconds / 60)),
        timerState: { status: "stopped", elapsedSeconds: timerSeconds },
        sets: [
          {
            setNumber: 1,
            teamAScore: teamATotal,
            teamBScore: teamBTotal,
            winnerId,
            isComplete: true,
          },
        ],
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
    const event = addScoreEvent({
      actorType,
      playerId: player?._id || player?.name,
      playerName: player?.name,
      teamId: teamData?._id || teamData?.id,
      teamName: teamData?.name,
      actionType,
    });

    if (event && actionType === "+1") {
      toast.success(player ? `+1 ${player.name}` : `+1 ${teamData?.name}`, {
        duration: 1000,
      });
    }
  }

  function handleUndo() {
    const undoneEvent = undoLast();
    if (undoneEvent) toast.info("Undone", { duration: 1000 });
  }

  async function handleStartMatch() {
    if (currentMatch?.status !== "live") {
      const matchData = {
        ...currentMatch,
        status: "live",
        startedAt: currentMatch?.startedAt || new Date().toISOString(),
      };
      loadMatch(matchData);
      if (!isOffline()) {
        await fetch(`/api/matches/${matchId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "live",
            startedAt: matchData.startedAt,
          }),
        });
      }
    }
    startTimer();
  }

  async function handleEndMatch() {
    if (teamAScore === teamBScore) {
      toast.error("Cannot end in a tie");
      return;
    }
    const winnerId =
      teamAScore > teamBScore
        ? teamA?._id || teamA?.id
        : teamB?._id || teamB?.id;
    await saveMatchResult(winnerId);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const teamAPlayers = teamA?.players?.filter((p) => !p.isSubstitute) || [];
  const teamBPlayers = teamB?.players?.filter((p) => !p.isSubstitute) || [];

  // Game state display
  const getStateDisplay = () => {
    if (gameState.state === "deuce")
      return { text: "DEUCE", color: "bg-yellow-500 text-black" };
    if (gameState.state === "advantage") {
      const teamName =
        gameState.advantageTeam === "A" ? teamA?.name : teamB?.name;
      return { text: `ADV ${teamName}`, color: "bg-orange-500 text-white" };
    }
    if (gameState.state === "gamePoint") {
      const teamName =
        gameState.gamePointTeam === "A" ? teamA?.name : teamB?.name;
      return { text: `GAME PT ${teamName}`, color: "bg-purple-500 text-white" };
    }
    if (gameState.state === "won") {
      const teamName = gameState.winner === "A" ? teamA?.name : teamB?.name;
      return { text: `${teamName} WINS!`, color: "bg-green-500 text-white" };
    }
    return null;
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100 overflow-hidden">
      {/* Header - minimal */}
      <header className="bg-white border-b px-2 py-1.5 flex items-center justify-between shrink-0">
        <Link href={`/admin/tournaments/${tournamentId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="font-semibold text-sm">
          Match #{currentMatch?.matchNumber}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleUndo}
          disabled={gameState.isGameOver}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </header>

      {/* Timer Row */}
      <div className="bg-white border-b px-3 py-2 flex items-center justify-center gap-3 shrink-0">
        {!timerRunning && !gameState.isGameOver ? (
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600"
            onClick={handleStartMatch}
          >
            <Play className="h-5 w-5" />
          </Button>
        ) : !gameState.isGameOver ? (
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-yellow-500 hover:bg-yellow-600"
            onClick={pauseTimer}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : null}

        <div className="text-3xl font-bold tabular-nums min-w-[80px] text-center">
          {formatDuration(timerSeconds)}
        </div>

        {!gameState.isGameOver &&
          currentMatch?.status === "live" &&
          teamAScore !== teamBScore && (
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleEndMatch}
              disabled={saving}
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          )}
      </div>

      {/* Game State Banner */}
      {stateDisplay && (
        <div
          className={`text-center py-1 text-sm font-bold ${stateDisplay.color} shrink-0`}
        >
          {stateDisplay.text}
        </div>
      )}

      {/* Not started warning */}
      {!canScore && !gameState.isGameOver && (
        <div className="text-center py-1 text-xs text-amber-600 bg-amber-50 shrink-0">
          Tap green play button to start
        </div>
      )}

      {/* Main Scoring Area - fills remaining space */}
      <div className="flex-1 flex flex-col p-2 gap-2 min-h-0">
        {/* Team Scores Row */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {/* Team A Score */}
          <div
            className={`bg-blue-600 rounded-lg p-2 text-white text-center ${gameState.state === "advantage" && gameState.advantageTeam === "A" ? "ring-4 ring-orange-400" : ""}`}
          >
            <div className="text-xs font-medium truncate mb-1">
              {teamA?.name || "Team A"}
            </div>
            <div className="text-4xl font-bold">{teamAScore}</div>
            <div className="flex justify-center gap-2 mt-2">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
                onClick={() => handleScore("team", "A", null, "+1")}
                disabled={!canScore || gameState.isGameOver}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full text-white/70 hover:bg-white/10"
                onClick={() => handleScore("team", "A", null, "-1")}
                disabled={!canScore || teamAScore <= 0 || gameState.isGameOver}
              >
                <Minus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Team B Score */}
          <div
            className={`bg-red-600 rounded-lg p-2 text-white text-center ${gameState.state === "advantage" && gameState.advantageTeam === "B" ? "ring-4 ring-orange-400" : ""}`}
          >
            <div className="text-xs font-medium truncate mb-1">
              {teamB?.name || "Team B"}
            </div>
            <div className="text-4xl font-bold">{teamBScore}</div>
            <div className="flex justify-center gap-2 mt-2">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
                onClick={() => handleScore("team", "B", null, "+1")}
                disabled={!canScore || gameState.isGameOver}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full text-white/70 hover:bg-white/10"
                onClick={() => handleScore("team", "B", null, "-1")}
                disabled={!canScore || teamBScore <= 0 || gameState.isGameOver}
              >
                <Minus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Player Cards - 2x2 grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
          {/* Team A Players */}
          {teamAPlayers.slice(0, 2).map((player, idx) => (
            <PlayerCard
              key={player.name}
              player={player}
              team="A"
              teamColor="blue"
              credits={scores?.playerCredits?.[player._id || player.name] || 0}
              onScore={(action) => handleScore("player", "A", player, action)}
              disabled={!canScore || gameState.isGameOver}
            />
          ))}
          {/* Team B Players */}
          {teamBPlayers.slice(0, 2).map((player, idx) => (
            <PlayerCard
              key={player.name}
              player={player}
              team="B"
              teamColor="red"
              credits={scores?.playerCredits?.[player._id || player.name] || 0}
              onScore={(action) => handleScore("player", "B", player, action)}
              disabled={!canScore || gameState.isGameOver}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, team, teamColor, credits, onScore, disabled }) {
  const bgClass =
    teamColor === "blue"
      ? "border-blue-300 bg-blue-50"
      : "border-red-300 bg-red-50";
  const textClass = teamColor === "blue" ? "text-blue-600" : "text-red-600";
  const btnClass =
    teamColor === "blue"
      ? "bg-blue-500 hover:bg-blue-600"
      : "bg-red-500 hover:bg-red-600";

  const initials =
    player.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  return (
    <div
      className={`rounded-lg border-2 ${bgClass} p-2 flex flex-col items-center justify-center`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full ${teamColor === "blue" ? "bg-blue-500" : "bg-red-500"} text-white flex items-center justify-center text-sm font-bold`}
      >
        {initials}
      </div>
      {/* Name */}
      <div className="text-xs font-medium truncate w-full text-center mt-1">
        {player.name}
      </div>
      {/* Credits */}
      <div className={`text-2xl font-bold ${textClass}`}>{credits}</div>
      {/* Buttons */}
      <div className="flex gap-2 mt-1">
        <Button
          size="icon"
          className={`h-9 w-9 rounded-full ${btnClass} text-white`}
          onClick={() => onScore("+1")}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full"
          onClick={() => onScore("-1")}
          disabled={disabled || credits <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
