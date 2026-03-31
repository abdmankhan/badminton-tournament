/**
 * Badminton Tournament App - Additional Source Files (Part 2)
 * 
 * Run this file with Node.js AFTER create_source_files.js:
 *   node create_source_files_part2.js
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = __dirname;

const files = {
  // ============================================
  // ADMIN PAGES
  // ============================================
  'src/app/admin/page.js': `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trophy, Users, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTournamentStore } from '@/stores/tournamentStore';
import { getLocalTournaments } from '@/lib/offline/db';
import { formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      // Try API first
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      } else {
        // Fall back to local storage
        const localData = await getLocalTournaments();
        setTournaments(localData);
      }
    } catch (error) {
      // Offline - use local storage
      const localData = await getLocalTournaments();
      setTournaments(localData);
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    draft: 'secondary',
    active: 'success',
    completed: 'default',
    cancelled: 'destructive',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Tournament Manager</span>
            </Link>
            <Badge variant="outline">Admin</Badge>
          </div>
          <Link href="/admin/tournaments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Tournament
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Tournaments</h1>

        {loading ? (
          <div className="text-center py-12">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No tournaments yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first tournament to get started
              </p>
              <Link href="/admin/tournaments/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              </Link>
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
                      <CardDescription>
                        {formatDate(tournament.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant={statusColors[tournament.status]}>
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
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {tournament.matches?.length || 0} matches
                    </div>
                  </div>
                  <Link href={\`/admin/tournaments/\${tournament._id}\`}>
                    <Button variant="outline" className="w-full">
                      Manage
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
`,

  'src/app/admin/tournaments/new/page.js': `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/utils';
import { saveTournamentLocally, saveTeamLocally, addToSyncQueue, isOffline } from '@/lib/offline/db';

export default function NewTournament() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [tournament, setTournament] = useState({
    name: '',
    format: 'round-robin-final',
    leagueSetCount: 1,
    finalSetCount: 3,
  });

  const [teams, setTeams] = useState([
    { id: generateId(), name: '', players: [{ name: '' }, { name: '' }], substitutes: [] },
    { id: generateId(), name: '', players: [{ name: '' }, { name: '' }], substitutes: [] },
  ]);

  const addTeam = () => {
    setTeams([
      ...teams,
      { id: generateId(), name: '', players: [{ name: '' }, { name: '' }], substitutes: [] },
    ]);
  };

  const removeTeam = (teamId) => {
    if (teams.length <= 2) {
      toast.error('Minimum 2 teams required');
      return;
    }
    setTeams(teams.filter((t) => t.id !== teamId));
  };

  const updateTeam = (teamId, field, value) => {
    setTeams(
      teams.map((t) => (t.id === teamId ? { ...t, [field]: value } : t))
    );
  };

  const updatePlayer = (teamId, playerIndex, value) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        const newPlayers = [...t.players];
        newPlayers[playerIndex] = { name: value };
        return { ...t, players: newPlayers };
      })
    );
  };

  const addSubstitute = (teamId) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return { ...t, substitutes: [...t.substitutes, { name: '' }] };
      })
    );
  };

  const updateSubstitute = (teamId, subIndex, value) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        const newSubs = [...t.substitutes];
        newSubs[subIndex] = { name: value };
        return { ...t, substitutes: newSubs };
      })
    );
  };

  const removeSubstitute = (teamId, subIndex) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return { ...t, substitutes: t.substitutes.filter((_, i) => i !== subIndex) };
      })
    );
  };

  const validateForm = () => {
    if (!tournament.name.trim()) {
      toast.error('Tournament name is required');
      return false;
    }

    for (const team of teams) {
      if (!team.name.trim()) {
        toast.error('All teams must have a name');
        return false;
      }
      for (const player of team.players) {
        if (!player.name.trim()) {
          toast.error(\`Team "\${team.name}" must have 2 players\`);
          return false;
        }
      }
    }

    const teamNames = teams.map((t) => t.name.toLowerCase());
    if (new Set(teamNames).size !== teamNames.length) {
      toast.error('Team names must be unique');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);

    try {
      const tournamentData = {
        ...tournament,
        numberOfTeams: teams.length,
        status: 'draft',
        teams: teams.map((t) => ({
          name: t.name,
          players: [
            ...t.players.map((p) => ({ name: p.name, isSubstitute: false })),
            ...t.substitutes.filter((s) => s.name.trim()).map((s) => ({ name: s.name, isSubstitute: true })),
          ],
        })),
      };

      if (isOffline()) {
        // Save locally
        const localId = generateId();
        const localTournament = { ...tournamentData, _id: localId, createdAt: new Date().toISOString() };
        await saveTournamentLocally(localTournament);
        await addToSyncQueue('tournament', 'create', localTournament);
        toast.success('Tournament saved locally (will sync when online)');
        router.push(\`/admin/tournaments/\${localId}\`);
      } else {
        // Save to server
        const res = await fetch('/api/tournaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournamentData),
        });

        if (!res.ok) {
          throw new Error('Failed to create tournament');
        }

        const data = await res.json();
        toast.success('Tournament created successfully');
        router.push(\`/admin/tournaments/\${data._id}\`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create tournament');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Create New Tournament</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tournament Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
              <CardDescription>Basic information about your tournament</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  value={tournament.name}
                  onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
                  placeholder="e.g., Spring Championship 2024"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Format</Label>
                  <Select
                    value={tournament.format}
                    onValueChange={(v) => setTournament({ ...tournament, format: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin-final">Round Robin + Final</SelectItem>
                      <SelectItem value="round-robin-semifinal-final">Round Robin + Semis + Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>League Sets per Match</Label>
                  <Select
                    value={tournament.leagueSetCount.toString()}
                    onValueChange={(v) => setTournament({ ...tournament, leagueSetCount: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Set</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Final Sets</Label>
                  <Select
                    value={tournament.finalSetCount.toString()}
                    onValueChange={(v) => setTournament({ ...tournament, finalSetCount: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Set</SelectItem>
                      <SelectItem value="3">Best of 3</SelectItem>
                      <SelectItem value="5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teams ({teams.length})</CardTitle>
                  <CardDescription>Add teams and their players</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addTeam}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {teams.map((team, teamIndex) => (
                <div key={team.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                      <Label>Team {teamIndex + 1} Name</Label>
                      <Input
                        value={team.name}
                        onChange={(e) => updateTeam(team.id, 'name', e.target.value)}
                        placeholder="Enter team name"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeTeam(team.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Player 1</Label>
                      <Input
                        value={team.players[0].name}
                        onChange={(e) => updatePlayer(team.id, 0, e.target.value)}
                        placeholder="Player name"
                      />
                    </div>
                    <div>
                      <Label>Player 2</Label>
                      <Input
                        value={team.players[1].name}
                        onChange={(e) => updatePlayer(team.id, 1, e.target.value)}
                        placeholder="Player name"
                      />
                    </div>
                  </div>

                  {/* Substitutes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm text-muted-foreground">Substitutes (optional)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addSubstitute(team.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Sub
                      </Button>
                    </div>
                    {team.substitutes.map((sub, subIndex) => (
                      <div key={subIndex} className="flex items-center gap-2 mb-2">
                        <Input
                          value={sub.name}
                          onChange={(e) => updateSubstitute(team.id, subIndex, e.target.value)}
                          placeholder="Substitute name"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubstitute(team.id, subIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/admin">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
`,

  'src/app/admin/tournaments/[id]/page.js': `'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Trophy, Users, Calendar, Settings, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTournamentStore } from '@/stores/tournamentStore';
import { calculateStandings } from '@/lib/standings/calculator';
import { generateRoundRobinFixtures, createMatchesFromFixtures } from '@/lib/scoring/fixtures';
import { getLocalTournament, getLocalTeams, getLocalMatches, saveTournamentLocally, saveMatchLocally, isOffline } from '@/lib/offline/db';

export default function TournamentDashboard({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournamentData();
  }, [id]);

  async function loadTournamentData() {
    try {
      const res = await fetch(\`/api/tournaments/\${id}\`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
        setTeams(data.teams);
        setMatches(data.matches);
        
        // Calculate standings
        const calculatedStandings = calculateStandings(data.teams, data.matches);
        setStandings(calculatedStandings);
      } else {
        // Fall back to local
        const localTournament = await getLocalTournament(id);
        const localTeams = await getLocalTeams(id);
        const localMatches = await getLocalMatches(id);
        
        setTournament(localTournament);
        setTeams(localTeams);
        setMatches(localMatches);
        
        const calculatedStandings = calculateStandings(localTeams, localMatches);
        setStandings(calculatedStandings);
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      // Try local storage
      const localTournament = await getLocalTournament(id);
      if (localTournament) {
        setTournament(localTournament);
        const localTeams = await getLocalTeams(id);
        const localMatches = await getLocalMatches(id);
        setTeams(localTeams);
        setMatches(localMatches);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateFixtures() {
    if (!tournament || teams.length < 2) {
      toast.error('Need at least 2 teams to generate fixtures');
      return;
    }

    try {
      const teamIds = teams.map(t => t._id || t.id);
      const fixtures = generateRoundRobinFixtures(teamIds);
      const newMatches = createMatchesFromFixtures(fixtures, id, tournament.leagueSetCount || 1);

      // Populate team references
      const matchesWithTeams = newMatches.map(m => ({
        ...m,
        teamAData: teams.find(t => (t._id || t.id) === m.teamA),
        teamBData: teams.find(t => (t._id || t.id) === m.teamB),
      }));

      if (isOffline()) {
        // Save locally
        for (const match of matchesWithTeams) {
          await saveMatchLocally({ ...match, tournamentId: id });
        }
        await saveTournamentLocally({ ...tournament, status: 'active', matches: matchesWithTeams.map(m => m._id) });
        toast.success('Fixtures generated locally');
        setMatches(matchesWithTeams);
        setTournament({ ...tournament, status: 'active' });
      } else {
        const res = await fetch(\`/api/tournaments/\${id}/generate-fixtures\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setCount: tournament.leagueSetCount || 1 }),
        });

        if (res.ok) {
          toast.success('Fixtures generated successfully');
          loadTournamentData();
        } else {
          throw new Error('Failed to generate fixtures');
        }
      }
    } catch (error) {
      toast.error(error.message);
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
          <Link href="/admin">
            <Button>Back to Dashboard</Button>
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
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
                <span>•</span>
                <span>{completedMatches.length}/{leagueMatches.length} matches completed</span>
              </div>
            </div>
          </div>
          {tournament.status === 'draft' && matches.length === 0 && (
            <Button onClick={handleGenerateFixtures}>
              <Play className="h-4 w-4 mr-2" />
              Generate Fixtures
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Match Banner */}
        {liveMatch && (
          <Card className="mb-6 border-2 border-red-500 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="live">LIVE</Badge>
                  <span className="font-semibold">
                    {liveMatch.teamAData?.name || 'Team A'} vs {liveMatch.teamBData?.name || 'Team B'}
                  </span>
                </div>
                <Link href={\`/admin/tournaments/\${id}/matches/\${liveMatch._id || liveMatch.id}\`}>
                  <Button size="sm">Continue Scoring</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList>
            <TabsTrigger value="matches">
              <Calendar className="h-4 w-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="standings">
              <BarChart3 className="h-4 w-4 mr-2" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="h-4 w-4 mr-2" />
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>League Matches</CardTitle>
                <CardDescription>
                  {completedMatches.length} of {leagueMatches.length} matches completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leagueMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fixtures generated yet</p>
                    <Button onClick={handleGenerateFixtures} className="mt-4">
                      Generate Fixtures
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leagueMatches.map((match, idx) => {
                      const teamA = teams.find(t => (t._id || t.id)?.toString() === (match.teamA?._id || match.teamA)?.toString());
                      const teamB = teams.find(t => (t._id || t.id)?.toString() === (match.teamB?._id || match.teamB)?.toString());
                      
                      return (
                        <div
                          key={match._id || match.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-8">#{idx + 1}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{teamA?.name || 'TBD'}</span>
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">{teamB?.name || 'TBD'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {match.status === 'completed' && (
                              <div className="text-sm">
                                {match.sets?.map((s, i) => (
                                  <span key={i} className="mx-1">
                                    {s.teamAScore}-{s.teamBScore}
                                  </span>
                                ))}
                              </div>
                            )}
                            <Badge variant={
                              match.status === 'completed' ? 'success' :
                              match.status === 'live' ? 'live' :
                              'secondary'
                            }>
                              {match.status}
                            </Badge>
                            {match.status !== 'completed' && (
                              <Link href={\`/admin/tournaments/\${id}/matches/\${match._id || match.id}\`}>
                                <Button size="sm" variant={match.status === 'live' ? 'default' : 'outline'}>
                                  {match.status === 'live' ? 'Continue' : 'Start'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standings">
            <Card>
              <CardHeader>
                <CardTitle>League Standings</CardTitle>
                <CardDescription>
                  Updated after each completed match
                </CardDescription>
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
                  <p>P = Played, W = Won, L = Lost, Pts = League Points, PF = Points For, PA = Points Against, PD = Point Diff, TES = Tournament Efficiency Score</p>
                  <p className="mt-1">Top 2 teams (highlighted) qualify for the final.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Card key={team._id || team.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Players:</p>
                      {team.players?.filter(p => !p.isSubstitute).map((player, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {player.name?.charAt(0)}
                          </div>
                          {player.name}
                        </div>
                      ))}
                      {team.players?.filter(p => p.isSubstitute).length > 0 && (
                        <>
                          <p className="text-sm font-medium mt-4">Substitutes:</p>
                          {team.players?.filter(p => p.isSubstitute).map((player, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                {player.name?.charAt(0)}
                              </div>
                              {player.name}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
`,

  // ============================================
  // MATCH SCORING PAGE - THE MOST IMPORTANT PAGE
  // ============================================
  'src/app/admin/tournaments/[id]/matches/[matchId]/page.js': `'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, RotateCcw, Check, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PlayerAvatar } from '@/components/ui/avatar';
import { useMatchStore } from '@/stores/matchStore';
import { formatDuration } from '@/lib/utils';
import { calculateScoresFromEvents, determineMatchWinner } from '@/lib/scoring/engine';
import { saveMatchLocally, addToSyncQueue, isOffline } from '@/lib/offline/db';

export default function MatchScoring({ params }) {
  const { id: tournamentId, matchId } = use(params);
  const router = useRouter();
  
  const {
    currentMatch,
    loadMatch,
    addScoreEvent,
    undoLast,
    getCurrentScores,
    timerSeconds,
    timerRunning,
    startTimer,
    pauseTimer,
    clearMatch,
  } = useMatchStore();

  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMatchData();
    return () => {
      pauseTimer();
    };
  }, [matchId]);

  async function loadMatchData() {
    try {
      const res = await fetch(\`/api/matches/\${matchId}\`);
      if (res.ok) {
        const data = await res.json();
        loadMatch(data.match);
        setTeamA(data.teamA);
        setTeamB(data.teamB);
      }
    } catch (error) {
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  }

  const scores = getCurrentScores();
  const teamAScore = scores?.teamA?.[currentMatch?.currentSet || 1] || 0;
  const teamBScore = scores?.teamB?.[currentMatch?.currentSet || 1] || 0;

  function handlePlayerScore(player, team, teamData, actionType) {
    const event = addScoreEvent({
      actorType: 'player',
      playerId: player._id || player.name,
      playerName: player.name,
      teamId: team === 'A' ? (teamA?._id || teamA?.id) : (teamB?._id || teamB?.id),
      teamName: teamData?.name,
      actionType,
    });

    if (event) {
      const action = actionType === '+1' ? 'added to' : 'removed from';
      toast.success(\`Point \${action} \${teamData?.name} via \${player.name}\`);
    }
  }

  function handleTeamScore(team, teamData, actionType) {
    const event = addScoreEvent({
      actorType: 'team',
      teamId: team === 'A' ? (teamA?._id || teamA?.id) : (teamB?._id || teamB?.id),
      teamName: teamData?.name,
      actionType,
    });

    if (event) {
      const action = actionType === '+1' ? 'added to' : 'removed from';
      toast.success(\`Point \${action} \${teamData?.name}\`);
    }
  }

  function handleUndo() {
    const undoneEvent = undoLast();
    if (undoneEvent) {
      toast.info(\`Undid: \${undoneEvent.actionType === '+1' ? '+1' : '-1'} for \${undoneEvent.playerName || undoneEvent.teamName}\`);
    } else {
      toast.warning('No actions to undo');
    }
  }

  async function handleEndMatch() {
    setSaving(true);
    try {
      const finalScores = getCurrentScores();
      const teamATotal = Object.values(finalScores?.teamA || {}).reduce((a, b) => a + b, 0);
      const teamBTotal = Object.values(finalScores?.teamB || {}).reduce((a, b) => a + b, 0);
      
      let winnerId = null;
      if (teamATotal > teamBTotal) {
        winnerId = teamA?._id || teamA?.id;
      } else if (teamBTotal > teamATotal) {
        winnerId = teamB?._id || teamB?.id;
      }

      const matchData = {
        ...currentMatch,
        status: 'completed',
        winnerId,
        endedAt: new Date().toISOString(),
        durationMinutes: Math.round(timerSeconds / 60),
        timerState: {
          status: 'stopped',
          elapsedSeconds: timerSeconds,
        },
        sets: [{
          setNumber: 1,
          teamAScore: teamATotal,
          teamBScore: teamBTotal,
          winnerId,
          isComplete: true,
        }],
      };

      if (isOffline()) {
        await saveMatchLocally(matchData);
        await addToSyncQueue('match', 'update', matchData);
        toast.success('Match completed (saved locally)');
      } else {
        const res = await fetch(\`/api/matches/\${matchId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchData),
        });

        if (!res.ok) throw new Error('Failed to save match');
        toast.success('Match completed!');
      }

      clearMatch();
      router.push(\`/admin/tournaments/\${tournamentId}\`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
      setShowEndDialog(false);
    }
  }

  async function handleStartMatch() {
    if (currentMatch?.status !== 'live') {
      const matchData = {
        ...currentMatch,
        status: 'live',
        startedAt: currentMatch?.startedAt || new Date().toISOString(),
      };
      loadMatch(matchData);
      
      // Save status
      if (!isOffline()) {
        await fetch(\`/api/matches/\${matchId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'live', startedAt: matchData.startedAt }),
        });
      }
    }
    startTimer();
    toast.success('Match started');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading match...</div>
      </div>
    );
  }

  const teamAPlayers = teamA?.players?.filter(p => !p.isSubstitute) || [];
  const teamBPlayers = teamB?.players?.filter(p => !p.isSubstitute) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={\`/admin/tournaments/\${tournamentId}\`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="font-bold">Match #{currentMatch?.matchNumber}</h1>
            <Badge variant={currentMatch?.status === 'live' ? 'live' : 'secondary'}>
              {currentMatch?.status || 'scheduled'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={handleUndo}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Timer */}
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-5xl font-bold tabular-nums mb-4">
              {formatDuration(timerSeconds)}
            </div>
            <div className="flex justify-center gap-3">
              {!timerRunning ? (
                <Button onClick={handleStartMatch} size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  {currentMatch?.status === 'live' ? 'Resume' : 'Start Match'}
                </Button>
              ) : (
                <Button onClick={pauseTimer} variant="outline" size="lg">
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              )}
              <Button
                onClick={() => setShowEndDialog(true)}
                variant="destructive"
                size="lg"
                disabled={currentMatch?.status !== 'live'}
              >
                <Check className="h-5 w-5 mr-2" />
                End Match
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <Card className="overflow-hidden">
            <div className="bg-blue-600 text-white p-4 text-center">
              <h2 className="font-bold text-lg truncate">{teamA?.name || 'Team A'}</h2>
            </div>
            <CardContent className="py-8 text-center">
              <div className="score-display text-blue-600">{teamAScore}</div>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  size="icon-lg"
                  className="rounded-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleTeamScore('A', teamA, '+1')}
                >
                  <Plus className="h-6 w-6" />
                </Button>
                <Button
                  size="icon-lg"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleTeamScore('A', teamA, '-1')}
                  disabled={teamAScore <= 0}
                >
                  <Minus className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team B */}
          <Card className="overflow-hidden">
            <div className="bg-red-600 text-white p-4 text-center">
              <h2 className="font-bold text-lg truncate">{teamB?.name || 'Team B'}</h2>
            </div>
            <CardContent className="py-8 text-center">
              <div className="score-display text-red-600">{teamBScore}</div>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  size="icon-lg"
                  className="rounded-full bg-red-600 hover:bg-red-700"
                  onClick={() => handleTeamScore('B', teamB, '+1')}
                >
                  <Plus className="h-6 w-6" />
                </Button>
                <Button
                  size="icon-lg"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => handleTeamScore('B', teamB, '-1')}
                  disabled={teamBScore <= 0}
                >
                  <Minus className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Cards */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Player Credits</h3>
          <p className="text-sm text-muted-foreground">
            Tap a player to credit a point (also adds to team score)
          </p>
          
          {/* Team A Players */}
          <div className="grid grid-cols-2 gap-3">
            {teamAPlayers.map((player) => (
              <Card key={player.name} className="player-card border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <PlayerAvatar name={player.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{teamA?.name}</p>
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {scores?.playerCredits?.[player._id || player.name] || 0}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">pts</span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handlePlayerScore(player, 'A', teamA, '+1')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePlayerScore(player, 'A', teamA, '-1')}
                      disabled={(scores?.playerCredits?.[player._id || player.name] || 0) <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team B Players */}
          <div className="grid grid-cols-2 gap-3">
            {teamBPlayers.map((player) => (
              <Card key={player.name} className="player-card border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <PlayerAvatar name={player.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{teamB?.name}</p>
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <span className="text-2xl font-bold text-red-600">
                      {scores?.playerCredits?.[player._id || player.name] || 0}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">pts</span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handlePlayerScore(player, 'B', teamB, '+1')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePlayerScore(player, 'B', teamB, '-1')}
                      disabled={(scores?.playerCredits?.[player._id || player.name] || 0) <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Event Log */}
        {currentMatch?.events?.filter(e => !e.undone).length > 0 && (
          <Card>
            <CardContent className="py-4">
              <h3 className="font-semibold mb-3">Recent Events</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentMatch.events
                  .filter(e => !e.undone)
                  .slice(-10)
                  .reverse()
                  .map((event, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <Badge variant={event.actionType === '+1' ? 'success' : 'secondary'}>
                        {event.actionType}
                      </Badge>
                      <span>
                        {event.playerName || event.teamName}
                        {event.playerName && <span className="text-muted-foreground"> ({event.teamName})</span>}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* End Match Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Match?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-4">Final Score:</p>
            <div className="flex justify-center items-center gap-4 text-2xl font-bold">
              <span className="text-blue-600">{teamA?.name}: {teamAScore}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-red-600">{teamB?.name}: {teamBScore}</span>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Duration: {formatDuration(timerSeconds)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>Cancel</Button>
            <Button onClick={handleEndMatch} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm & End Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`,
};

// Create file with directories
function createFile(relativePath, content) {
  const fullPath = path.join(BASE_PATH, relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(`Created: ${relativePath}`);
}

// Main execution
console.log('Creating additional source files (Part 2)...\\n');

Object.entries(files).forEach(([filePath, content]) => {
  createFile(filePath, content);
});

console.log('\\n✅ Part 2 files created successfully!');
