/**
 * AarogyaMitra AI — Sync Manager
 * Flushes offline data to the server when internet becomes available.
 * Dispatches 'offline-sync-complete' event for UI notification.
 */

import {
  getPendingSyncQueue,
  clearSyncedItems,
  incrementRetries,
  recordSyncTime,
  getUnsyncedChats,
  markChatsAsSynced,
  SyncQueueItem
} from "./offlineStorage";

// ─────────────────────────────────────────────────────────────────────────────
// SYNC RESULT
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL SYNC HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function syncChatItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function syncMedicineItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const res = await fetch("/api/medicines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(item.payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function syncProfileItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(item.payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SYNC FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to sync all pending offline data with the server.
 * Call this when `navigator.onLine` becomes true.
 */
export async function checkAndSync(userId?: string): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0, skipped: 0 };
  }

  const queue = getPendingSyncQueue();
  if (!queue.length) {
    return { synced: 0, failed: 0, skipped: 0 };
  }

  console.log(`[SyncManager] Syncing ${queue.length} pending items...`);

  const successIds: string[] = [];
  const failedIds: string[] = [];
  let skipped = 0;

  for (const item of queue) {
    // Skip items that have failed too many times
    if (item.retries >= 5) {
      skipped++;
      continue;
    }

    let success = false;

    switch (item.type) {
      case "chat":
        success = await syncChatItem(item);
        break;
      case "medicine":
        success = await syncMedicineItem(item);
        break;
      case "profile":
        success = await syncProfileItem(item);
        break;
      default:
        // Unknown type — skip
        skipped++;
        continue;
    }

    if (success) {
      successIds.push(item.id);
    } else {
      failedIds.push(item.id);
    }
  }

  // Update queue
  clearSyncedItems(successIds);
  if (failedIds.length) {
    incrementRetries(failedIds);
  }

  // Mark chats as synced in local cache
  if (userId && successIds.length) {
    const syncedChatIds = queue
      .filter((i) => successIds.includes(i.id) && i.type === "chat")
      .map((i) => i.id);

    if (syncedChatIds.length) {
      markChatsAsSynced(userId, syncedChatIds);
    }
  }

  recordSyncTime();

  const result: SyncResult = {
    synced: successIds.length,
    failed: failedIds.length,
    skipped
  };

  console.log(`[SyncManager] Sync complete:`, result);

  // Dispatch event for UI to show sync notification
  window.dispatchEvent(
    new CustomEvent("offline-sync-complete", { detail: result })
  );

  return result;
}

/**
 * Setup online/offline event listeners.
 * Call once on app initialization.
 */
export function setupNetworkListeners(userId?: string): () => void {
  const handleOnline = () => {
    console.log("[SyncManager] Network restored — starting sync...");
    checkAndSync(userId);
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
