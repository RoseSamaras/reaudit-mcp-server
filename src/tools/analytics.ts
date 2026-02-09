/**
 * Analytics Tools
 * 
 * MCP tools for analytics and reporting.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const getCitationAnalyticsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  days: z.number().optional().describe('Number of days to analyze (default: 30, max: 90)'),
});

export const getWordPressAnalyticsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  days: z.number().optional().describe('Number of days to analyze (default: 30, max: 90)'),
});

/**
 * Get citation analytics tool handler
 */
export async function getCitationAnalytics(
  client: ReauditAPIClient,
  args: z.infer<typeof getCitationAnalyticsSchema>
): Promise<string> {
  const result = await client.getCitationAnalytics(args.projectId, args.days);
  
  let response = `## Citation Analytics for ${result.brandName}\n`;
  response += `Period: Last ${result.period}\n\n`;
  
  response += `### Summary\n`;
  response += `- Total Citations: ${result.summary.totalCitations}\n`;
  response += `- Mentions with Citations: ${result.summary.mentionsWithCitations}\n`;
  response += `- Avg Citations per Mention: ${result.summary.avgCitationsPerMention}\n\n`;
  
  if (result.byPlatform.length > 0) {
    response += `### By Platform\n`;
    for (const platform of result.byPlatform) {
      response += `- **${platform.platform}**: ${platform.citations} citations from ${platform.mentions} mentions\n`;
    }
    response += '\n';
  }
  
  if (result.topCitedDomains.length > 0) {
    response += `### Top Cited Domains\n`;
    for (const domain of result.topCitedDomains.slice(0, 5)) {
      response += `- ${domain.domain}: ${domain.count} citations\n`;
    }
    response += '\n';
  }
  
  if (result.dailyTrends.length > 0) {
    response += `### Recent Trend\n`;
    const recentDays = result.dailyTrends.slice(-7);
    for (const day of recentDays) {
      response += `- ${day.date}: ${day.citations} citations\n`;
    }
  }
  
  return response;
}

/**
 * Get WordPress bot tracking analytics tool handler
 */
export async function getWordPressAnalytics(
  client: ReauditAPIClient,
  args: z.infer<typeof getWordPressAnalyticsSchema>
): Promise<string> {
  const result = await client.getWordPressAnalytics(args.projectId, args.days);
  
  let response = `## WordPress Bot Tracking for ${result.domain || 'Project'}\n`;
  response += `Period: Last ${result.period}\n\n`;
  
  response += `### Summary\n`;
  response += `- Total Bot Visits: ${result.summary.totalBotVisits}\n`;
  response += `- Unique Bot Types: ${result.summary.uniqueBotTypes}\n\n`;
  
  if (result.botBreakdown.length > 0) {
    response += `### Bot Breakdown\n`;
    for (const bot of result.botBreakdown) {
      response += `- **${bot.botType}**: ${bot.visits} visits across ${bot.uniquePages} pages\n`;
    }
    response += '\n';
  }
  
  if (result.topCrawledPages.length > 0) {
    response += `### Top Crawled Pages\n`;
    for (const page of result.topCrawledPages.slice(0, 5)) {
      response += `- ${page.url}\n`;
      response += `  Visits: ${page.visits} | Bots: ${page.bots.join(', ')}\n`;
    }
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const analyticsTools = [
  {
    name: 'get_citation_analytics',
    description: 'Get citation analytics showing trends, top cited domains, and platform breakdown for your brand mentions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        days: {
          type: 'number',
          description: 'Number of days to analyze (default: 30, max: 90)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_wordpress_analytics',
    description: 'Get WordPress AI bot tracking analytics showing which AI crawlers are visiting your site and which pages they access.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        days: {
          type: 'number',
          description: 'Number of days to analyze (default: 30, max: 90)',
        },
      },
      required: ['projectId'],
    },
  },
];
