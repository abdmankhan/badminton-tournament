import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Match, Team, Tournament } from "@/lib/db/models";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// In-memory viewer tracking (simple approach - works for single instance)
// Key: matchId, Value: Map of viewerId -> lastSeenTimestamp
const activeViewers = new Map();
const VIEWER_TIMEOUT = 12000; // 12 seconds timeout

function cleanupAndCountViewers(matchId) {
  const viewers = activeViewers.get(matchId);
  if (!viewers) return 0;
  
  const now = Date.now();
  for (const [viewerId, lastSeen] of viewers.entries()) {
    if (now - lastSeen > VIEWER_TIMEOUT) {
      viewers.delete(viewerId);
    }
  }
  return viewers.size;
}

function registerViewer(matchId, viewerId) {
  if (!viewerId) return;
  if (!activeViewers.has(matchId)) {
    activeViewers.set(matchId, new Map());
  }
  activeViewers.get(matchId).set(viewerId, Date.now());
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    // Check for viewer heartbeat
    const url = new URL(request.url);
    const viewerId = url.searchParams.get('viewerId');
    if (viewerId) {
      registerViewer(id, viewerId);
    }
    const viewerCount = cleanupAndCountViewers(id);

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404, headers: noCacheHeaders });
    }

    const teamA = await Team.findById(match.teamA);
    const teamB = await Team.findById(match.teamB);

    return NextResponse.json({ match, teamA, teamB, viewerCount }, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noCacheHeaders });
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
      // Only update team stats for league matches
      if (match.matchType === 'league') {
        await updateTeamStats(match);
      }

      // Check tournament format and handle accordingly
      const tournament = await Tournament.findById(match.tournamentId);
      
      if (tournament.format === 'playoffs') {
        await handlePlayoffProgression(match, tournament);
      } else if (tournament.format === 'round-robin-final') {
        await checkAndGenerateFinal(match.tournamentId);
      }
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

/**
 * Handle IPL-Style Playoff Progression
 * 
 * When a playoff match completes:
 * - Qualifier 1 complete: Winner → Final (teamA), Loser → Qualifier 2 (teamA)
 * - Eliminator complete: Winner → Qualifier 2 (teamB), Loser → OUT
 * - Qualifier 2 complete: Winner → Final (teamB), Loser → OUT
 */
async function handlePlayoffProgression(completedMatch, tournament) {
  const { matchType, winnerId, teamA, teamB } = completedMatch;
  const tournamentId = tournament._id;
  
  // Determine loser
  const loserId = winnerId.toString() === teamA.toString() ? teamB : teamA;
  
  // Get all playoff matches
  const allMatches = await Match.find({ tournamentId });
  const qualifier1 = allMatches.find(m => m.matchType === 'qualifier1');
  const eliminator = allMatches.find(m => m.matchType === 'eliminator');
  const qualifier2 = allMatches.find(m => m.matchType === 'qualifier2');
  const finalMatch = allMatches.find(m => m.matchType === 'final');
  
  if (matchType === 'qualifier1') {
    // Q1 Winner goes to Final (teamA position)
    // Q1 Loser goes to Qualifier 2 (teamA position)
    if (finalMatch) {
      await Match.findByIdAndUpdate(finalMatch._id, { teamA: winnerId });
    }
    if (qualifier2) {
      await Match.findByIdAndUpdate(qualifier2._id, { teamA: loserId });
      
      // Check if Eliminator is also complete - if so, Q2 can start
      if (eliminator?.status === 'completed') {
        await Match.findByIdAndUpdate(qualifier2._id, { status: 'scheduled' });
      }
    }
    console.log(`Qualifier 1 complete: ${winnerId} → Final, ${loserId} → Qualifier 2`);
  }
  
  else if (matchType === 'eliminator') {
    // Eliminator Winner goes to Qualifier 2 (teamB position)
    // Eliminator Loser is OUT
    if (qualifier2) {
      await Match.findByIdAndUpdate(qualifier2._id, { teamB: winnerId });
      
      // Check if Q1 is also complete - if so, Q2 can start
      if (qualifier1?.status === 'completed') {
        await Match.findByIdAndUpdate(qualifier2._id, { status: 'scheduled' });
      }
    }
    console.log(`Eliminator complete: ${winnerId} → Qualifier 2, ${loserId} → ELIMINATED`);
  }
  
  else if (matchType === 'qualifier2') {
    // Q2 Winner goes to Final (teamB position)
    // Q2 Loser is OUT
    if (finalMatch) {
      await Match.findByIdAndUpdate(finalMatch._id, { 
        teamB: winnerId,
        status: 'scheduled' // Final can now start
      });
    }
    console.log(`Qualifier 2 complete: ${winnerId} → Final, ${loserId} → ELIMINATED`);
  }
  
  else if (matchType === 'final') {
    // Tournament complete!
    tournament.status = 'completed';
    await tournament.save();
    console.log(`🏆 Tournament complete! Champion: ${winnerId}`);
  }
}
