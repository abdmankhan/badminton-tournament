/**
 * Badminton Tournament App - Part 3: API Routes & Viewer Pages
 * Run: node create_source_files_part3.js
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = __dirname;

const tournamentsRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Tournament, Team } from '@/lib/db/models';

export async function GET() {
  try {
    await connectDB();
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    return NextResponse.json(tournaments);
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
      status: 'draft',
    });

    const teamIds = [];
    for (const teamData of data.teams) {
      const team = await Team.create({
        tournamentId: tournament._id,
        name: teamData.name,
        players: teamData.players.map(p => ({
          name: p.name,
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
`;

const tournamentIdRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Tournament, Team, Match } from '@/lib/db/models';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const teams = await Team.find({ tournamentId: id });
    const matches = await Match.find({ tournamentId: id }).sort({ matchNumber: 1 });

    return NextResponse.json({ tournament, teams, matches });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    const tournament = await Tournament.findByIdAndUpdate(id, data, { new: true });
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

const generateFixturesRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Tournament, Team, Match } from '@/lib/db/models';
import { generateRoundRobinFixtures } from '@/lib/scoring/fixtures';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { setCount = 1 } = await request.json();

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const teams = await Team.find({ tournamentId: id });
    if (teams.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 teams' }, { status: 400 });
    }

    const teamIds = teams.map(t => t._id);
    const fixtures = generateRoundRobinFixtures(teamIds);

    const matchIds = [];
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];
      const match = await Match.create({
        tournamentId: id,
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        matchType: 'league',
        matchNumber: i + 1,
        setCount,
        currentSet: 1,
        status: 'scheduled',
        sets: Array.from({ length: setCount }, (_, idx) => ({
          setNumber: idx + 1,
          teamAScore: 0,
          teamBScore: 0,
          isComplete: false,
        })),
        timerState: {
          status: 'stopped',
          elapsedSeconds: 0,
        },
        events: [],
      });
      matchIds.push(match._id);
    }

    tournament.matches = matchIds;
    tournament.status = 'active';
    await tournament.save();

    return NextResponse.json({ success: true, matchCount: matchIds.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

const standingsRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Team, Match } from '@/lib/db/models';
import { calculateStandings } from '@/lib/standings/calculator';

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
`;

const matchIdRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Match, Team } from '@/lib/db/models';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (data.status === 'completed' && data.winnerId) {
      await updateTeamStats(match);
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

  const teamAScore = match.sets?.reduce((sum, s) => sum + (s.teamAScore || 0), 0) || 0;
  const teamBScore = match.sets?.reduce((sum, s) => sum + (s.teamBScore || 0), 0) || 0;
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

  teamA.stats.pointDifference = teamA.stats.pointsFor - teamA.stats.pointsAgainst;
  teamB.stats.pointDifference = teamB.stats.pointsFor - teamB.stats.pointsAgainst;

  const teamAMatchEff = (teamAScore - teamBScore) / duration;
  const teamBMatchEff = (teamBScore - teamAScore) / duration;

  teamA.stats.efficiencyScore = (teamA.stats.efficiencyScore || 0) + teamAMatchEff;
  teamB.stats.efficiencyScore = (teamB.stats.efficiencyScore || 0) + teamBMatchEff;

  await teamA.save();
  await teamB.save();
}
`;

const scoreRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Match } from '@/lib/db/models';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const event = await request.json();

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    match.events.push({
      ...event,
      timestamp: new Date(),
    });

    await match.save();

    return NextResponse.json({ success: true, event });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

const syncRouteJs = `import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Tournament, Team, Match } from '@/lib/db/models';

export async function POST(request) {
  try {
    await connectDB();
    const { items } = await request.json();

    const results = [];

    for (const item of items) {
      try {
        switch (item.type) {
          case 'tournament':
            if (item.action === 'create') {
              const tournament = await Tournament.create(item.data);
              results.push({ id: item.id, success: true, serverId: tournament._id });
            } else if (item.action === 'update') {
              await Tournament.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          case 'team':
            if (item.action === 'create') {
              const team = await Team.create(item.data);
              results.push({ id: item.id, success: true, serverId: team._id });
            } else if (item.action === 'update') {
              await Team.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          case 'match':
            if (item.action === 'update') {
              await Match.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          default:
            results.push({ id: item.id, success: false, error: 'Unknown type' });
        }
      } catch (err) {
        results.push({ id: item.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

const viewerPageJs = `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Users, Calendar, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLocalTournaments } from '@/lib/offline/db';
import { formatDate } from '@/lib/utils';

export default function ViewerDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.filter(t => t.status === 'active' || t.status === 'completed'));
      } else {
        const localData = await getLocalTournaments();
        setTournaments(localData.filter(t => t.status === 'active' || t.status === 'completed'));
      }
    } catch (error) {
      const localData = await getLocalTournaments();
      setTournaments(localData.filter(t => t.status === 'active' || t.status === 'completed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-blue-500" />
              <span className="font-bold text-xl">Tournament Viewer</span>
            </Link>
            <Badge variant="outline" className="border-blue-500 text-blue-500">
              <Eye className="h-3 w-3 mr-1" />
              Viewer
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Live Tournaments</h1>

        {loading ? (
          <div className="text-center py-12">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No active tournaments</h2>
              <p className="text-muted-foreground">Check back later for live tournaments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <CardDescription>{formatDate(tournament.createdAt)}</CardDescription>
                    </div>
                    <Badge variant={tournament.status === 'active' ? 'success' : 'default'}>
                      {tournament.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {tournament.numberOfTeams} teams
                    </div>
                  </div>
                  <Link href={\`/viewer/tournaments/\${tournament._id}\`}>
                    <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-50">
                      View Tournament
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
`;

const viewerTournamentPageJs = `'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateStandings } from '@/lib/standings/calculator';

export default function ViewerTournament({ params }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  async function loadData() {
    try {
      const res = await fetch(\`/api/tournaments/\${id}\`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
        setTeams(data.teams);
        setMatches(data.matches);
        setStandings(calculateStandings(data.teams, data.matches));
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Tournament not found</h2>
          <Link href="/viewer">
            <Button>Back to Tournaments</Button>
          </Link>
        </div>
      </div>
    );
  }

  const leagueMatches = matches.filter(m => m.matchType === 'league');
  const completedMatches = leagueMatches.filter(m => m.status === 'completed');
  const liveMatch = matches.find(m => m.status === 'live');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/viewer">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={tournament.status === 'active' ? 'success' : 'secondary'}>
                {tournament.status}
              </Badge>
              <span>{teams.length} teams</span>
              <span>-</span>
              <span>{completedMatches.length}/{leagueMatches.length} matches</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {liveMatch && (
          <Card className="mb-6 border-2 border-red-500 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="live">LIVE NOW</Badge>
                  <span className="font-semibold">
                    {teams.find(t => t._id?.toString() === liveMatch.teamA?.toString())?.name} vs{' '}
                    {teams.find(t => t._id?.toString() === liveMatch.teamB?.toString())?.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="standings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="standings">
              <BarChart3 className="h-4 w-4 mr-2" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="players">
              <Users className="h-4 w-4 mr-2" />
              Players
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <CardTitle>League Standings</CardTitle>
                <CardDescription>Updated after each match</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">#</th>
                        <th className="text-left py-3 px-2">Team</th>
                        <th className="text-center py-3 px-2">P</th>
                        <th className="text-center py-3 px-2">W</th>
                        <th className="text-center py-3 px-2">L</th>
                        <th className="text-center py-3 px-2">Pts</th>
                        <th className="text-center py-3 px-2">PF</th>
                        <th className="text-center py-3 px-2">PA</th>
                        <th className="text-center py-3 px-2">PD</th>
                        <th className="text-center py-3 px-2">TES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, idx) => (
                        <tr key={s.teamId} className={\`border-b \${idx < 2 ? 'bg-green-50' : ''}\`}>
                          <td className="py-3 px-2 font-medium">{s.rank}</td>
                          <td className="py-3 px-2 font-medium">{s.teamName}</td>
                          <td className="text-center py-3 px-2">{s.matchesPlayed}</td>
                          <td className="text-center py-3 px-2">{s.wins}</td>
                          <td className="text-center py-3 px-2">{s.losses}</td>
                          <td className="text-center py-3 px-2 font-bold">{s.leaguePoints}</td>
                          <td className="text-center py-3 px-2">{s.pointsFor}</td>
                          <td className="text-center py-3 px-2">{s.pointsAgainst}</td>
                          <td className="text-center py-3 px-2">{s.pointDifference > 0 ? '+' : ''}{s.pointDifference}</td>
                          <td className="text-center py-3 px-2">{s.efficiencyScore.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p><strong>Ranking:</strong> League Points - TES - Head-to-Head - Point Difference - Points For</p>
                  <p className="mt-1"><strong>TES:</strong> Sum of (Points For - Points Against) / Match Duration for each match</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Match Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leagueMatches.map((match, idx) => {
                    const teamA = teams.find(t => t._id?.toString() === match.teamA?.toString());
                    const teamB = teams.find(t => t._id?.toString() === match.teamB?.toString());
                    
                    return (
                      <div
                        key={match._id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground w-8">#{idx + 1}</span>
                          <div>
                            <div className={\`font-medium \${match.winnerId?.toString() === teamA?._id?.toString() ? 'text-green-600' : ''}\`}>
                              {teamA?.name || 'TBD'}
                            </div>
                            <div className={\`font-medium \${match.winnerId?.toString() === teamB?._id?.toString() ? 'text-green-600' : ''}\`}>
                              {teamB?.name || 'TBD'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {match.status === 'completed' && match.sets && (
                            <div className="text-right">
                              <div className={\`font-mono \${match.winnerId?.toString() === teamA?._id?.toString() ? 'font-bold' : ''}\`}>
                                {match.sets[0]?.teamAScore || 0}
                              </div>
                              <div className={\`font-mono \${match.winnerId?.toString() === teamB?._id?.toString() ? 'font-bold' : ''}\`}>
                                {match.sets[0]?.teamBScore || 0}
                              </div>
                            </div>
                          )}
                          <Badge variant={
                            match.status === 'completed' ? 'success' :
                            match.status === 'live' ? 'live' :
                            'secondary'
                          }>
                            {match.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle>All Players</CardTitle>
                <CardDescription>Player statistics coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <div key={team._id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{team.name}</h3>
                      <div className="space-y-2">
                        {team.players?.filter(p => !p.isSubstitute).map((player, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {player.name?.charAt(0)}
                            </div>
                            <span className="text-sm">{player.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
`;

const readmeMd = `# Badminton Tournament Manager

A production-quality tournament management and live scoring application for men's doubles badminton.

## Features

- Tournament Management: Create and manage tournaments with N teams
- Team & Player Setup: Add teams with 2 main players + optional substitutes
- Live Scoring: Real-time match scoring with player attribution
- Undo Support: Event-based scoring with full undo capability
- Leaderboard: Auto-updating standings with Tournament Efficiency Score
- Mobile-Friendly: Responsive design for scoring on any device
- Offline-First: Works offline with IndexedDB, syncs when online
- Viewer Mode: Read-only access for spectators

## Tech Stack

- Frontend: Next.js 14 (App Router) + JavaScript
- Styling: Tailwind CSS + shadcn/ui components
- State Management: Zustand
- Database: MongoDB Atlas with Mongoose
- Offline Storage: IndexedDB via Dexie.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works)

### Installation

1. Run the setup scripts to create all source files:
   node create_source_files.js
   node create_source_files_part2.js
   node create_source_files_part3.js

2. Install dependencies:
   npm install

3. Create .env.local with your MongoDB connection string:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/badminton-tournament

4. Run the development server:
   npm run dev

5. Open http://localhost:3000

## Usage Guide

### Admin Mode

1. Click "Enter as Admin" on the landing page
2. Create a new tournament with teams and players
3. Generate fixtures (round-robin)
4. Start matches and score live
5. View auto-updating standings

### Scoring a Match

1. Navigate to a match and click "Start"
2. Use team +/- buttons for team-only scoring
3. Use player +/- buttons to credit points (also updates team score)
4. Click "Undo" to reverse the last action
5. Click "End Match" when done

### Viewer Mode

1. Click "Enter as Viewer" on the landing page
2. Browse active tournaments
3. View standings, matches, and players (read-only)

## Tournament Efficiency Score (TES)

The TES is used for tie-breaking in standings:

Match Efficiency = (Points For - Points Against) / Duration in Minutes
TES = Sum of Match Efficiency across all matches

This rewards:
- Winning by larger margins
- Winning in shorter time
- Consistent performance

### Ranking Priority

1. League Points (Win = 2, Loss = 0)
2. Tournament Efficiency Score
3. Head-to-Head Result
4. Point Difference
5. Points For

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add MONGODB_URI environment variable
4. Deploy

## License

MIT
`;

const seedJs = `/**
 * Seed script for sample tournament data
 * Run: npm run seed (or: node scripts/seed.js)
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI environment variable');
  process.exit(1);
}

const PlayerSubSchema = new mongoose.Schema({
  name: String,
  avatarUrl: String,
  isSubstitute: { type: Boolean, default: false },
});

const TeamStatsSchema = new mongoose.Schema({
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  leaguePoints: { type: Number, default: 0 },
  pointsFor: { type: Number, default: 0 },
  pointsAgainst: { type: Number, default: 0 },
  pointDifference: { type: Number, default: 0 },
  totalDurationMinutes: { type: Number, default: 0 },
  efficiencyScore: { type: Number, default: 0 },
});

const TournamentSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'draft' },
  format: { type: String, default: 'round-robin-final' },
  numberOfTeams: Number,
  leagueSetCount: { type: Number, default: 1 },
  finalSetCount: { type: Number, default: 3 },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
}, { timestamps: true });

const TeamSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  name: String,
  players: [PlayerSubSchema],
  stats: { type: TeamStatsSchema, default: () => ({}) },
  rank: { type: Number, default: 0 },
}, { timestamps: true });

const Tournament = mongoose.model('Tournament', TournamentSchema);
const Team = mongoose.model('Team', TeamSchema);

const sampleTournament = {
  name: 'Spring Championship 2024',
  format: 'round-robin-final',
  leagueSetCount: 1,
  finalSetCount: 3,
  teams: [
    {
      name: 'Thunder Smashers',
      players: [
        { name: 'Rahul Sharma', isSubstitute: false },
        { name: 'Vikram Patel', isSubstitute: false },
        { name: 'Amit Kumar', isSubstitute: true },
      ],
    },
    {
      name: 'Net Warriors',
      players: [
        { name: 'Arun Reddy', isSubstitute: false },
        { name: 'Suresh Nair', isSubstitute: false },
        { name: 'Kiran Das', isSubstitute: true },
      ],
    },
    {
      name: 'Shuttle Kings',
      players: [
        { name: 'Deepak Singh', isSubstitute: false },
        { name: 'Mohan Rao', isSubstitute: false },
      ],
    },
    {
      name: 'Racket Rebels',
      players: [
        { name: 'Pradeep Verma', isSubstitute: false },
        { name: 'Sanjay Gupta', isSubstitute: false },
        { name: 'Ravi Prakash', isSubstitute: true },
      ],
    },
    {
      name: 'Court Crushers',
      players: [
        { name: 'Nitin Mehta', isSubstitute: false },
        { name: 'Ajay Khanna', isSubstitute: false },
      ],
    },
    {
      name: 'Birdie Blazers',
      players: [
        { name: 'Rohit Joshi', isSubstitute: false },
        { name: 'Manish Agarwal', isSubstitute: false },
        { name: 'Varun Kapoor', isSubstitute: true },
      ],
    },
  ],
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing existing data...');
    await Tournament.deleteMany({});
    await Team.deleteMany({});

    console.log('Creating tournament...');
    const tournament = await Tournament.create({
      name: sampleTournament.name,
      format: sampleTournament.format,
      numberOfTeams: sampleTournament.teams.length,
      leagueSetCount: sampleTournament.leagueSetCount,
      finalSetCount: sampleTournament.finalSetCount,
      status: 'draft',
    });

    console.log('Creating teams...');
    const teamIds = [];
    for (const teamData of sampleTournament.teams) {
      const team = await Team.create({
        tournamentId: tournament._id,
        name: teamData.name,
        players: teamData.players,
        stats: {},
      });
      teamIds.push(team._id);
      console.log('  Created team:', team.name);
    }

    tournament.teams = teamIds;
    await tournament.save();

    console.log('');
    console.log('Seed completed!');
    console.log('Tournament ID:', tournament._id.toString());
    console.log('Teams created:', teamIds.length);
    console.log('');
    console.log('Start the app with: npm run dev');

  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
`;

const files = {
  'src/app/api/tournaments/route.js': tournamentsRouteJs,
  'src/app/api/tournaments/[id]/route.js': tournamentIdRouteJs,
  'src/app/api/tournaments/[id]/generate-fixtures/route.js': generateFixturesRouteJs,
  'src/app/api/tournaments/[id]/standings/route.js': standingsRouteJs,
  'src/app/api/matches/[id]/route.js': matchIdRouteJs,
  'src/app/api/matches/[id]/score/route.js': scoreRouteJs,
  'src/app/api/sync/route.js': syncRouteJs,
  'src/app/viewer/page.js': viewerPageJs,
  'src/app/viewer/tournaments/[id]/page.js': viewerTournamentPageJs,
  'README.md': readmeMd,
  'scripts/seed.js': seedJs,
};

function createFile(relativePath, content) {
  const fullPath = path.join(BASE_PATH, relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
  console.log('Created: ' + relativePath);
}

console.log('Creating Part 3 files (API routes, viewer pages, README)...\n');

Object.entries(files).forEach(function([filePath, content]) {
  createFile(filePath, content);
});

console.log('\nPart 3 files created successfully!');
console.log('\nAll source files are ready!');
console.log('\nNext steps:');
console.log('1. npm install');
console.log('2. Create .env.local with MONGODB_URI');
console.log('3. npm run dev');
