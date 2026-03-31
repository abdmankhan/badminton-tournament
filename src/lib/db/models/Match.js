import mongoose from 'mongoose';

const SetScoreSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isComplete: { type: Boolean, default: false },
});

const TimerStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['stopped', 'running', 'paused'],
    default: 'stopped',
  },
  elapsedSeconds: { type: Number, default: 0 },
  lastStartedAt: { type: Date, default: null },
});

const ScoreEventSchema = new mongoose.Schema({
  actorType: {
    type: String,
    enum: ['player', 'team'],
    required: true,
  },
  playerId: {
    type: String,
    default: null,
  },
  playerName: {
    type: String,
    default: null,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamName: {
    type: String,
    default: null,
  },
  actionType: {
    type: String,
    enum: ['+1', '-1'],
    required: true,
  },
  setNumber: {
    type: Number,
    default: 1,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  undone: {
    type: Boolean,
    default: false,
  },
});

const MatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  matchType: {
    type: String,
    enum: ['league', 'semifinal', 'final'],
    default: 'league',
  },
  matchNumber: {
    type: Number,
    default: 1,
  },
  setCount: {
    type: Number,
    default: 1,
  },
  currentSet: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'paused', 'completed'],
    default: 'scheduled',
  },
  sets: [SetScoreSchema],
  timerState: {
    type: TimerStateSchema,
    default: () => ({}),
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  events: [ScoreEventSchema],
  startedAt: {
    type: Date,
    default: null,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  durationMinutes: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Calculate current scores from non-undone events
MatchSchema.methods.calculateScores = function() {
  const activeEvents = this.events.filter(e => !e.undone);
  const scores = {};
  const playerCredits = {};
  
  for (const event of activeEvents) {
    const teamKey = event.teamId.toString();
    if (!scores[teamKey]) {
      scores[teamKey] = {};
    }
    if (!scores[teamKey][event.setNumber]) {
      scores[teamKey][event.setNumber] = 0;
    }
    
    const delta = event.actionType === '+1' ? 1 : -1;
    scores[teamKey][event.setNumber] += delta;
    
    if (event.actorType === 'player' && event.playerId) {
      if (!playerCredits[event.playerId]) {
        playerCredits[event.playerId] = 0;
      }
      playerCredits[event.playerId] += delta;
    }
  }
  
  return { scores, playerCredits };
};

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
