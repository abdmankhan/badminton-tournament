"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  Eye,
  Shield,
  Wifi,
  WifiOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTournamentStore } from "@/stores/tournamentStore";
import { clearLocalData } from "@/lib/offline/db";
import { toast } from "sonner";

export default function Home() {
  const isOnline = useOnlineStatus();
  const setIsAdmin = useTournamentStore((state) => state.setIsAdmin);
  const [clearing, setClearing] = useState(false);

  async function handleClearCache() {
    setClearing(true);
    try {
      await clearLocalData();
      toast.success("Local cache cleared! Refreshing...");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error("Failed to clear cache");
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl w-full space-y-8">
        {/* Online Status + Clear Cache */}
        <div className="flex justify-center items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isOnline ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {isOnline ? "Online" : "Offline Mode"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCache}
            disabled={clearing}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {clearing ? "Clearing..." : "Clear Cache"}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Badminton Tournament
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete tournament management system for doubles badminton. Create
            tournaments, score matches live, track standings, and view player
            statistics.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Users className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Team Management</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Live Scoring</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Offline Support</p>
          </div>
          <div className="p-4 rounded-lg bg-white shadow-sm">
            <Eye className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Leaderboards</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-6 pt-8">
          <Card className="border-2 hover:border-primary transition-colors">
            <Link href="/admin" onClick={() => setIsAdmin(true)}>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin Mode</CardTitle>
                <CardDescription>
                  Full access to manage tournaments
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>✓ Create & manage tournaments</li>
                  <li>✓ Add teams and players</li>
                  <li>✓ Score matches live</li>
                  <li>✓ Undo/correct scores</li>
                  <li>✓ Complete tournament control</li>
                </ul>
                <Button className="w-full" size="lg">
                  Enter as Admin
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-colors">
            <Link href="/viewer" onClick={() => setIsAdmin(false)}>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">Viewer Mode</CardTitle>
                <CardDescription>
                  Watch tournaments and view stats
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>✓ View live matches</li>
                  <li>✓ See team standings</li>
                  <li>✓ Track player statistics</li>
                  <li>✓ Follow tournament progress</li>
                  <li>✓ Read-only access</li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full border-blue-500 text-blue-500 hover:bg-blue-50"
                  size="lg"
                >
                  Enter as Viewer
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8">
          <p>Works offline • Auto-syncs when connected • Mobile-friendly</p>
        </footer>
      </div>
    </main>
  );
}
