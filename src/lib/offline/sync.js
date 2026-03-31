import { db, getPendingSyncItems, clearSyncQueueItems, isOffline } from './db';

// Sync pending changes to server
export async function syncToServer() {
  if (isOffline()) {
    console.log('Offline - skipping sync');
    return { success: false, reason: 'offline' };
  }

  const pendingItems = await getPendingSyncItems();
  if (pendingItems.length === 0) {
    return { success: true, synced: 0 };
  }

  const syncedIds = [];
  const errors = [];

  for (const item of pendingItems) {
    try {
      const endpoint = getEndpointForSync(item.type, item.action);
      const response = await fetch(endpoint, {
        method: getMethodForAction(item.action),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (response.ok) {
        syncedIds.push(item.id);
      } else {
        errors.push({ id: item.id, error: await response.text() });
      }
    } catch (error) {
      errors.push({ id: item.id, error: error.message });
    }
  }

  if (syncedIds.length > 0) {
    await clearSyncQueueItems(syncedIds);
  }

  return {
    success: errors.length === 0,
    synced: syncedIds.length,
    errors,
  };
}

function getEndpointForSync(type, action) {
  const baseUrl = '/api';
  const endpoints = {
    tournament: {
      create: `${baseUrl}/tournaments`,
      update: `${baseUrl}/tournaments`,
    },
    team: {
      create: `${baseUrl}/teams`,
      update: `${baseUrl}/teams`,
    },
    match: {
      update: `${baseUrl}/matches`,
      score: `${baseUrl}/matches/score`,
    },
  };
  return endpoints[type]?.[action] || `${baseUrl}/${type}s`;
}

function getMethodForAction(action) {
  const methods = {
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
    score: 'POST',
  };
  return methods[action] || 'POST';
}

// Initialize sync listener
export function initSyncListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    console.log('Back online - syncing...');
    await syncToServer();
  });
}
