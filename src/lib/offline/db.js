import Dexie from 'dexie';

export const db = new Dexie('BadmintonTournamentDB');

db.version(1).stores({
  tournaments: '_id, name, status, updatedAt',
  teams: '_id, tournamentId, name',
  matches: '_id, tournamentId, status, matchType',
  syncQueue: '++id, type, action, data, timestamp',
  settings: 'key',
});

// Helper to check if we're offline
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

// Save tournament data locally
export async function saveTournamentLocally(tournament) {
  await db.tournaments.put({
    ...tournament,
    _id: tournament._id || tournament.id,
    updatedAt: new Date().toISOString(),
  });
}

// Save team locally
export async function saveTeamLocally(team) {
  await db.teams.put({
    ...team,
    _id: team._id || team.id,
  });
}

// Save match locally
export async function saveMatchLocally(match) {
  await db.matches.put({
    ...match,
    _id: match._id || match.id,
  });
}

// Get tournament from local storage
export async function getLocalTournament(id) {
  return await db.tournaments.get(id);
}

// Get all local tournaments
export async function getLocalTournaments() {
  return await db.tournaments.toArray();
}

// Get teams for a tournament
export async function getLocalTeams(tournamentId) {
  return await db.teams.where('tournamentId').equals(tournamentId).toArray();
}

// Get matches for a tournament
export async function getLocalMatches(tournamentId) {
  return await db.matches.where('tournamentId').equals(tournamentId).toArray();
}

// Add to sync queue
export async function addToSyncQueue(type, action, data) {
  await db.syncQueue.add({
    type,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}

// Get pending sync items
export async function getPendingSyncItems() {
  return await db.syncQueue.toArray();
}

// Clear sync queue items
export async function clearSyncQueueItems(ids) {
  await db.syncQueue.bulkDelete(ids);
}

// Clear all local data
export async function clearLocalData() {
  await db.tournaments.clear();
  await db.teams.clear();
  await db.matches.clear();
  await db.syncQueue.clear();
}
