import mongoose from "mongoose";

const PlayerSubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  photoUrl: {
    type: String,
    default: null,
  },
  isSubstitute: {
    type: Boolean,
    default: false,
  },
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

const TeamSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    players: [PlayerSubSchema],
    stats: {
      type: TeamStatsSchema,
      default: () => ({}),
    },
    rank: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for main players (non-substitutes)
TeamSchema.virtual("mainPlayers").get(function () {
  return this.players.filter((p) => !p.isSubstitute);
});

// Virtual for substitutes
TeamSchema.virtual("substitutes").get(function () {
  return this.players.filter((p) => p.isSubstitute);
});

export default mongoose.models.Team || mongoose.model("Team", TeamSchema);
