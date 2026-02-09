/**
 * Offline Mode Handler
 * 
 * Provides graceful degradation when the API is unavailable,
 * with request queuing for retry.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Connection status
 */
export enum ConnectionStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded', // Partial connectivity
}

/**
 * Queued request
 */
interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  data?: unknown;
  params?: Record<string, string>;
  queuedAt: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * Offline mode configuration
 */
interface OfflineConfig {
  queuePath: string;
  maxQueueSize: number;
  maxRetries: number;
  checkInterval: number; // ms
}

const DEFAULT_CONFIG: OfflineConfig = {
  queuePath: path.join(os.homedir(), '.reaudit', 'request-queue.json'),
  maxQueueSize: 100,
  maxRetries: 5,
  checkInterval: 30000, // 30 seconds
};

/**
 * Offline mode state
 */
let currentStatus: ConnectionStatus = ConnectionStatus.ONLINE;
let lastOnlineCheck: number = 0;
let requestQueue: QueuedRequest[] = [];
let checkTimer: NodeJS.Timeout | null = null;

/**
 * Status change callbacks
 */
const statusCallbacks: Array<(status: ConnectionStatus) => void> = [];

/**
 * Initialize offline mode
 */
export function initOfflineMode(config: Partial<OfflineConfig> = {}): void {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Load persisted queue
  loadQueue(fullConfig.queuePath);
  
  // Start periodic connectivity check
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  
  checkTimer = setInterval(() => {
    checkConnectivity();
  }, fullConfig.checkInterval);
}

/**
 * Stop offline mode
 */
export function stopOfflineMode(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return currentStatus;
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return currentStatus === ConnectionStatus.ONLINE;
}

/**
 * Register status change callback
 */
export function onStatusChange(callback: (status: ConnectionStatus) => void): void {
  statusCallbacks.push(callback);
}

/**
 * Update connection status
 */
export function setConnectionStatus(status: ConnectionStatus): void {
  if (status !== currentStatus) {
    currentStatus = status;
    lastOnlineCheck = Date.now();
    
    // Notify callbacks
    for (const callback of statusCallbacks) {
      try {
        callback(status);
      } catch (e) {
        console.error('Error in status callback:', e);
      }
    }
    
    // If back online, process queue
    if (status === ConnectionStatus.ONLINE) {
      processQueue();
    }
  }
}

/**
 * Check connectivity (called periodically)
 */
async function checkConnectivity(): Promise<void> {
  // This would make a lightweight health check request
  // For now, we just update the timestamp
  lastOnlineCheck = Date.now();
}

/**
 * Queue a request for later retry
 */
export function queueRequest(
  method: string,
  path: string,
  data?: unknown,
  params?: Record<string, string>
): string {
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const request: QueuedRequest = {
    id,
    method,
    path,
    data,
    params,
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: DEFAULT_CONFIG.maxRetries,
  };
  
  // Add to queue (limit size)
  requestQueue.push(request);
  if (requestQueue.length > DEFAULT_CONFIG.maxQueueSize) {
    requestQueue.shift(); // Remove oldest
  }
  
  // Persist queue
  saveQueue(DEFAULT_CONFIG.queuePath);
  
  return id;
}

/**
 * Get queued requests
 */
export function getQueuedRequests(): QueuedRequest[] {
  return [...requestQueue];
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  return requestQueue.length;
}

/**
 * Clear the request queue
 */
export function clearQueue(): void {
  requestQueue = [];
  saveQueue(DEFAULT_CONFIG.queuePath);
}

/**
 * Remove a request from queue
 */
export function removeFromQueue(requestId: string): boolean {
  const index = requestQueue.findIndex(r => r.id === requestId);
  if (index >= 0) {
    requestQueue.splice(index, 1);
    saveQueue(DEFAULT_CONFIG.queuePath);
    return true;
  }
  return false;
}

/**
 * Process queued requests (called when back online)
 */
