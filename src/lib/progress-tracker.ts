/**
 * Progress Tracker
 * 
 * Tracks progress of long-running operations and supports cancellation.
 */

/**
 * Progress status
 */
export enum ProgressStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Progress update
 */
export interface ProgressUpdate {
  operationId: string;
  status: ProgressStatus;
  progress: number; // 0-100
  message: string;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  result?: unknown;
}

/**
 * Operation configuration
 */
interface OperationConfig {
  operationId: string;
  name: string;
  totalSteps?: number;
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

/**
 * Active operations storage
 */
const activeOperations = new Map<string, {
  config: OperationConfig;
  update: ProgressUpdate;
  cancelled: boolean;
}>();

/**
 * Generate unique operation ID
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Start tracking a new operation
 */
export function startOperation(config: OperationConfig): ProgressUpdate {
  const now = Date.now();
  
  const update: ProgressUpdate = {
    operationId: config.operationId,
    status: ProgressStatus.RUNNING,
    progress: 0,
    message: `Starting ${config.name}...`,
    startedAt: now,
    updatedAt: now,
  };
  
  activeOperations.set(config.operationId, {
    config,
    update,
    cancelled: false,
  });
  
  // Notify progress callback
  config.onProgress?.(update);
  
  return update;
}

/**
 * Update operation progress
 */
export function updateProgress(
  operationId: string,
  progress: number,
  message: string
): ProgressUpdate | null {
  const operation = activeOperations.get(operationId);
  
  if (!operation) {
    return null;
  }
  
  // Check if cancelled
  if (operation.cancelled) {
    return operation.update;
  }
  
  operation.update = {
    ...operation.update,
    progress: Math.min(100, Math.max(0, progress)),
    message,
    updatedAt: Date.now(),
  };
  
  // Notify progress callback
  operation.config.onProgress?.(operation.update);
  
  return operation.update;
}

/**
 * Complete an operation successfully
 */
export function completeOperation(
  operationId: string,
  result?: unknown
): ProgressUpdate | null {
  const operation = activeOperations.get(operationId);
  
  if (!operation) {
    return null;
  }
  
  const now = Date.now();
  
  operation.update = {
    ...operation.update,
    status: ProgressStatus.COMPLETED,
    progress: 100,
    message: 'Completed',
    updatedAt: now,
    completedAt: now,
    result,
  };
  
  // Notify callbacks
  operation.config.onProgress?.(operation.update);
  operation.config.onComplete?.(result);
  
  // Clean up after a delay
  setTimeout(() => {
    activeOperations.delete(operationId);
  }, 60000); // Keep for 1 minute
  
  return operation.update;
}

/**
 * Fail an operation
 */
export function failOperation(
  operationId: string,
  error: Error
): ProgressUpdate | null {
  const operation = activeOperations.get(operationId);
  
  if (!operation) {
    return null;
  }
  
  const now = Date.now();
  
  operation.update = {
    ...operation.update,
    status: ProgressStatus.FAILED,
    message: 'Failed',
    updatedAt: now,
    completedAt: now,
    error: error.message,
  };
  
  // Notify callbacks
  operation.config.onProgress?.(operation.update);
  operation.config.onError?.(error);
  
  // Clean up after a delay
  setTimeout(() => {
    activeOperations.delete(operationId);
  }, 60000);
  
  return operation.update;
}

/**
 * Request cancellation of an operation
 */
export function cancelOperation(operationId: string): boolean {
  const operation = activeOperations.get(operationId);
  
  if (!operation) {
    return false;
  }
  
  if (operation.update.status !== ProgressStatus.RUNNING) {
    return false;
  }
  
  operation.cancelled = true;
  operation.update = {
    ...operation.update,
    status: ProgressStatus.CANCELLED,
    message: 'Cancelled by user',
    updatedAt: Date.now(),
  };
  
  // Notify callbacks
  operation.config.onProgress?.(operation.update);
  operation.config.onCancel?.();
  
  // Clean up after a delay
  setTimeout(() => {
    activeOperations.delete(operationId);
  }, 60000);
  
  return true;
}

/**
 * Check if operation is cancelled
 */
export function isCancelled(operationId: string): boolean {
  const operation = activeOperations.get(operationId);
  return operation?.cancelled ?? false;
}

/**
 * Get operation status
 */
export function getOperationStatus(operationId: string): ProgressUpdate | null {
  const operation = activeOperations.get(operationId);
  return operation?.update ?? null;
}

/**
 * Get all active operations
 */
export function getActiveOperations(): ProgressUpdate[] {
  return Array.from(activeOperations.values())
    .filter(op => op.update.status === ProgressStatus.RUNNING)
    .map(op => op.update);
}

/**
 * Format progress for display
 */
export function formatProgress(update: ProgressUpdate): string {
  const elapsed = Math.round((update.updatedAt - update.startedAt) / 1000);
  const progressBar = createProgressBar(update.progress);
  
  let output = `**${update.message}**\n\n`;
  output += `${progressBar} ${update.progress}%\n`;
  output += `Elapsed: ${elapsed}s\n`;
  
  if (update.status === ProgressStatus.COMPLETED) {
    output += `\n✅ Completed successfully`;
  } else if (update.status === ProgressStatus.FAILED) {
    output += `\n❌ Failed: ${update.error}`;
  } else if (update.status === ProgressStatus.CANCELLED) {
    output += `\n⚠️ Cancelled`;
  }
  
  return output;
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Run an operation with progress tracking
 */
export async function withProgress<T>(
  name: string,
  fn: (
    updateProgress: (progress: number, message: string) => void,
    checkCancelled: () => boolean
  ) => Promise<T>,
  onProgress?: (update: ProgressUpdate) => void
): Promise<T> {
  const operationId = generateOperationId();
  
  startOperation({
    operationId,
    name,
    onProgress,
  });
  
  try {
    const result = await fn(
      (progress, message) => updateProgress(operationId, progress, message),
      () => isCancelled(operationId)
    );
    
    completeOperation(operationId, result);
    return result;
  } catch (error) {
    if (isCancelled(operationId)) {
      throw new Error('Operation cancelled');
    }
    failOperation(operationId, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
