/**
 * MCP Tools - AI Bot Crawl Analytics
 * Tools for monitoring AI agent/bot activity on your site
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getAgentAnalyticsSchema = z.object({
  days: z.number().min(1).max(90).optional().describe('Number of days to look back (default 30, max 90)'),
  botType: z.string().optional().describe('Filter by specific bot type (e.g. GPTBot, ClaudeBot, PerplexityBot)'),
  limit: z.number().min(1).max(100).optional().describe('Max results for top pages/topics (default 20)'),
});

// ---- Handlers ----

export async function getAgentAnalytics(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getAgentAnalyticsSchema>
): Promise<string> {
  const data = await apiClient.getAgentAnalytics({
    days: args.days,
    botType: args.botType,
    limit: args.limit,
  });

  const lines: string[] = [
    `## AI Bot Crawl Analytics (last ${data.period.days} days)\n`,
    `**Total bot visits:** ${data.bots.total}`,
    '',
    '### Bot Types',
    ...data.bots.types.map(b => `- ${b.type}: ${b.count} visits`),
    '',
    '### Top Pages Crawled',
    ...data.topPages.slice(0, 15).map((p, i) => `${i + 1}. ${p.page} (${p.count} crawls)`),
    '',
    '### Top Cited Domains',
    ...data.topCitedDomains.slice(0, 10).map(d => `- ${d.domain}: ${d.count} citations`),
    '',
    '### Top Topics',
    ...data.topTopics.slice(0, 10).map(t => `- ${t.topic}: ${t.count}`),
  ];

  if (data.trackedSites.length > 0) {
    lines.push('', '### Tracked Sites');
    data.trackedSites.forEach(s => lines.push(`- ${s.name} (${s.domain})`));
  }

  return lines.join('\n');
}

// ---- Tool Definitions ----

export const agentAnalyticsTools = [
  {
    name: 'get_agent_analytics',
    description: 'Get AI bot crawl analytics: which AI bots (GPTBot, ClaudeBot, PerplexityBot, etc.) are visiting your site, which pages they crawl most, and content performance signals.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Number of days to look back (default 30, max 90)' },
        botType: { type: 'string', description: 'Filter by specific bot type (e.g. GPTBot, ClaudeBot, PerplexityBot)' },
        limit: { type: 'number', description: 'Max results for top pages/topics (default 20)' },
      },
    },
  },
];
