/**
 * Account Tools
 * 
 * MCP tools for account information and usage tracking.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const getUsageSummarySchema = z.object({});

/**
 * Get usage summary tool handler
 */
export async function getUsageSummary(
  client: ReauditAPIClient,
  _args: z.infer<typeof getUsageSummarySchema>
): Promise<string> {
  const account = await client.getAccount();
  
  let response = `## Account: ${account.user.email}\n\n`;
  response += `**Subscription:** ${account.subscription.tier} (${account.subscription.status})\n\n`;
  
  response += `### Usage Summary\n\n`;
  
  // Prompts
  const prompts = account.usage.prompts;
  if (prompts.unlimited) {
    response += `- **Prompts:** ${prompts.used} used (unlimited)\n`;
  } else {
    response += `- **Prompts:** ${prompts.used}/${prompts.limit} used today\n`;
  }
  
  // Content
  const content = account.usage.content;
  if (content.unlimited) {
    response += `- **Content:** ${content.used} created (unlimited)\n`;
  } else {
    response += `- **Content:** ${content.used}/${content.limit} this week\n`;
  }
  
  // Images
  const images = account.usage.images;
  if (images.unlimited) {
    response += `- **Images:** ${images.used} generated (unlimited)\n`;
  } else {
    response += `- **Images:** ${images.used}/${images.limit} this week\n`;
  }
  
  // Audits
  const audits = account.usage.audits;
  if (audits.unlimited) {
    response += `- **Audits:** ${audits.used} run (unlimited)\n`;
  } else {
    response += `- **Audits:** ${audits.used}/${audits.limit} this month\n`;
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const accountTools = [
  {
    name: 'get_usage_summary',
    description: 'Get your current usage summary including prompts, content, images, and audits used vs limits.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
];
