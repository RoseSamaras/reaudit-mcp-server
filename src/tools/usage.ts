/**
 * Usage Tools
 * 
 * MCP tools for tracking token usage and managing budgets.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Schemas
export const getTokenUsageSchema = z.object({
  days: z.number().min(1).max(90).optional().describe('Number of days to include (default: 30, max: 90)'),
});

export const getBudgetStatusSchema = z.object({});

export const setBudgetLimitsSchema = z.object({
  monthlyTokenLimit: z.number().nullable().optional().describe('Monthly token limit (null for unlimited)'),
  monthlyCostLimit: z.number().nullable().optional().describe('Monthly cost limit in dollars (null for unlimited)'),
  alertThreshold: z.number().min(0).max(100).optional().describe('Alert threshold percentage (default: 80)'),
  pauseOnLimit: z.boolean().optional().describe('Pause operations when limit reached'),
});

/**
 * Get token usage summary
 */
export async function getTokenUsage(
  client: ReauditAPIClient,
  args: z.infer<typeof getTokenUsageSchema>
): Promise<string> {
  const data = await client.getTokenUsage(args.days);
  
  let output = `## Token Usage Summary (${data.period})\n\n`;
  output += `**Total Tokens:** ${data.totalTokens.toLocaleString()}\n`;
  output += `**Total Cost:** ${data.totalCostFormatted}\n\n`;
  
  if (data.budget) {
    output += `### Budget Status\n`;
    if (data.budget.tokenLimit) {
      output += `- Token Limit: ${data.budget.tokenLimit.toLocaleString()}\n`;
    }
    if (data.budget.costLimit) {
      output += `- Cost Limit: $${(data.budget.costLimit / 100).toFixed(2)}\n`;
    }
    output += `- Usage: ${data.budget.percentUsed}%\n\n`;
  }
  
  if (data.byOperation && data.byOperation.length > 0) {
    output += `### Usage by Operation\n`;
    output += `| Operation | Tokens | Cost | Count |\n`;
    output += `|-----------|--------|------|-------|\n`;
    
    for (const op of data.byOperation.slice(0, 10)) {
      output += `| ${op.operation} | ${op.tokens.toLocaleString()} | $${(op.cost / 100).toFixed(2)} | ${op.count} |\n`;
    }
    output += '\n';
  }
  
  if (data.byDay && data.byDay.length > 0) {
    output += `### Recent Daily Usage\n`;
    for (const day of data.byDay.slice(-7)) {
      output += `- ${day.date}: ${day.tokens.toLocaleString()} tokens ($${(day.cost / 100).toFixed(2)})\n`;
    }
  }
  
  return output;
}

/**
 * Get budget status
 */
export async function getBudgetStatus(
  client: ReauditAPIClient,
  _args: z.infer<typeof getBudgetStatusSchema>
): Promise<string> {
  const data = await client.getBudgetStatus();
  
  let output = `## Budget Status\n\n`;
  
  if (!data.hasLimits) {
    output += `No budget limits configured. Usage is unlimited.\n\n`;
    output += `To set limits, use the \`set_budget_limits\` tool.\n`;
    return output;
  }
  
  if (data.settings) {
    output += `### Current Settings\n`;
    if (data.settings.monthlyTokenLimit) {
      output += `- Monthly Token Limit: ${data.settings.monthlyTokenLimit.toLocaleString()}\n`;
    }
    if (data.settings.monthlyCostLimitFormatted) {
      output += `- Monthly Cost Limit: ${data.settings.monthlyCostLimitFormatted}\n`;
    }
    output += `- Alert Threshold: ${data.settings.alertThreshold}%\n`;
    output += `- Pause on Limit: ${data.settings.pauseOnLimit ? 'Yes' : 'No'}\n`;
    output += `- Notify on Alert: ${data.settings.notifyOnAlert ? 'Yes' : 'No'}\n\n`;
  }
  
  if (data.usage) {
    output += `### Current Usage (${data.currentPeriod})\n`;
    output += `- Tokens Used: ${data.usage.tokens.toLocaleString()}`;
    if (data.usage.tokenLimit) {
      output += ` / ${data.usage.tokenLimit.toLocaleString()}`;
    }
    output += '\n';
    output += `- Cost: ${data.usage.costFormatted}`;
    if (data.usage.costLimit) {
      output += ` / $${(data.usage.costLimit / 100).toFixed(2)}`;
    }
    output += '\n';
    output += `- Usage: ${data.usage.percentUsed}%\n\n`;
  }
  
  output += `### Status\n`;
  if (data.status.limitReached) {
    output += `⚠️ **Limit Reached**`;
    if (data.status.reason) {
      output += `: ${data.status.reason}`;
    }
    output += '\n';
  } else if (data.status.alertSent) {
    output += `⚠️ Alert threshold reached\n`;
  } else {
    output += `✅ Within budget\n`;
  }
  
  return output;
}

/**
 * Set budget limits
 */
export async function setBudgetLimits(
  client: ReauditAPIClient,
  args: z.infer<typeof setBudgetLimitsSchema>
): Promise<string> {
  await client.updateBudgetSettings(args);
  
  let output = `## Budget Settings Updated\n\n`;
  
  if ('monthlyTokenLimit' in args) {
    output += `- Monthly Token Limit: ${args.monthlyTokenLimit === null ? 'Unlimited' : args.monthlyTokenLimit?.toLocaleString()}\n`;
  }
  if ('monthlyCostLimit' in args) {
    output += `- Monthly Cost Limit: ${args.monthlyCostLimit === null ? 'Unlimited' : `$${args.monthlyCostLimit?.toFixed(2)}`}\n`;
  }
  if ('alertThreshold' in args) {
    output += `- Alert Threshold: ${args.alertThreshold}%\n`;
  }
  if ('pauseOnLimit' in args) {
    output += `- Pause on Limit: ${args.pauseOnLimit ? 'Yes' : 'No'}\n`;
  }
  
  output += `\nUse \`get_budget_status\` to view your current budget status.`;
  
  return output;
}

// Tool definitions
export const usageTools = [
  {
    name: 'get_token_usage',
    description: 'Get a summary of your LLM token usage and costs over a specified period',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to include (default: 30, max: 90)',
        },
      },
    },
  },
  {
    name: 'get_budget_status',
    description: 'Get your current budget limits and usage status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_budget_limits',
    description: 'Set monthly budget limits for token usage and costs. Set to null to remove limits.',
    inputSchema: {
      type: 'object',
      properties: {
        monthlyTokenLimit: {
          type: ['number', 'null'],
          description: 'Monthly token limit (null for unlimited)',
        },
        monthlyCostLimit: {
          type: ['number', 'null'],
          description: 'Monthly cost limit in dollars (null for unlimited)',
        },
        alertThreshold: {
          type: 'number',
          description: 'Alert threshold percentage (default: 80)',
          minimum: 0,
          maximum: 100,
        },
        pauseOnLimit: {
          type: 'boolean',
          description: 'Pause operations when limit reached',
        },
      },
    },
  },
];
