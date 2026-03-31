import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Team, Match } from "@/lib/db/models";
import { calculateStandings } from "@/lib/standings/calculator";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const teams = await Team.find({ tournamentId: id });
    const matches = await Match.find({ tournamentId: id });

    const standings = calculateStandings(teams, matches);

    return NextResponse.json(standings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
