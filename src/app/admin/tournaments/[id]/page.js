'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Trophy, Users, Calendar, Settings, BarChart3, Award } from 'lucide-react';
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
  const { id } = params;
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
      const res = await fetch(`/api/tournaments/${id}`);
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
        const res = await fetch(`/api/tournaments/${id}/generate-fixtures`, {
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

  async function handleGeneratePlayoffs() {
    if (!tournament || teams.length < 4) {
      toast.error('Need at least 4 teams for playoffs');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${id}/generate-fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-playoffs' }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success('Playoffs generated successfully! 🏆');
        loadTournamentData();
      } else {
        throw new Error(data.error || 'Failed to generate playoffs');
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
  const finalMatch = matches.find(m => m.matchType === 'final');
  const completedMatches = leagueMatches.filter(m => m.status === 'completed');
  const liveMatch = matches.find(m => m.status === 'live');
  const allLeagueCompleted = leagueMatches.length > 0 && completedMatches.length === leagueMatches.length;

  // Playoffs matches
  const qualifier1 = matches.find(m => m.matchType === 'qualifier1');
  const eliminator = matches.find(m => m.matchType === 'eliminator');
  const qualifier2 = matches.find(m => m.matchType === 'qualifier2');
  const isPlayoffs = tournament.format === 'playoffs';
  const playoffsGenerated = tournament.playoffsGenerated;

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
                <Link href={`/admin/tournaments/${id}/matches/${liveMatch._id || liveMatch.id}`}>
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
            <TabsTrigger value="players">
              <Award className="h-4 w-4 mr-2" />
              Players
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches">
            {/* League Stage Completion Banner - Show Generate Playoffs for playoffs format */}
            {allLeagueCompleted && !playoffsGenerated && isPlayoffs && (
              <Card className="mb-6 border-2 border-purple-500 bg-purple-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-3 text-purple-800">
                    <Trophy className="h-6 w-6" />
                    <span className="font-semibold">All league matches completed! Ready to generate IPL-style playoffs.</span>
                  </div>
                  <div className="flex justify-center mt-3">
                    <Button onClick={handleGeneratePlayoffs} className="bg-purple-600 hover:bg-purple-700">
                      <Trophy className="h-4 w-4 mr-2" />
                      Generate Playoffs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Playoffs Section */}
            {isPlayoffs && playoffsGenerated && (
              <Card className="mb-6 border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-purple-800">🏆 IPL-Style Playoffs</CardTitle>
                  </div>
                  <CardDescription>Top 4 teams battle for the championship</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Playoffs bracket visualization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Qualifier 1 */}
                      {qualifier1 && (
                        <PlayoffMatchCard 
                          match={qualifier1} 
                          teams={teams} 
                          title="Qualifier 1"
                          subtitle="1st vs 2nd • Winner → Final"
                          tournamentId={id}
                          color="blue"
                        />
                      )}
                      
                      {/* Eliminator */}
                      {eliminator && (
                        <PlayoffMatchCard 
                          match={eliminator} 
                          teams={teams} 
                          title="Eliminator"
                          subtitle="3rd vs 4th • Loser OUT"
                          tournamentId={id}
                          color="red"
                        />
                      )}
                    </div>
                    
                    {/* Qualifier 2 */}
                    {qualifier2 && (
                      <PlayoffMatchCard 
                        match={qualifier2} 
                        teams={teams} 
                        title="Qualifier 2"
                        subtitle="Q1 Loser vs Eliminator Winner"
                        tournamentId={id}
                        color="orange"
                        isPending={qualifier2.status === 'pending'}
                      />
                    )}
                    
                    {/* Final */}
                    {finalMatch && (
                      <PlayoffMatchCard 
                        match={finalMatch} 
                        teams={teams} 
                        title="🏆 GRAND FINAL"
                        subtitle="Q1 Winner vs Q2 Winner"
                        tournamentId={id}
                        color="gold"
                        isFinal={true}
                        isPending={finalMatch.status === 'pending'}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Match Banner (for non-playoffs format) */}
            {finalMatch && !isPlayoffs && (
              <Card className="mb-6 border-2 border-yellow-500 bg-yellow-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                    <CardTitle className="text-yellow-800">🏆 FINAL MATCH</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const teamAFinal = teams.find(t => (t._id || t.id)?.toString() === (finalMatch.teamA?._id || finalMatch.teamA)?.toString());
                    const teamBFinal = teams.find(t => (t._id || t.id)?.toString() === (finalMatch.teamB?._id || finalMatch.teamB)?.toString());
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold">{teamAFinal?.name || 'Finalist 1'}</span>
                          <span className="text-muted-foreground text-lg">vs</span>
                          <span className="text-lg font-bold">{teamBFinal?.name || 'Finalist 2'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {finalMatch.status === 'completed' && (
                            <div className="text-lg font-bold">
                              {finalMatch.sets?.map((s, i) => (
                                <span key={i} className="mx-1">
                                  {s.teamAScore}-{s.teamBScore}
                                </span>
                              ))}
                            </div>
                          )}
                          <Badge variant={
                            finalMatch.status === 'completed' ? 'success' :
                            finalMatch.status === 'live' ? 'live' :
                            'secondary'
                          }>
                            {finalMatch.status}
                          </Badge>
                          {finalMatch.status !== 'completed' && (
                            <Link href={`/admin/tournaments/${id}/matches/${finalMatch._id || finalMatch.id}`}>
                              <Button variant={finalMatch.status === 'live' ? 'default' : 'warning'}>
                                {finalMatch.status === 'live' ? 'Continue Final' : 'Start Final'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* League Stage Completion Banner for round-robin-final format */}
            {allLeagueCompleted && !finalMatch && tournament.format === 'round-robin-final' && (
              <Card className="mb-6 border-2 border-green-500 bg-green-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center gap-3 text-green-800">
                    <Trophy className="h-6 w-6" />
                    <span className="font-semibold">All league matches completed! Final match will be generated automatically.</span>
                  </div>
                  <p className="text-center text-sm text-green-600 mt-2">
                    Refresh the page to see the final match.
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* League Matches */}
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
                              <Link href={`/admin/tournaments/${id}/matches/${match._id || match.id}`}>
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
                      {standings.map((s, idx) => {
                        // For playoffs: highlight top 4, for regular: highlight top 2
                        const qualifiesForPlayoffs = isPlayoffs ? idx < 4 : idx < 2;
                        const rowClass = qualifiesForPlayoffs 
                          ? (idx < 2 ? 'bg-green-100' : 'bg-green-50') 
                          : '';
                        return (
                          <tr key={s.teamId} className={`border-b ${rowClass}`}>
                            <td className="py-3 px-2 font-medium">
                              {s.rank}
                              {isPlayoffs && idx < 4 && (
                                <span className="ml-1 text-xs">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4️⃣'}
                                </span>
                              )}
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>P = Played, W = Won, L = Lost, Pts = League Points, PF = Points For, PA = Points Against, PD = Point Diff, TES = Tournament Efficiency Score</p>
                  {isPlayoffs ? (
                    <p className="mt-1 text-purple-600 font-medium">🏆 Top 4 teams qualify for IPL-style playoffs</p>
                  ) : (
                    <p className="mt-1">Top 2 teams (highlighted) qualify for the final.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team, idx) => {
                // Find team's position in standings for highlighting
                const standingIdx = standings.findIndex(s => s.teamId?.toString() === (team._id || team.id)?.toString());
                const isTop4 = isPlayoffs && standingIdx >= 0 && standingIdx < 4;
                const rankBadge = isPlayoffs && standingIdx >= 0 && standingIdx < 4 
                  ? ['🥇', '🥈', '🥉', '4️⃣'][standingIdx] 
                  : null;
                
                return (
                  <Card key={team._id || team.id} className={isTop4 ? 'ring-2 ring-green-400 bg-green-50/50' : ''}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {rankBadge && <span className="text-sm">{rankBadge}</span>}
                        {team.name}
                      </CardTitle>
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
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="players">
            <PlayerLeaderboard teams={teams} matches={matches} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Inline Player Leaderboard Component
function PlayerLeaderboard({ teams, matches }) {
  const playerStats = [];

  // Initialize all players from teams
  for (const team of teams || []) {
    for (const player of team.players || []) {
      const playerId = player._id || player.name;
      playerStats.push({
        id: playerId,
        name: player.name,
        team: team.name,
        teamId: team._id || team.id,
        totalCredits: 0,
        matchesPlayed: 0,
        matchesWon: 0,
      });
    }
  }

  // Aggregate credits from completed matches
  for (const match of matches || []) {
    if (match.status !== "completed") continue;
    const winnerId = match.winnerId?._id || match.winnerId;
    const events = match.events || [];
    const playerCreditsInMatch = {};

    for (const event of events) {
      if (event.undone) continue;
      if (event.actorType === "player" && event.playerId) {
        const delta = event.actionType === "+1" ? 1 : -1;
        if (!playerCreditsInMatch[event.playerId]) {
          playerCreditsInMatch[event.playerId] = { credits: 0, teamId: event.teamId };
        }
        playerCreditsInMatch[event.playerId].credits += delta;
      }
    }

    for (const [playerId, data] of Object.entries(playerCreditsInMatch)) {
      const stat = playerStats.find(p => p.id === playerId || p.id?.toString() === playerId);
      if (stat) {
        stat.totalCredits += Math.max(0, data.credits);
        stat.matchesPlayed += 1;
        if (data.teamId === winnerId || data.teamId?.toString() === winnerId?.toString()) {
          stat.matchesWon += 1;
        }
      }
    }
  }

  // Sort by total credits
  playerStats.sort((a, b) => b.totalCredits - a.totalCredits);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Player Leaderboard
        </CardTitle>
        <CardDescription>
          Individual player performance based on credited points
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Player</th>
                <th className="text-left py-2 px-2">Team</th>
                <th className="text-center py-2 px-2">Credits</th>
                <th className="text-center py-2 px-2">Matches</th>
                <th className="text-center py-2 px-2">Wins</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((player, index) => (
                <tr key={player.id} className={`border-b ${index < 3 ? "bg-yellow-50" : ""}`}>
                  <td className="py-2 px-2 font-medium">
                    {index + 1}
                    {index === 0 && <Trophy className="inline h-4 w-4 ml-1 text-yellow-500" />}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {player.name?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium">{player.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{player.team}</td>
                  <td className="py-2 px-2 text-center font-bold">{player.totalCredits}</td>
                  <td className="py-2 px-2 text-center">{player.matchesPlayed}</td>
                  <td className="py-2 px-2 text-center">{player.matchesWon}</td>
                </tr>
              ))}
              {playerStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No players registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Playoff Match Card Component
function PlayoffMatchCard({ match, teams, title, subtitle, tournamentId, color, isFinal, isPending }) {
  const teamA = teams.find(t => (t._id || t.id)?.toString() === (match.teamA?._id || match.teamA)?.toString());
  const teamB = teams.find(t => (t._id || t.id)?.toString() === (match.teamB?._id || match.teamB)?.toString());
  
  const colorClasses = {
    blue: 'border-blue-400 bg-blue-50',
    red: 'border-red-400 bg-red-50',
    orange: 'border-orange-400 bg-orange-50',
    gold: 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg',
  };
  
  const headerColors = {
    blue: 'text-blue-700',
    red: 'text-red-700',
    orange: 'text-orange-700',
    gold: 'text-yellow-700',
  };
  
  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[color] || 'border-gray-300 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className={`font-bold ${headerColors[color] || 'text-gray-700'}`}>{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant={
          match.status === 'completed' ? 'success' :
          match.status === 'live' ? 'destructive' :
          match.status === 'pending' ? 'outline' :
          'secondary'
        } className={match.status === 'live' ? 'animate-pulse' : ''}>
          {match.status === 'pending' ? 'Waiting' : match.status}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className={`font-semibold ${match.winnerId?.toString() === teamA?._id?.toString() ? 'text-green-600' : ''}`}>
              {isPending ? 'TBD' : (teamA?.name || 'TBD')}
            </div>
            {match.status === 'completed' && (
              <div className="text-xs text-muted-foreground">
                {match.sets?.map(s => s.teamAScore).join(' - ')}
              </div>
            )}
          </div>
          <span className="text-muted-foreground font-bold">vs</span>
          <div className="text-center">
            <div className={`font-semibold ${match.winnerId?.toString() === teamB?._id?.toString() ? 'text-green-600' : ''}`}>
              {isPending ? 'TBD' : (teamB?.name || 'TBD')}
            </div>
            {match.status === 'completed' && (
              <div className="text-xs text-muted-foreground">
                {match.sets?.map(s => s.teamBScore).join(' - ')}
              </div>
            )}
          </div>
        </div>
        
        {match.status === 'scheduled' && !isPending && (
          <Link href={`/admin/tournaments/${tournamentId}/matches/${match._id || match.id}`}>
            <Button size="sm" variant={isFinal ? 'warning' : 'default'}>
              {isFinal ? '🏆 Start Final' : 'Start'}
            </Button>
          </Link>
        )}
        {match.status === 'live' && (
          <Link href={`/admin/tournaments/${tournamentId}/matches/${match._id || match.id}`}>
            <Button size="sm" variant="destructive">
              Continue
            </Button>
          </Link>
        )}
        {match.status === 'completed' && (
          <div className="text-sm font-medium text-green-600">
            ✓ {teams.find(t => (t._id || t.id)?.toString() === match.winnerId?.toString())?.name} won
          </div>
        )}
      </div>
    </div>
  );
}
