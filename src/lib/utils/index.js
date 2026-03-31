import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateMatchEfficiency(
  pointsFor,
  pointsAgainst,
  durationMinutes,
) {
  if (durationMinutes <= 0) return 0;
  return (pointsFor - pointsAgainst) / durationMinutes;
}

// Commentary Generation for Live Match Viewer
const POINT_PHRASES = [
  "🔥 {player} with a powerful smash!",
  "💪 {player} strikes! Point to {team}!",
  "⚡ Lightning quick from {player}!",
  "🎯 Perfect placement by {player}!",
  "🚀 {player} unleashes a rocket!",
  "✨ {player} shows pure class!",
  "🏸 Beautiful shot from {player}!",
  "💥 BOOM! {player} scores!",
  "👏 {player} earns the point!",
  "🌟 Brilliant move by {player}!",
];

const TEAM_POINT_PHRASES = [
  "📍 Point to {team}!",
  "✅ {team} takes the point!",
  "👍 {team} scores!",
  "🔹 Another one for {team}!",
];

const DEUCE_PHRASES = [
  "😱 DEUCE! The tension is unreal!",
  "🔥 It's DEUCE! Who will break through?",
  "⚔️ DEUCE! The battle intensifies!",
];

const ADVANTAGE_PHRASES = [
  "🎯 ADVANTAGE {team}! One point away!",
  "⚡ {team} has the ADVANTAGE!",
  "🌟 ADVANTAGE {team}!",
];

const GAME_POINT_PHRASES = [
  "🏆 GAME POINT for {team}!",
  "🔥 {team} at GAME POINT!",
];

const GAME_WON_PHRASES = [
  "🏆🎉 {team} WINS! What a match!",
  "🎊 {team} TAKES THE VICTORY!",
  "👑 {team} ARE THE CHAMPIONS!",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generatePlayerCommentary(playerName, teamName) {
  return randomFrom(POINT_PHRASES)
    .replace("{player}", playerName)
    .replace("{team}", teamName);
}

export function generateTeamCommentary(teamName) {
  return randomFrom(TEAM_POINT_PHRASES).replace("{team}", teamName);
}

export function generateStateCommentary(gameState, teamAName, teamBName) {
  switch (gameState.state) {
    case "deuce":
      return randomFrom(DEUCE_PHRASES);
    case "advantage":
      const advTeam = gameState.advantageTeam === "A" ? teamAName : teamBName;
      return randomFrom(ADVANTAGE_PHRASES).replace("{team}", advTeam);
    case "gamePoint":
      const gpTeam = gameState.gamePointTeam === "A" ? teamAName : teamBName;
      return randomFrom(GAME_POINT_PHRASES).replace("{team}", gpTeam);
    case "won":
      const winner = gameState.winner === "A" ? teamAName : teamBName;
      return randomFrom(GAME_WON_PHRASES).replace("{team}", winner);
    default:
      return null;
  }
}
