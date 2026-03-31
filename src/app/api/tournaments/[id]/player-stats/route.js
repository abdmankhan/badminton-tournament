import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Tournament from '@/lib/db/models/Tournament';
import Match from '@/lib/db/models/Match';
import { calculateTournamentPlayerStats, getTopPerformers } from '@/lib/standings/playerStats';

/**
 * GET /api/tournaments/[id]/player-stats
 * Get all player statistics for a tournament
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    // Get tournament with teams
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Get all completed matches
    const matches = await Match.find({
      tournamentId: id,
      status: 'completed',
    }).lean();

    // Calculate player stats
    const playerStats = calculateTournamentPlayerStats(tournament.teams, matches);
    const topPerformers = getTopPerformers(playerStats);

    // Return with no-cache headers
    return NextResponse.json(
      {
        playerStats,
        topPerformers,
        totalMatches: matches.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
