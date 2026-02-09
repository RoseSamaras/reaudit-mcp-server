/**
 * Human-in-the-Loop Confirmation System
 * 
 * Provides confirmation flows for high-risk or high-cost operations.
 * Uses MCP's built-in confirmation mechanism when available.
 */

/**
 * Risk levels for operations
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Operation types that may require confirmation
 */
export enum OperationType {
  // Data modification
  DELETE_PROJECT = 'delete_project',
  DELETE_AUDIT = 'delete_audit',
  DELETE_CONTENT = 'delete_content',
  
  // Publishing/External actions
  PUBLISH_CONTENT = 'publish_content',
  SEND_OUTREACH = 'send_outreach',
  
  // High-cost operations
  RUN_FULL_AUDIT = 'run_full_audit',
  GENERATE_CONTENT = 'generate_content',
  BULK_ANALYSIS = 'bulk_analysis',
  
  // Account changes
  CHANGE_SUBSCRIPTION = 'change_subscription',
  REVOKE_ACCESS = 'revoke_access',
}

/**
 * Configuration for each operation type
 */
interface OperationConfig {
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  estimatedCost?: number; // In credits
  warningMessage: string;
  confirmationPrompt: string;
}

/**
 * Operation configurations
 */
const OPERATION_CONFIGS: Record<OperationType, OperationConfig> = {
  [OperationType.DELETE_PROJECT]: {
    riskLevel: RiskLevel.CRITICAL,
    requiresConfirmation: true,
    warningMessage: 'This will permanently delete the project and all associated data.',
    confirmationPrompt: 'Type the project name to confirm deletion:',
  },
  [OperationType.DELETE_AUDIT]: {
    riskLevel: RiskLevel.HIGH,
    requiresConfirmation: true,
    warningMessage: 'This will permanently delete the audit results.',
    confirmationPrompt: 'Are you sure you want to delete this audit?',
  },
  [OperationType.DELETE_CONTENT]: {
    riskLevel: RiskLevel.MEDIUM,
    requiresConfirmation: true,
    warningMessage: 'This will delete the content suggestion.',
    confirmationPrompt: 'Confirm content deletion?',
  },
  [OperationType.PUBLISH_CONTENT]: {
    riskLevel: RiskLevel.HIGH,
    requiresConfirmation: true,
    warningMessage: 'This will publish content to your connected platforms.',
    confirmationPrompt: 'Confirm publishing this content?',
  },
  [OperationType.SEND_OUTREACH]: {
    riskLevel: RiskLevel.HIGH,
    requiresConfirmation: true,
    warningMessage: 'This will send emails to the specified recipients.',
    confirmationPrompt: 'Confirm sending outreach emails?',
  },
  [OperationType.RUN_FULL_AUDIT]: {
    riskLevel: RiskLevel.MEDIUM,
    requiresConfirmation: true,
    estimatedCost: 1,
    warningMessage: 'Running a full audit will use 1 audit credit.',
    confirmationPrompt: 'Proceed with the audit?',
  },
  [OperationType.GENERATE_CONTENT]: {
    riskLevel: RiskLevel.LOW,
    requiresConfirmation: false,
    estimatedCost: 1,
    warningMessage: 'Content generation uses AI credits.',
    confirmationPrompt: 'Generate content?',
  },
  [OperationType.BULK_ANALYSIS]: {
    riskLevel: RiskLevel.MEDIUM,
    requiresConfirmation: true,
    estimatedCost: 5,
    warningMessage: 'Bulk analysis will use multiple credits.',
    confirmationPrompt: 'Proceed with bulk analysis?',
  },
  [OperationType.CHANGE_SUBSCRIPTION]: {
    riskLevel: RiskLevel.HIGH,
    requiresConfirmation: true,
    warningMessage: 'This will change your subscription plan.',
    confirmationPrompt: 'Confirm subscription change?',
  },
  [OperationType.REVOKE_ACCESS]: {
    riskLevel: RiskLevel.MEDIUM,
    requiresConfirmation: true,
    warningMessage: 'This will revoke access for the connected application.',
    confirmationPrompt: 'Revoke access?',
  },
};

