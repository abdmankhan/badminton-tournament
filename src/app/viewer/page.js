'use client';

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
                  {tournament.status === 'completed' && tournament.winnerId && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span>Champion: {tournament.winnerName || 'Winner'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {tournament.numberOfTeams} teams
                    </div>
                  </div>
                  <Link href={`/viewer/tournaments/${tournament._id}`}>
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
