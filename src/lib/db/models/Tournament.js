import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  format: {
    type: String,
    enum: ['round-robin-final', 'round-robin-semifinal-final', 'knockout', 'playoffs'],
    default: 'round-robin-final',
  },
  numberOfTeams: {
    type: Number,
    required: true,
    min: 2,
  },
  leagueSetCount: {
    type: Number,
    default: 1,
  },
  finalSetCount: {
    type: Number,
    default: 3,
  },
  pointsPerWin: {
    type: Number,
    default: 2,
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  }],
  // Playoffs-specific tracking
  playoffsGenerated: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);
