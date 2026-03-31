"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Users, Image, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateId, getInitials } from "@/lib/utils";
import {
  saveTournamentLocally,
  saveTeamLocally,
  addToSyncQueue,
  isOffline,
} from "@/lib/offline/db";

export default function NewTournament() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [tournament, setTournament] = useState({
    name: "",
    format: "round-robin-final",
    leagueSetCount: 1,
    finalSetCount: 3,
  });

  const [teams, setTeams] = useState([
    {
      id: generateId(),
      name: "",
      photoUrl: "",
      players: [
        { name: "", photoUrl: "" },
        { name: "", photoUrl: "" },
      ],
      substitutes: [],
    },
    {
      id: generateId(),
      name: "",
      photoUrl: "",
      players: [
        { name: "", photoUrl: "" },
        { name: "", photoUrl: "" },
      ],
      substitutes: [],
    },
  ]);

  const addTeam = () => {
    setTeams([
      ...teams,
      {
        id: generateId(),
        name: "",
        photoUrl: "",
        players: [
          { name: "", photoUrl: "" },
          { name: "", photoUrl: "" },
        ],
        substitutes: [],
      },
    ]);
  };

  const removeTeam = (teamId) => {
    if (teams.length <= 2) {
      toast.error("Minimum 2 teams required");
      return;
    }
    setTeams(teams.filter((t) => t.id !== teamId));
  };

  const updateTeam = (teamId, field, value) => {
    setTeams(
      teams.map((t) => (t.id === teamId ? { ...t, [field]: value } : t)),
    );
  };

  const updatePlayer = (teamId, playerIndex, field, value) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        const newPlayers = [...t.players];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          [field]: value,
        };
        return { ...t, players: newPlayers };
      }),
    );
  };

  const addSubstitute = (teamId) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          substitutes: [...t.substitutes, { name: "", photoUrl: "" }],
        };
      }),
    );
  };

  const updateSubstitute = (teamId, subIndex, field, value) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        const newSubs = [...t.substitutes];
        newSubs[subIndex] = { ...newSubs[subIndex], [field]: value };
        return { ...t, substitutes: newSubs };
      }),
    );
  };

  const removeSubstitute = (teamId, subIndex) => {
    setTeams(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          substitutes: t.substitutes.filter((_, i) => i !== subIndex),
        };
      }),
    );
  };

  const validateForm = () => {
    if (!tournament.name.trim()) {
      toast.error("Tournament name is required");
      return false;
    }

    for (const team of teams) {
      if (!team.name.trim()) {
        toast.error("All teams must have a name");
        return false;
      }
      for (const player of team.players) {
        if (!player.name.trim()) {
          toast.error(`Team "${team.name}" must have 2 players`);
          return false;
        }
      }
    }

    const teamNames = teams.map((t) => t.name.toLowerCase());
    if (new Set(teamNames).size !== teamNames.length) {
      toast.error("Team names must be unique");
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
        status: "draft",
        teams: teams.map((t) => ({
          name: t.name,
          photoUrl: t.photoUrl || null,
          players: [
            ...t.players.map((p) => ({
              name: p.name,
              photoUrl: p.photoUrl || null,
              isSubstitute: false,
            })),
            ...t.substitutes
              .filter((s) => s.name.trim())
              .map((s) => ({
                name: s.name,
                photoUrl: s.photoUrl || null,
                isSubstitute: true,
              })),
          ],
        })),
      };

      if (isOffline()) {
        // Save locally
        const localId = generateId();
        const localTournament = {
          ...tournamentData,
          _id: localId,
          createdAt: new Date().toISOString(),
        };
        await saveTournamentLocally(localTournament);
        await addToSyncQueue("tournament", "create", localTournament);
        toast.success("Tournament saved locally (will sync when online)");
        router.push(`/admin/tournaments/${localId}`);
      } else {
        // Save to server
        const res = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tournamentData),
        });

        if (!res.ok) {
          throw new Error("Failed to create tournament");
        }

        const data = await res.json();
        toast.success("Tournament created successfully");
        router.push(`/admin/tournaments/${data._id}`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to create tournament");
    } finally {
      setSaving(false);
    }
  };

  // Photo preview component
  const PhotoPreview = ({ url, name, size = "md" }) => {
    const sizeClasses = {
      sm: "w-8 h-8 text-xs",
      md: "w-12 h-12 text-sm",
      lg: "w-16 h-16 text-lg",
    };

    if (url) {
      return (
        <img
          src={url}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200`}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      );
    }

    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border-2 border-gray-200`}
      >
        {name ? getInitials(name) : <Camera className="w-4 h-4" />}
      </div>
    );
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
              <CardDescription>
                Basic information about your tournament
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  value={tournament.name}
                  onChange={(e) =>
                    setTournament({ ...tournament, name: e.target.value })
                  }
                  placeholder="e.g., Spring Championship 2024"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Format</Label>
                  <Select
                    value={tournament.format}
                    onValueChange={(v) =>
                      setTournament({ ...tournament, format: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin-final">
                        Round Robin + Final
                      </SelectItem>
                      <SelectItem value="round-robin-semifinal-final">
                        Round Robin + Semis + Final
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>League Sets per Match</Label>
                  <Select
                    value={tournament.leagueSetCount.toString()}
                    onValueChange={(v) =>
                      setTournament({
                        ...tournament,
                        leagueSetCount: parseInt(v),
                      })
                    }
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
                    onValueChange={(v) =>
                      setTournament({
                        ...tournament,
                        finalSetCount: parseInt(v),
                      })
                    }
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
                  <CardDescription>
                    Add teams and their players with optional photos
                  </CardDescription>
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
                    <div className="flex items-center gap-4 flex-1 mr-4">
                      <PhotoPreview
                        url={team.photoUrl}
                        name={team.name}
                        size="lg"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label>Team {teamIndex + 1} Name</Label>
                          <Input
                            value={team.name}
                            onChange={(e) =>
                              updateTeam(team.id, "name", e.target.value)
                            }
                            placeholder="Enter team name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Image className="w-3 h-3" /> Team Photo URL
                            (optional)
                          </Label>
                          <Input
                            value={team.photoUrl}
                            onChange={(e) =>
                              updateTeam(team.id, "photoUrl", e.target.value)
                            }
                            placeholder="https://example.com/team-photo.jpg"
                            className="text-sm"
                          />
                        </div>
                      </div>
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
                    {/* Player 1 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <PhotoPreview
                        url={team.players[0].photoUrl}
                        name={team.players[0].name}
                        size="md"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs">Player 1</Label>
                          <Input
                            value={team.players[0].name}
                            onChange={(e) =>
                              updatePlayer(team.id, 0, "name", e.target.value)
                            }
                            placeholder="Player name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Photo URL
                          </Label>
                          <Input
                            value={team.players[0].photoUrl}
                            onChange={(e) =>
                              updatePlayer(
                                team.id,
                                0,
                                "photoUrl",
                                e.target.value,
                              )
                            }
                            placeholder="https://..."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <PhotoPreview
                        url={team.players[1].photoUrl}
                        name={team.players[1].name}
                        size="md"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs">Player 2</Label>
                          <Input
                            value={team.players[1].name}
                            onChange={(e) =>
                              updatePlayer(team.id, 1, "name", e.target.value)
                            }
                            placeholder="Player name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Photo URL
                          </Label>
                          <Input
                            value={team.players[1].photoUrl}
                            onChange={(e) =>
                              updatePlayer(
                                team.id,
                                1,
                                "photoUrl",
                                e.target.value,
                              )
                            }
                            placeholder="https://..."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Substitutes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm text-muted-foreground">
                        Substitutes (optional)
                      </Label>
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
                      <div
                        key={subIndex}
                        className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded"
                      >
                        <PhotoPreview
                          url={sub.photoUrl}
                          name={sub.name}
                          size="sm"
                        />
                        <Input
                          value={sub.name}
                          onChange={(e) =>
                            updateSubstitute(
                              team.id,
                              subIndex,
                              "name",
                              e.target.value,
                            )
                          }
                          placeholder="Substitute name"
                          className="flex-1"
                        />
                        <Input
                          value={sub.photoUrl}
                          onChange={(e) =>
                            updateSubstitute(
                              team.id,
                              subIndex,
                              "photoUrl",
                              e.target.value,
                            )
                          }
                          placeholder="Photo URL"
                          className="flex-1 text-xs"
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
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Tournament"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
