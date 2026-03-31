/**
 * Seed script for sample tournament data
 * Run: npm run seed (or: node scripts/seed.js)
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI environment variable');
  process.exit(1);
}

const PlayerSubSchema = new mongoose.Schema({
  name: String,
  avatarUrl: String,
  isSubstitute: { type: Boolean, default: false },
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

const TournamentSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'draft' },
  format: { type: String, default: 'round-robin-final' },
  numberOfTeams: Number,
  leagueSetCount: { type: Number, default: 1 },
  finalSetCount: { type: Number, default: 3 },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
}, { timestamps: true });

const TeamSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  name: String,
  players: [PlayerSubSchema],
  stats: { type: TeamStatsSchema, default: () => ({}) },
  rank: { type: Number, default: 0 },
}, { timestamps: true });

const Tournament = mongoose.model('Tournament', TournamentSchema);
const Team = mongoose.model('Team', TeamSchema);

const sampleTournament = {
  name: 'Spring Championship 2024',
  format: 'round-robin-final',
  leagueSetCount: 1,
  finalSetCount: 3,
  teams: [
    {
      name: 'Thunder Smashers',
      players: [
        { name: 'Rahul Sharma', isSubstitute: false },
        { name: 'Vikram Patel', isSubstitute: false },
        { name: 'Amit Kumar', isSubstitute: true },
      ],
    },
    {
      name: 'Net Warriors',
      players: [
        { name: 'Arun Reddy', isSubstitute: false },
        { name: 'Suresh Nair', isSubstitute: false },
        { name: 'Kiran Das', isSubstitute: true },
      ],
    },
    {
      name: 'Shuttle Kings',
      players: [
        { name: 'Deepak Singh', isSubstitute: false },
        { name: 'Mohan Rao', isSubstitute: false },
      ],
    },
    {
      name: 'Racket Rebels',
      players: [
        { name: 'Pradeep Verma', isSubstitute: false },
        { name: 'Sanjay Gupta', isSubstitute: false },
        { name: 'Ravi Prakash', isSubstitute: true },
      ],
    },
    {
      name: 'Court Crushers',
      players: [
        { name: 'Nitin Mehta', isSubstitute: false },
        { name: 'Ajay Khanna', isSubstitute: false },
      ],
    },
    {
      name: 'Birdie Blazers',
      players: [
        { name: 'Rohit Joshi', isSubstitute: false },
        { name: 'Manish Agarwal', isSubstitute: false },
        { name: 'Varun Kapoor', isSubstitute: true },
      ],
    },
  ],
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing existing data...');
    await Tournament.deleteMany({});
    await Team.deleteMany({});

    console.log('Creating tournament...');
    const tournament = await Tournament.create({
      name: sampleTournament.name,
      format: sampleTournament.format,
      numberOfTeams: sampleTournament.teams.length,
      leagueSetCount: sampleTournament.leagueSetCount,
      finalSetCount: sampleTournament.finalSetCount,
      status: 'draft',
    });

    console.log('Creating teams...');
    const teamIds = [];
    for (const teamData of sampleTournament.teams) {
      const team = await Team.create({
        tournamentId: tournament._id,
        name: teamData.name,
        players: teamData.players,
        stats: {},
      });
      teamIds.push(team._id);
      console.log('  Created team:', team.name);
    }

    tournament.teams = teamIds;
    await tournament.save();

    console.log('');
    console.log('Seed completed!');
    console.log('Tournament ID:', tournament._id.toString());
    console.log('Teams created:', teamIds.length);
    console.log('');
    console.log('Start the app with: npm run dev');

  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
