/**
 * Visibility Tools
 * 
 * MCP tools for AI visibility tracking and analysis.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const getVisibilityScoreSchema = z.object({
  projectId: z.string().describe('The ID of the project to get visibility score for'),
});

export const getBrandMentionsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  platform: z.string().optional().describe('Filter by platform (chatgpt, claude, perplexity, etc.)'),
  limit: z.number().optional().describe('Maximum number of mentions to return (default: 20, max: 50)'),
  days: z.number().optional().describe('Number of days to look back (default: 30, max: 90)'),
});

export const getCompetitorComparisonSchema = z.object({
  projectId: z.string().describe('The ID of the project to compare'),
});

/**
 * Get visibility score tool handler
 */
export async function getVisibilityScore(
  client: ReauditAPIClient,
  args: z.infer<typeof getVisibilityScoreSchema>
): Promise<string> {
  const result = await client.getVisibilityScore(args.projectId);
  
  let response = `## AI Visibility Score for ${result.brandName}\n\n`;
  response += `**Overall Score:** ${result.visibilityScore}/100\n`;
  response += `**Period:** Last ${result.period}\n\n`;
  
  response += `### Key Metrics\n`;
  response += `- Total Mentions: ${result.metrics.totalMentions}\n`;
  response += `- Citations Received: ${result.metrics.citationsReceived}\n`;
  response += `- Citation Rate: ${result.metrics.citationRate}%\n`;
  response += `- Average Sentiment: ${result.metrics.avgSentiment}/100\n\n`;
  
  if (result.platformBreakdown.length > 0) {
    response += `### Platform Breakdown\n`;
    for (const platform of result.platformBreakdown) {
      response += `- **${platform.platform}**: ${platform.mentions} mentions (sentiment: ${platform.avgSentiment})\n`;
    }
    response += '\n';
  }
  
  response += `### Sentiment Distribution\n`;
  response += `- Positive: ${result.sentimentDistribution.positive}\n`;
  response += `- Neutral: ${result.sentimentDistribution.neutral}\n`;
  response += `- Negative: ${result.sentimentDistribution.negative}\n`;
  
  return response;
}

/**
 * Get brand mentions tool handler
 */
export async function getBrandMentions(
  client: ReauditAPIClient,
  args: z.infer<typeof getBrandMentionsSchema>
): Promise<string> {
  const result = await client.getBrandMentions(args.projectId, {
    platform: args.platform,
    limit: args.limit,
    days: args.days,
  });
  
  if (result.mentions.length === 0) {
    return `No brand mentions found for ${result.brandName} in the last ${result.period}.`;
  }
  
  let response = `## Brand Mentions for ${result.brandName}\n`;
  response += `Found ${result.count} mentions in the last ${result.period}\n\n`;
  
  for (const mention of result.mentions) {
    const sentimentEmoji = mention.sentimentLabel === 'positive' ? '✅' : 
                          mention.sentimentLabel === 'negative' ? '❌' : '➖';
    
    response += `### ${mention.platform} ${sentimentEmoji}\n`;
    response += `**Prompt:** ${mention.prompt}\n`;
    response += `**Excerpt:** ${mention.excerpt}\n`;
    response += `**Sentiment:** ${mention.sentimentLabel} (${mention.sentiment}/100)\n`;
    if (mention.citationCount > 0) {
      response += `**Citations:** ${mention.citationCount}\n`;
    }
    response += `**Date:** ${new Date(mention.timestamp).toLocaleDateString()}\n\n`;
  }
  
  return response;
}

/**
 * Get competitor comparison tool handler
 */
export async function getCompetitorComparison(
  client: ReauditAPIClient,
  args: z.infer<typeof getCompetitorComparisonSchema>
): Promise<string> {
  const result = await client.getCompetitorComparison(args.projectId);
  
  if (result.competitors.length === 0) {
    return `No competitors configured for ${result.brandName}. Add competitors in the Reaudit dashboard to enable comparison.`;
  }
  
  let response = `## Competitor Comparison for ${result.brandName}\n`;
  response += `Period: Last ${result.period}\n\n`;
  
  response += `### Your Performance\n`;
  response += `- **Rank:** #${result.yourMetrics.rank} of ${result.yourMetrics.totalCompetitors + 1}\n`;
  response += `- **Mentions:** ${result.yourMetrics.mentions}\n`;
  response += `- **Avg Sentiment:** ${result.yourMetrics.avgSentiment}/100\n`;
  response += `- **Citations:** ${result.yourMetrics.citations}\n\n`;
  
  response += `### Competitors\n`;
  for (const comp of result.competitors) {
    response += `**${comp.name}** (${comp.domain})\n`;
    response += `- Mentions: ${comp.mentions}\n`;
    response += `- Sentiment: ${comp.avgSentiment}/100\n`;
    response += `- Citations: ${comp.citations}\n\n`;
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const visibilityTools = [
  {
    name: 'get_visibility_score',
    description: 'Get the AI visibility score for a project. Shows how often your brand is mentioned by AI assistants, citation rates, and sentiment analysis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to get visibility score for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_brand_mentions',
    description: 'Get recent brand mentions across AI platforms like ChatGPT, Claude, and Perplexity. Shows the prompts that triggered mentions and sentiment analysis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform (chatgpt, claude, perplexity, etc.)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of mentions to return (default: 20, max: 50)',
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30, max: 90)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_competitor_comparison',
    description: 'Compare your AI visibility with competitors. Shows ranking, mention counts, and sentiment comparison.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to compare',
        },
      },
      required: ['projectId'],
    },
  },
];
