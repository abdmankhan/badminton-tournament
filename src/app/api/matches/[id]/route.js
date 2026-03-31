import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Match, Team, Tournament } from "@/lib/db/models";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const teamA = await Team.findById(match.teamA);
    const teamB = await Team.findById(match.teamB);

    return NextResponse.json({ match, teamA, teamB });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const match = await Match.findByIdAndUpdate(id, data, { new: true });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (data.status === "completed" && data.winnerId) {
      await updateTeamStats(match);

      // Check if all league matches are complete and generate final if needed
      await checkAndGenerateFinal(match.tournamentId);
    }

    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateTeamStats(match) {
  const teamA = await Team.findById(match.teamA);
  const teamB = await Team.findById(match.teamB);

  if (!teamA || !teamB) return;

  const teamAScore =
    match.sets?.reduce((sum, s) => sum + (s.teamAScore || 0), 0) || 0;
  const teamBScore =
    match.sets?.reduce((sum, s) => sum + (s.teamBScore || 0), 0) || 0;
  const duration = match.durationMinutes || 1;

  teamA.stats.matchesPlayed += 1;
  teamA.stats.pointsFor += teamAScore;
  teamA.stats.pointsAgainst += teamBScore;
  teamA.stats.totalDurationMinutes += duration;

  teamB.stats.matchesPlayed += 1;
  teamB.stats.pointsFor += teamBScore;
  teamB.stats.pointsAgainst += teamAScore;
  teamB.stats.totalDurationMinutes += duration;

  if (match.winnerId?.toString() === teamA._id.toString()) {
    teamA.stats.wins += 1;
    teamA.stats.leaguePoints += 2;
    teamB.stats.losses += 1;
  } else {
    teamB.stats.wins += 1;
    teamB.stats.leaguePoints += 2;
    teamA.stats.losses += 1;
  }

  teamA.stats.pointDifference =
    teamA.stats.pointsFor - teamA.stats.pointsAgainst;
  teamB.stats.pointDifference =
    teamB.stats.pointsFor - teamB.stats.pointsAgainst;

  const teamAMatchEff = (teamAScore - teamBScore) / duration;
  const teamBMatchEff = (teamBScore - teamAScore) / duration;

  teamA.stats.efficiencyScore =
    (teamA.stats.efficiencyScore || 0) + teamAMatchEff;
  teamB.stats.efficiencyScore =
    (teamB.stats.efficiencyScore || 0) + teamBMatchEff;

  await teamA.save();
  await teamB.save();
}

/**
 * Check if all league matches are complete and generate final match
 */
async function checkAndGenerateFinal(tournamentId) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return;

  // Only for round-robin-final format
  if (tournament.format !== "round-robin-final") return;

  // Get all matches for this tournament
  const allMatches = await Match.find({ tournamentId });
  const leagueMatches = allMatches.filter((m) => m.matchType === "league");
  const existingFinal = allMatches.find((m) => m.matchType === "final");

  // Don't create if final already exists
  if (existingFinal) return;

  // Check if all league matches are completed
  const allLeagueCompleted = leagueMatches.every(
    (m) => m.status === "completed",
  );
  if (!allLeagueCompleted) return;

  // Get teams sorted by standings
  const teams = await Team.find({ tournamentId }).sort({
    "stats.leaguePoints": -1,
    "stats.efficiencyScore": -1,
    "stats.pointDifference": -1,
    "stats.pointsFor": -1,
  });

  if (teams.length < 2) return;

  // Top 2 teams qualify for final
  const finalist1 = teams[0];
  const finalist2 = teams[1];

  // Create the final match
  const finalMatch = await Match.create({
    tournamentId,
    teamA: finalist1._id,
    teamB: finalist2._id,
    matchType: "final",
    matchNumber: 0, // Special number for final
    setCount: tournament.config?.finalSetCount || 3,
    currentSet: 1,
    status: "scheduled",
    sets: Array.from(
      { length: tournament.config?.finalSetCount || 3 },
      (_, idx) => ({
        setNumber: idx + 1,
        teamAScore: 0,
        teamBScore: 0,
        isComplete: false,
      }),
    ),
    timerState: {
      status: "stopped",
      elapsedSeconds: 0,
    },
    events: [],
  });

  // Add final match to tournament
  tournament.matches.push(finalMatch._id);
  await tournament.save();

  console.log(`Final match created: ${finalist1.name} vs ${finalist2.name}`);
}
