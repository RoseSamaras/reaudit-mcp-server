/**
 * Error Handler
 * 
 * Centralized error handling with auto-retry, user-friendly messages,
 * and error categorization.
 */

import { AxiosError } from 'axios';

/**
 * Error categories for user-friendly messaging
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  SERVER = 'server',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

/**
 * Structured error with user-friendly information
 */
export interface MCPError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  suggestion?: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  originalError?: Error;
}

/**
 * Map HTTP status codes to error categories
 */
function categorizeHttpError(status: number): ErrorCategory {
  switch (status) {
    case 401:
      return ErrorCategory.AUTHENTICATION;
    case 403:
      return ErrorCategory.AUTHORIZATION;
    case 404:
      return ErrorCategory.NOT_FOUND;
    case 422:
    case 400:
      return ErrorCategory.VALIDATION;
    case 429:
      return ErrorCategory.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCategory.SERVER;
    default:
      return ErrorCategory.UNKNOWN;
  }
}

/**
 * Get user-friendly message for error category
 */
function getUserMessage(category: ErrorCategory, details?: string): string {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Your session has expired. Please re-authenticate with Reaudit.';
    case ErrorCategory.AUTHORIZATION:
      return details || 'You don\'t have permission to perform this action. Check your subscription tier.';
    case ErrorCategory.RATE_LIMIT:
      return 'You\'ve reached your usage limit. Please wait before trying again or upgrade your plan.';
    case ErrorCategory.NOT_FOUND:
      return details || 'The requested resource was not found. It may have been deleted or you may not have access.';
    case ErrorCategory.VALIDATION:
      return details || 'Invalid request. Please check your input and try again.';
    case ErrorCategory.SERVER:
      return 'Reaudit is experiencing issues. Please try again in a few minutes.';
    case ErrorCategory.NETWORK:
      return 'Unable to connect to Reaudit. Please check your internet connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get suggestion for error recovery
 */
function getSuggestion(category: ErrorCategory): string | undefined {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Delete ~/.reaudit/credentials.json and restart to re-authenticate.';
    case ErrorCategory.AUTHORIZATION:
      return 'Visit https://reaudit.io/settings to check your subscription.';
    case ErrorCategory.RATE_LIMIT:
      return 'Use get_usage_summary to check your current limits.';
    case ErrorCategory.NOT_FOUND:
      return 'Use list_projects or list_audits to find valid IDs.';
    case ErrorCategory.SERVER:
      return 'Check https://status.reaudit.io for service status.';
    case ErrorCategory.NETWORK:
      return 'Verify you can access https://reaudit.io in your browser.';
    default:
      return undefined;
  }
}

/**
 * Check if error is retryable
 */
function isRetryable(category: ErrorCategory): boolean {
  return [
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER,
    ErrorCategory.NETWORK,
  ].includes(category);
}

/**
 * Parse and categorize an error
 */
export function parseError(error: unknown): MCPError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as any;
    
    // Network error (no response)
    if (!error.response) {
      return {
        category: ErrorCategory.NETWORK,
        message: error.message,
        userMessage: getUserMessage(ErrorCategory.NETWORK),
        suggestion: getSuggestion(ErrorCategory.NETWORK),
        retryable: true,
        retryAfter: 5,
        originalError: error,
      };
    }
    
    const category = categorizeHttpError(status || 500);
    const apiMessage = data?.error_description || data?.message || data?.error;
    
    // Extract retry-after header for rate limits
    let retryAfter: number | undefined;
    if (category === ErrorCategory.RATE_LIMIT) {
      const retryHeader = error.response.headers['retry-after'];
      if (retryHeader) {
        // Could be seconds or a date
        const parsed = parseInt(retryHeader);
        if (!isNaN(parsed)) {
          retryAfter = parsed;
        } else {
          const date = new Date(retryHeader);
          retryAfter = Math.ceil((date.getTime() - Date.now()) / 1000);
        }
      }
    }
    
    return {
      category,
      message: apiMessage || error.message,
      userMessage: getUserMessage(category, apiMessage),
      suggestion: getSuggestion(category),
      retryable: isRetryable(category),
      retryAfter: retryAfter || (isRetryable(category) ? 30 : undefined),
      originalError: error,
    };
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    return {
      category: ErrorCategory.UNKNOWN,
      message: error.message,
      userMessage: getUserMessage(ErrorCategory.UNKNOWN),
      retryable: false,
      originalError: error,
    };
  }
  
  // Handle unknown errors
  return {
    category: ErrorCategory.UNKNOWN,
    message: String(error),
    userMessage: getUserMessage(ErrorCategory.UNKNOWN),
    retryable: false,
  };
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: MCPError): string {
  let message = `**Error:** ${error.userMessage}`;
  
  if (error.suggestion) {
    message += `\n\n**Suggestion:** ${error.suggestion}`;
  }
  
  if (error.retryable && error.retryAfter) {
    message += `\n\n*This error may be temporary. Try again in ${error.retryAfter} seconds.*`;
  }
  
  return message;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  retryableCategories: ErrorCategory[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableCategories: [
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER,
    ErrorCategory.NETWORK,
  ],
};

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * Execute a function with automatic retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: MCPError | undefined;
  
  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = parseError(error);
      
      // Don't retry if not retryable or max retries reached
      if (
        !lastError.retryable ||
        !fullConfig.retryableCategories.includes(lastError.category) ||
        attempt === fullConfig.maxRetries
      ) {
        throw error;
      }
      
      // Wait before retrying
      const delay = lastError.retryAfter 
        ? lastError.retryAfter * 1000 
        : calculateRetryDelay(attempt, fullConfig);
      
      console.error(`Retry attempt ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError?.originalError || new Error('Retry failed');
}
