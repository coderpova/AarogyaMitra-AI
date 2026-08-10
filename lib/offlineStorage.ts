/**
 * AarogyaMitra AI — Offline Storage Layer
 * LocalStorage-based cache for all user data:
 * profile, chatHistory, medicines, reports, settings, schemes
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CachedChat {
  id: string;
  userId: string;
  message: string;
  reply: string;
  timestamp: number;
  synced: boolean;
  conversationId?: string;
  title?: string;
  isArchived?: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: "chat" | "medicine" | "appointment" | "profile" | "report" | "delete_chat" | "archive_chat";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  CHAT_HISTORY:     (uid: string) => `aarogya_chats_${uid}`,
  USER_PROFILE:     "aarogya_profile",
  MEDICINES:        "aarogya_medicines",
  REPORTS:          "aarogya_reports",
  SETTINGS:         "aarogya_settings",
  SCHEMES:          "aarogya_schemes",
  SYNC_QUEUE:       "aarogya_sync_queue",
  LAST_SYNC_TIME:   "aarogya_last_sync",
};

// ─────────────────────────────────────────────────────────────────────────────
// SAFE LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[OfflineStorage] LocalStorage write failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a single chat message to local cache.
 */
export function saveOfflineChat(
  userId: string,
  message: string,
  reply: string,
  conversationId?: string,
  title?: string
): CachedChat {
  const chat: CachedChat = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    message,
    reply,
    timestamp: Date.now(),
    synced: false,
    conversationId,
    title,
    isArchived: false
  };

  const existing = safeGet<CachedChat[]>(KEYS.CHAT_HISTORY(userId), []);
  const updated = [...existing, chat].slice(-200); // Keep last 200 chats
  safeSet(KEYS.CHAT_HISTORY(userId), updated);

  // Add to sync queue
  addToSyncQueue({
    type: "chat",
    payload: { userId, message, reply, timestamp: chat.timestamp, conversationId, title }
  });

  return chat;
}

/**
 * Get all cached chats for a user.
 */
export function getOfflineChats(userId: string): CachedChat[] {
  return safeGet<CachedChat[]>(KEYS.CHAT_HISTORY(userId), []);
}

/**
 * Mark chats as synced after successful server sync.
 */
export function markChatsAsSynced(userId: string, chatIds: string[]): void {
  const existing = safeGet<CachedChat[]>(KEYS.CHAT_HISTORY(userId), []);
  const updated = existing.map((c) =>
    chatIds.includes(c.id) ? { ...c, synced: true } : c
  );
  safeSet(KEYS.CHAT_HISTORY(userId), updated);
}

/**
 * Get unsynced chats for a user.
 */
export function getUnsyncedChats(userId: string): CachedChat[] {
  return getOfflineChats(userId).filter((c) => !c.synced);
}

/**
 * Permanently delete a conversation from local cache and sync queue.
 */
export function deleteOfflineConversation(
  userId: string,
  conversationId: string
): void {
  // 1. Remove from local chat history cache
  const key = KEYS.CHAT_HISTORY(userId);
  const existing = safeGet<CachedChat[]>(key, []);
  const updated = existing.filter((c) => {
    const convoId = c.conversationId || "legacy";
    return convoId !== conversationId;
  });
  safeSet(key, updated);

  // 2. Remove pending chats for this conversation from the sync queue
  const queueKey = KEYS.SYNC_QUEUE;
  const queue = safeGet<SyncQueueItem[]>(queueKey, []);
  const updatedQueue = queue.filter((item) => {
    if (item.type !== "chat") return true;
    const itemConvoId = (item.payload.conversationId as string) || "legacy";
    return itemConvoId !== conversationId;
  });

  // 3. Queue the delete action if offline
  if (typeof window !== "undefined" && !navigator.onLine) {
    updatedQueue.push({
      id: `delete_${conversationId}_${Date.now()}`,
      type: "delete_chat",
      payload: { conversationId },
      timestamp: Date.now(),
      retries: 0,
    });
  }

  safeSet(queueKey, updatedQueue);
}

/**
 * Archive a conversation in local cache and queue sync.
 */
