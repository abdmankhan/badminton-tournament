import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Tournament from '@/lib/db/models/Tournament';
import Match from '@/lib/db/models/Match';

/**
 * GET /api/tournaments/[id]/match-history
 * Get detailed match history with event timeline
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();

    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const matches = await Match.find({ 
      tournamentId: id,
      status: 'completed' 
    }).sort({ endedAt: -1 }).lean();

    // Build team lookup map
    const teamMap = {};
    tournament.teams.forEach(team => {
      teamMap[team._id.toString()] = team;
    });

    // Enrich match data
    const enrichedMatches = matches.map(match => {
      const teamA = teamMap[match.teamA?.toString()];
      const teamB = teamMap[match.teamB?.toString()];
      const winner = teamMap[match.winnerId?.toString()];

      // Calculate point timeline from events
      const events = match.events || [];
      const timeline = [];
      let runningScoreA = 0;
      let runningScoreB = 0;

      events.filter(e => !e.undone && e.actionType === '+1').forEach((event, idx) => {
        const isTeamA = event.teamId?.toString() === match.teamA?.toString();
        if (isTeamA) runningScoreA++;
        else runningScoreB++;

        timeline.push({
          index: idx + 1,
          scoreA: runningScoreA,
          scoreB: runningScoreB,
          team: isTeamA ? 'A' : 'B',
          playerName: event.playerName || null,
          timestamp: event.timestamp,
        });
      });

      // Calculate momentum shifts (when lead changes)
      let momentumShifts = 0;
      let lastLeader = null;
      timeline.forEach(point => {
        const leader = point.scoreA > point.scoreB ? 'A' : point.scoreB > point.scoreA ? 'B' : null;
        if (leader && leader !== lastLeader) {
          momentumShifts++;
          lastLeader = leader;
        }
      });

      // Find key moments (deuce, game points, etc.)
      const keyMoments = [];
      timeline.forEach((point, idx) => {
        if (point.scoreA === 20 && point.scoreB === 20) {
          keyMoments.push({ type: 'deuce', point: idx + 1, score: '20-20' });
        }
        if ((point.scoreA === 20 && point.scoreB < 20) || (point.scoreB === 20 && point.scoreA < 20)) {
          keyMoments.push({ 
            type: 'gamePoint', 
            point: idx + 1, 
            team: point.scoreA === 20 ? 'A' : 'B',
            score: `${point.scoreA}-${point.scoreB}`
          });
        }
      });

      return {
        _id: match._id,
        matchNumber: match.matchNumber,
        matchType: match.matchType,
        teamA: teamA ? { name: teamA.name, photoUrl: teamA.photoUrl } : null,
        teamB: teamB ? { name: teamB.name, photoUrl: teamB.photoUrl } : null,
        score: match.score,
        winner: winner ? { name: winner.name, photoUrl: winner.photoUrl } : null,
        duration: match.duration,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
        timeline,
        momentumShifts,
        keyMoments,
        totalEvents: events.filter(e => !e.undone).length,
      };
    });

    return NextResponse.json({
      matches: enrichedMatches,
      totalMatches: enrichedMatches.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching match history:', error);
    return NextResponse.json({ error: 'Failed to fetch match history' }, { status: 500 });
  }
}
