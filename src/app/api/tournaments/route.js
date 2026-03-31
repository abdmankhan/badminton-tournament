import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Tournament, Team } from "@/lib/db/models";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    
    // Return with no-cache headers
    return NextResponse.json(tournaments, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    const tournament = await Tournament.create({
      name: data.name,
      format: data.format,
      numberOfTeams: data.numberOfTeams,
      leagueSetCount: data.leagueSetCount || 1,
      finalSetCount: data.finalSetCount || 3,
      status: "draft",
    });

    const teamIds = [];
    for (const teamData of data.teams) {
      const team = await Team.create({
        tournamentId: tournament._id,
        name: teamData.name,
        photoUrl: teamData.photoUrl || null,
        players: teamData.players.map((p) => ({
          name: p.name,
          photoUrl: p.photoUrl || null,
          isSubstitute: p.isSubstitute || false,
        })),
        stats: {
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          leaguePoints: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDifference: 0,
          totalDurationMinutes: 0,
          efficiencyScore: 0,
        },
      });
      teamIds.push(team._id);
    }

    tournament.teams = teamIds;
    await tournament.save();

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