async function processQueue(): Promise<void> {
  if (requestQueue.length === 0) {
    return;
  }
  
  console.error(`[Offline Mode] Processing ${requestQueue.length} queued requests...`);
  
  // Process requests one at a time
  const toProcess = [...requestQueue];
  
  for (const request of toProcess) {
    if (currentStatus !== ConnectionStatus.ONLINE) {
      break; // Stop if we go offline again
    }
    
    try {
      // Increment retry count
      request.retryCount++;
      
      // TODO: Actually retry the request using the API client
      // For now, just remove from queue
      removeFromQueue(request.id);
      
      console.error(`[Offline Mode] Processed request ${request.id}`);
    } catch (error) {
      if (request.retryCount >= request.maxRetries) {
        // Max retries reached, remove from queue
        removeFromQueue(request.id);
        console.error(`[Offline Mode] Request ${request.id} failed after ${request.maxRetries} retries`);
      }
    }
  }
}

/**
 * Load queue from disk
 */
function loadQueue(queuePath: string): void {
  try {
    if (fs.existsSync(queuePath)) {
      const data = fs.readFileSync(queuePath, 'utf-8');
      requestQueue = JSON.parse(data);
    }
  } catch (error) {
    console.error('[Offline Mode] Error loading queue:', error);
    requestQueue = [];
  }
}

/**
 * Save queue to disk
 */
function saveQueue(queuePath: string): void {
  try {
    const dir = path.dirname(queuePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(queuePath, JSON.stringify(requestQueue, null, 2));
  } catch (error) {
    console.error('[Offline Mode] Error saving queue:', error);
  }
}

/**
 * Get offline mode status for display
 */
export function getOfflineModeStatus(): {
  status: ConnectionStatus;
  queueSize: number;
  lastCheck: string;
  message: string;
} {
  const lastCheckStr = lastOnlineCheck 
    ? new Date(lastOnlineCheck).toISOString()
    : 'Never';
  
  let message: string;
  switch (currentStatus) {
    case ConnectionStatus.ONLINE:
      message = 'Connected to Reaudit';
      break;
    case ConnectionStatus.OFFLINE:
      message = `Offline - ${requestQueue.length} requests queued`;
      break;
    case ConnectionStatus.DEGRADED:
      message = 'Limited connectivity - some features may be unavailable';
      break;
  }
  
  return {
    status: currentStatus,
    queueSize: requestQueue.length,
    lastCheck: lastCheckStr,
    message,
  };
}

/**
 * Format offline status for user display
 */
export function formatOfflineStatus(): string {
  const status = getOfflineModeStatus();
  
  const statusEmoji = {
    [ConnectionStatus.ONLINE]: '🟢',
    [ConnectionStatus.OFFLINE]: '🔴',
    [ConnectionStatus.DEGRADED]: '🟡',
  };
  
  let output = `## Connection Status\n\n`;
  output += `${statusEmoji[status.status]} **${status.status.toUpperCase()}**\n\n`;
  output += `${status.message}\n\n`;
  
  if (status.queueSize > 0) {
    output += `### Queued Requests\n`;
    output += `${status.queueSize} request(s) waiting to be processed when back online.\n\n`;
  }
  
  output += `Last connectivity check: ${status.lastCheck}\n`;
  
  return output;
}

/**
 * Cached data for offline access
 */
interface CachedData {
  key: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
}

const offlineCache = new Map<string, CachedData>();

/**
 * Cache data for offline access
 */
export function cacheForOffline(key: string, data: unknown, ttlMs: number = 3600000): void {
  const now = Date.now();
  offlineCache.set(key, {
    key,
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
  });
}

/**
 * Get cached data (for offline use)
 */
export function getOfflineCache<T>(key: string): T | null {
  const cached = offlineCache.get(key);
  
  if (!cached) {
    return null;
  }
  
  // Check expiration
  if (Date.now() > cached.expiresAt) {
    offlineCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

/**
 * Clear offline cache
 */
export function clearOfflineCache(): void {
  offlineCache.clear();
}