/**
 * Confirmation request structure
 */
export interface ConfirmationRequest {
  operationType: OperationType;
  riskLevel: RiskLevel;
  warningMessage: string;
  confirmationPrompt: string;
  estimatedCost?: number;
  details?: Record<string, unknown>;
}

/**
 * Confirmation response structure
 */
export interface ConfirmationResponse {
  confirmed: boolean;
  confirmationToken?: string;
  userInput?: string;
}

/**
 * Pending confirmation storage (in-memory for now)
 */
const pendingConfirmations = new Map<string, {
  request: ConfirmationRequest;
  createdAt: number;
  expiresAt: number;
}>();

/**
 * Generate a confirmation token
 */
function generateConfirmationToken(): string {
  return `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if an operation requires confirmation
 */
export function requiresConfirmation(operationType: OperationType): boolean {
  const config = OPERATION_CONFIGS[operationType];
  return config?.requiresConfirmation ?? false;
}

/**
 * Get operation configuration
 */
export function getOperationConfig(operationType: OperationType): OperationConfig | undefined {
  return OPERATION_CONFIGS[operationType];
}

/**
 * Create a confirmation request
 */
export function createConfirmationRequest(
  operationType: OperationType,
  details?: Record<string, unknown>
): { token: string; request: ConfirmationRequest } {
  const config = OPERATION_CONFIGS[operationType];
  
  if (!config) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }
  
  const token = generateConfirmationToken();
  const request: ConfirmationRequest = {
    operationType,
    riskLevel: config.riskLevel,
    warningMessage: config.warningMessage,
    confirmationPrompt: config.confirmationPrompt,
    estimatedCost: config.estimatedCost,
    details,
  };
  
  // Store pending confirmation (expires in 5 minutes)
  const now = Date.now();
  pendingConfirmations.set(token, {
    request,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000,
  });
  
  return { token, request };
}

/**
 * Validate and consume a confirmation token
 */
export function validateConfirmation(
  token: string,
  expectedOperation?: OperationType
): { valid: boolean; request?: ConfirmationRequest; error?: string } {
  const pending = pendingConfirmations.get(token);
  
  if (!pending) {
    return { valid: false, error: 'Invalid or expired confirmation token' };
  }
  
  if (Date.now() > pending.expiresAt) {
    pendingConfirmations.delete(token);
    return { valid: false, error: 'Confirmation token has expired' };
  }
  
  if (expectedOperation && pending.request.operationType !== expectedOperation) {
    return { valid: false, error: 'Confirmation token does not match operation' };
  }
  
  // Consume the token (one-time use)
  pendingConfirmations.delete(token);
  
  return { valid: true, request: pending.request };
}

/**
 * Format confirmation request for display
 */
export function formatConfirmationMessage(request: ConfirmationRequest): string {
  const riskEmoji = {
    [RiskLevel.LOW]: '',
    [RiskLevel.MEDIUM]: '⚠️',
    [RiskLevel.HIGH]: '⚠️⚠️',
    [RiskLevel.CRITICAL]: '🚨',
  };
  
  let message = `${riskEmoji[request.riskLevel]} **Confirmation Required**\n\n`;
  message += `${request.warningMessage}\n\n`;
  
  if (request.estimatedCost) {
    message += `**Estimated cost:** ${request.estimatedCost} credit(s)\n\n`;
  }
  
  if (request.details) {
    message += '**Details:**\n';
    for (const [key, value] of Object.entries(request.details)) {
      message += `- ${key}: ${value}\n`;
    }
    message += '\n';
  }
  
  message += `${request.confirmationPrompt}\n\n`;
  message += '_To proceed, call this tool again with `confirmed: true`_';
  
  return message;
}

/**
 * Clean up expired confirmations
 */
export function cleanupExpiredConfirmations(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, pending] of pendingConfirmations.entries()) {
    if (now > pending.expiresAt) {
      pendingConfirmations.delete(token);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Run cleanup every minute
setInterval(cleanupExpiredConfirmations, 60 * 1000);