export function archiveOfflineConversation(
  userId: string,
  conversationId: string,
  isArchived: boolean = true
): void {
  // 1. Update local cache
  const key = KEYS.CHAT_HISTORY(userId);
  const existing = safeGet<CachedChat[]>(key, []);
  const updated = existing.map((c) => {
    const convoId = c.conversationId || "legacy";
    if (convoId === conversationId) {
      return { ...c, isArchived };
    }
    return c;
  });
  safeSet(key, updated);

  // 2. Queue archive operation if offline
  if (typeof window !== "undefined" && !navigator.onLine) {
    const queueKey = KEYS.SYNC_QUEUE;
    const queue = safeGet<SyncQueueItem[]>(queueKey, []);
    
    // Check if we already have an archive request for this conversation, if so replace it
    const updatedQueue = queue.filter(
      (item) => !(item.type === "archive_chat" && item.payload.conversationId === conversationId)
    );
    
    updatedQueue.push({
      id: `archive_${conversationId}_${Date.now()}`,
      type: "archive_chat",
      payload: { conversationId, isArchived },
      timestamp: Date.now(),
      retries: 0
    });
    safeSet(queueKey, updatedQueue);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export function cacheUserProfile(profile: Record<string, unknown>): void {
  safeSet(KEYS.USER_PROFILE, { ...profile, _cachedAt: Date.now() });
}

export function getCachedProfile(): Record<string, unknown> | null {
  return safeGet<Record<string, unknown> | null>(KEYS.USER_PROFILE, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINES
// ─────────────────────────────────────────────────────────────────────────────

export function cacheMedicines(medicines: unknown[]): void {
  safeSet(KEYS.MEDICINES, { data: medicines, _cachedAt: Date.now() });
}

export function getCachedMedicines(): unknown[] {
  const stored = safeGet<{ data: unknown[] } | null>(KEYS.MEDICINES, null);
  return stored?.data ?? [];
}

export function saveMedicineOffline(medicine: Record<string, unknown>): void {
  const cached = getCachedMedicines() as Record<string, unknown>[];
  const updated = [
    ...cached,
    { ...medicine, _offlineId: `med_${Date.now()}`, _pendingSync: true }
  ];
  cacheMedicines(updated);
  addToSyncQueue({ type: "medicine", payload: medicine });
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export function cacheReports(reports: unknown[]): void {
  safeSet(KEYS.REPORTS, { data: reports, _cachedAt: Date.now() });
}

export function getCachedReports(): unknown[] {
  const stored = safeGet<{ data: unknown[] } | null>(KEYS.REPORTS, null);
  return stored?.data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export function cacheSettings(settings: Record<string, unknown>): void {
  safeSet(KEYS.SETTINGS, { ...settings, _cachedAt: Date.now() });
}

export function getCachedSettings(): Record<string, unknown> | null {
  return safeGet<Record<string, unknown> | null>(KEYS.SETTINGS, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNMENT SCHEMES
// ─────────────────────────────────────────────────────────────────────────────

export function cacheSchemes(schemes: unknown[]): void {
  safeSet(KEYS.SCHEMES, { data: schemes, _cachedAt: Date.now() });
}

export function getCachedSchemes(): unknown[] {
  const stored = safeGet<{ data: unknown[] } | null>(KEYS.SCHEMES, null);
  return stored?.data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC QUEUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an item to the pending sync queue.
 */
export function addToSyncQueue(
  item: Pick<SyncQueueItem, "type" | "payload">
): void {
  const queue = safeGet<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
  const entry: SyncQueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: item.type,
    payload: item.payload,
    timestamp: Date.now(),
    retries: 0
  };
  safeSet(KEYS.SYNC_QUEUE, [...queue, entry]);
}

/**
 * Get all pending sync items.
 */
export function getPendingSyncQueue(): SyncQueueItem[] {
  return safeGet<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
}

/**
 * Remove synced items from the queue.
 */
export function clearSyncedItems(syncedIds: string[]): void {
  const queue = safeGet<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
  const updated = queue.filter((item) => !syncedIds.includes(item.id));
  safeSet(KEYS.SYNC_QUEUE, updated);
}

/**
 * Mark sync items as having failed (increment retries).
 */
export function incrementRetries(failedIds: string[]): void {
  const queue = safeGet<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
  const updated = queue.map((item) =>
    failedIds.includes(item.id)
      ? { ...item, retries: item.retries + 1 }
      : item
  );
  // Remove items that have failed too many times (5+ retries)
  const cleaned = updated.filter((item) => item.retries <= 5);
  safeSet(KEYS.SYNC_QUEUE, cleaned);
}

/**
 * Record the last successful sync timestamp.
 */
export function recordSyncTime(): void {
  safeSet(KEYS.LAST_SYNC_TIME, Date.now());
}

/**
 * Get the last sync time.
 */
export function getLastSyncTime(): number | null {
  return safeGet<number | null>(KEYS.LAST_SYNC_TIME, null);
}
