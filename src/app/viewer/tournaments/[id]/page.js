'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateStandings } from '@/lib/standings/calculator';

export default function ViewerTournament({ params }) {
  const { id } = params;
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
      const res = await fetch(`/api/tournaments/${id}`);
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
                        <tr key={s.teamId} className={`border-b ${idx < 2 ? 'bg-green-50' : ''}`}>
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
                            <div className={`font-medium ${match.winnerId?.toString() === teamA?._id?.toString() ? 'text-green-600' : ''}`}>
                              {teamA?.name || 'TBD'}
                            </div>
                            <div className={`font-medium ${match.winnerId?.toString() === teamB?._id?.toString() ? 'text-green-600' : ''}`}>
                              {teamB?.name || 'TBD'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {match.status === 'completed' && match.sets && (
                            <div className="text-right">
                              <div className={`font-mono ${match.winnerId?.toString() === teamA?._id?.toString() ? 'font-bold' : ''}`}>
                                {match.sets[0]?.teamAScore || 0}
                              </div>
                              <div className={`font-mono ${match.winnerId?.toString() === teamB?._id?.toString() ? 'font-bold' : ''}`}>
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
