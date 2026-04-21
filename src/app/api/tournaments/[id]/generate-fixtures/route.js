import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Tournament, Team, Match } from "@/lib/db/models";
import { generateRoundRobinFixtures } from "@/lib/scoring/fixtures";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { setCount = 1, action = 'generate-fixtures' } = body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 },
      );
    }

    // Handle playoff generation
    if (action === 'generate-playoffs') {
      return await generatePlayoffs(tournament, id);
    }

    // Standard fixture generation
    const teams = await Team.find({ tournamentId: id });
    if (teams.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 teams" },
        { status: 400 },
      );
    }

    const teamIds = teams.map((t) => t._id);
    const fixtures = generateRoundRobinFixtures(teamIds);

    const matchIds = [];
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];
      const match = await Match.create({
        tournamentId: id,
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        matchType: "league",
        matchNumber: fixture.matchNumber,
        round: fixture.round,
        setCount,
        currentSet: 1,
        status: "scheduled",
        sets: Array.from({ length: setCount }, (_, idx) => ({
          setNumber: idx + 1,
          teamAScore: 0,
          teamBScore: 0,
          isComplete: false,
        })),
        timerState: {
          status: "stopped",
          elapsedSeconds: 0,
        },
        events: [],
      });
      matchIds.push(match._id);
    }

    tournament.matches = matchIds;
    tournament.status = "active";
    await tournament.save();

    return NextResponse.json({ success: true, matchCount: matchIds.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * IPL-Style Playoffs Structure:
 * 
 * Qualifier 1: Rank 1 vs Rank 2
 *   - Winner → Final
 *   - Loser → Qualifier 2
 * 
 * Eliminator: Rank 3 vs Rank 4
 *   - Winner → Qualifier 2
 *   - Loser → OUT
 * 
 * Qualifier 2: Q1 Loser vs Eliminator Winner
 *   - Winner → Final
 *   - Loser → OUT
 * 
 * Final: Q1 Winner vs Q2 Winner
 */
async function generatePlayoffs(tournament, tournamentId) {
  // Only for playoffs format
  if (tournament.format !== "playoffs") {
    return NextResponse.json(
      { error: "Tournament format is not 'playoffs'. Change format to 'playoffs' first." },
      { status: 400 }
    );
  }

  // Check if playoffs already generated
  if (tournament.playoffsGenerated) {
    return NextResponse.json(
      { error: "Playoffs already generated" },
      { status: 400 }
    );
  }

  // Get all matches
  const allMatches = await Match.find({ tournamentId });
  const leagueMatches = allMatches.filter(m => m.matchType === "league");

  // Check all league matches are complete
  const allLeagueCompleted = leagueMatches.every(m => m.status === "completed");
  if (!allLeagueCompleted) {
    return NextResponse.json(
      { error: "All league matches must be completed first" },
      { status: 400 }
    );
  }

  // Remove any existing final/playoff matches that are scheduled (not played yet)
  const existingPlayoffMatches = allMatches.filter(m => 
    ['final', 'qualifier1', 'eliminator', 'qualifier2', 'semifinal'].includes(m.matchType) &&
    (m.status === 'scheduled' || m.status === 'pending')
  );
  
  for (const match of existingPlayoffMatches) {
    await Match.findByIdAndDelete(match._id);
    tournament.matches = tournament.matches.filter(
      mId => mId.toString() !== match._id.toString()
    );
  }

  // Get teams sorted by standings
  const teams = await Team.find({ tournamentId }).sort({
    "stats.leaguePoints": -1,
    "stats.efficiencyScore": -1,
    "stats.pointDifference": -1,
    "stats.pointsFor": -1,
  });

  if (teams.length < 4) {
    return NextResponse.json(
      { error: "Need at least 4 teams for playoffs" },
      { status: 400 }
    );
  }

  const rank1 = teams[0];
  const rank2 = teams[1];
  const rank3 = teams[2];
  const rank4 = teams[3];

  // Only the final match is best-of-3; all other playoff matches are single set
  const finalSetCount = tournament.finalSetCount || 3;
  const playoffSetCount = 1;
  const createSetArray = (count) => Array.from({ length: count }, (_, idx) => ({
    setNumber: idx + 1,
    teamAScore: 0,
    teamBScore: 0,
    isComplete: false,
  }));

  // Create Qualifier 1: Rank 1 vs Rank 2 (single set)
  const qualifier1 = await Match.create({
    tournamentId,
    teamA: rank1._id,
    teamB: rank2._id,
    matchType: "qualifier1",
    matchNumber: 0,
    setCount: playoffSetCount,
    currentSet: 1,
    status: "scheduled",
    sets: createSetArray(playoffSetCount),
    timerState: { status: "stopped", elapsedSeconds: 0 },
    events: [],
  });

  // Create Eliminator: Rank 3 vs Rank 4 (single set)
  const eliminator = await Match.create({
    tournamentId,
    teamA: rank3._id,
    teamB: rank4._id,
    matchType: "eliminator",
    matchNumber: 0,
    setCount: playoffSetCount,
    currentSet: 1,
    status: "scheduled",
    sets: createSetArray(playoffSetCount),
    timerState: { status: "stopped", elapsedSeconds: 0 },
    events: [],
  });

  // Create Qualifier 2: Teams TBD - Q1 Loser vs Eliminator Winner (single set)
  // teamA will be set when Q1 completes (Q1 loser)
  // teamB will be set when Eliminator completes (Eliminator winner)
  const qualifier2 = await Match.create({
    tournamentId,
    teamA: null, // TBD - Q1 Loser
    teamB: null, // TBD - Eliminator Winner
    matchType: "qualifier2",
    matchNumber: 0,
    setCount: playoffSetCount,
    currentSet: 1,
    status: "pending", // Can't start until Q1 and Eliminator complete
    sets: createSetArray(playoffSetCount),
    timerState: { status: "stopped", elapsedSeconds: 0 },
    events: [],
  });

  // Create Final: Teams TBD - Q1 Winner vs Q2 Winner (best of finalSetCount)
  // teamA will be set when Q1 completes (Q1 winner)
  // teamB will be set when Q2 completes (Q2 winner)
  const finalMatch = await Match.create({
    tournamentId,
    teamA: null, // TBD - Q1 Winner
    teamB: null, // TBD - Q2 Winner
    matchType: "final",
    matchNumber: 0,
    setCount: finalSetCount,
    currentSet: 1,
    status: "pending", // Can't start until Q1 and Q2 complete
    sets: createSetArray(finalSetCount),
    timerState: { status: "stopped", elapsedSeconds: 0 },
    events: [],
  });

  // Add playoff matches to tournament
  tournament.matches.push(qualifier1._id, eliminator._id, qualifier2._id, finalMatch._id);
  tournament.playoffsGenerated = true;
  await tournament.save();

  return NextResponse.json({
    success: true,
    message: "Playoffs generated successfully",
    playoffs: {
      qualifier1: { id: qualifier1._id, teams: [rank1.name, rank2.name] },
      eliminator: { id: eliminator._id, teams: [rank3.name, rank4.name] },
      qualifier2: { id: qualifier2._id, teams: ["Q1 Loser", "Eliminator Winner"], status: "pending" },
      final: { id: finalMatch._id, teams: ["Q1 Winner", "Q2 Winner"], status: "pending" },
    },
  });
}
