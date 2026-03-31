'use client';

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
                  <Link href={`/admin/tournaments/${tournament._id}`}>
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
