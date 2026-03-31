import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import { Tournament, Team, Match } from "@/lib/db/models";

// Disable caching for this API route
export const dynamic = "force-dynamic";
export const revalidate = 0;

// No-cache headers helper
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404, headers: noCacheHeaders },
      );
    }

    const teams = await Team.find({ tournamentId: id });
    const matches = await Match.find({ tournamentId: id }).sort({
      matchNumber: 1,
    });

    return NextResponse.json({ tournament, teams, matches }, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const tournament = await Tournament.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
