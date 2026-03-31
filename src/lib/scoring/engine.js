import { generateId } from "@/lib/utils";

/**
 * Badminton scoring rules:
 * - Game is played to 21 points
 * - Must win by 2 points (deuce at 20-20)
 * - No maximum - deuce continues indefinitely until 2-point lead
 */
export const GAME_POINT = 21;
export const DEUCE_POINT = 20;

/**
 * Creates a score event
 */
export function createScoreEvent({
  actorType, // 'player' or 'team'
  playerId = null,
  playerName = null,
  teamId,
  teamName,
  actionType, // '+1' or '-1'
  setNumber = 1,
}) {
  return {
    id: generateId(),
    actorType,
    playerId,
    playerName,
    teamId,
    teamName,
    actionType,
    setNumber,
    timestamp: new Date().toISOString(),
    undone: false,
  };
}

/**
 * Determines the game state (normal, game point, deuce, advantage, won)
 */
export function getGameState(teamAScore, teamBScore) {
  const maxScore = Math.max(teamAScore, teamBScore);
  const minScore = Math.min(teamAScore, teamBScore);
  const diff = maxScore - minScore;

  // Win: reached at least 21 AND has 2+ point lead
  if (maxScore >= GAME_POINT && diff >= 2) {
    return {
      state: "won",
      winner: teamAScore > teamBScore ? "A" : "B",
      isGameOver: true,
    };
  }

  // Both at 20+ (deuce territory)
  if (teamAScore >= DEUCE_POINT && teamBScore >= DEUCE_POINT) {
    // Tied = deuce
    if (diff === 0) {
      return {
        state: "deuce",
        isGameOver: false,
      };
    }
    // Lead by 1 = advantage
    if (diff === 1) {
      return {
        state: "advantage",
        advantageTeam: teamAScore > teamBScore ? "A" : "B",
        isGameOver: false,
      };
    }
  }

  // Game point (someone at 20, other below 20)
  if (maxScore === DEUCE_POINT && minScore < DEUCE_POINT) {
    return {
      state: "gamePoint",
      gamePointTeam: teamAScore === DEUCE_POINT ? "A" : "B",
      isGameOver: false,
    };
  }

  // Normal play
  return {
    state: "normal",
    isGameOver: false,
  };
}

/**
 * Calculates current scores from events
 */
export function calculateScoresFromEvents(events, teamAId, teamBId) {
  const activeEvents = events.filter((e) => !e.undone);

  const scores = {
    teamA: {},
    teamB: {},
    playerCredits: {},
  };

  for (const event of activeEvents) {
    const isTeamA =
      event.teamId === teamAId ||
      event.teamId?.toString() === teamAId?.toString();
    const teamKey = isTeamA ? "teamA" : "teamB";
    const setNum = event.setNumber || 1;

    if (!scores[teamKey][setNum]) {
      scores[teamKey][setNum] = 0;
    }

    const delta = event.actionType === "+1" ? 1 : -1;
    scores[teamKey][setNum] = Math.max(0, scores[teamKey][setNum] + delta);

    if (event.actorType === "player" && event.playerId) {
      if (!scores.playerCredits[event.playerId]) {
        scores.playerCredits[event.playerId] = 0;
      }
      scores.playerCredits[event.playerId] = Math.max(
        0,
        scores.playerCredits[event.playerId] + delta,
      );
    }
  }

  return scores;
}

/**
 * Gets total score for a team across all sets
 */
export function getTotalScore(setScores) {
  return Object.values(setScores).reduce((sum, score) => sum + score, 0);
}

/**
 * Undo the last scoring action
 */
export function undoLastEvent(events) {
  const activeEvents = events.filter((e) => !e.undone);
  if (activeEvents.length === 0) {
    return { events, undoneEvent: null };
  }

  const lastEvent = activeEvents[activeEvents.length - 1];
  const updatedEvents = events.map((e) =>
    e.id === lastEvent.id ? { ...e, undone: true } : e,
  );

  return { events: updatedEvents, undoneEvent: lastEvent };
}

/**
 * Determines the winner of a match based on sets won
 */
export function determineMatchWinner(sets, setCount, teamAId, teamBId) {
  const setsToWin = Math.ceil(setCount / 2);

  let teamASetsWon = 0;
  let teamBSetsWon = 0;

  for (const set of sets) {
    if (set.isComplete && set.winnerId) {
      if (
        set.winnerId === teamAId ||
        set.winnerId?.toString() === teamAId?.toString()
      ) {
        teamASetsWon++;
      } else {
        teamBSetsWon++;
      }
    }
  }

  if (teamASetsWon >= setsToWin) {
    return teamAId;
  }
  if (teamBSetsWon >= setsToWin) {
    return teamBId;
  }

  return null; // Match not decided yet
}
