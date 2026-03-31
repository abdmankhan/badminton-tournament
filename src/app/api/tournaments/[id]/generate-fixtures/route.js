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
    const { setCount = 1 } = await request.json();

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 },
      );
    }

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
        matchNumber: i + 1,
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
