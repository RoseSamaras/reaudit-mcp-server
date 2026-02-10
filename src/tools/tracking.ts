/**
 * MCP Tools - Site Tracking Analytics
 * WordPress AI Referral Performance, Page Citations, Webflow & Wix bot tracking
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getAiReferralPerformanceSchema = z.object({
  projectId: z.string().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d']).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const getPageCitationsSchema = z.object({
  projectId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const getPlatformTrackingSchema = z.object({
  projectId: z.string().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d']).optional(),
});

// ---- Handlers ----

export async function getAiReferralPerformance(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getAiReferralPerformanceSchema>
): Promise<string> {
  const data = await apiClient.getWordPressReferralPerformance({
    projectId: args.projectId,
    timeRange: args.timeRange,
    limit: args.limit,
  }) as Record<string, unknown>;

  const articles = (data.articles || []) as Array<Record<string, unknown>>;
  const stats = (data.stats || {}) as Record<string, unknown>;
  const topSources = (data.topSources || []) as Array<Record<string, unknown>>;

  const lines: string[] = [
    `## AI Referral Performance (${args.timeRange || '30d'})\n`,
    `**Total AI referrals:** ${stats.totalAiReferrals || 0}`,
    `**Unique articles cited:** ${stats.uniqueArticles || 0}`,
    '',
    '### Top AI Sources',
    ...topSources.map(s => `- ${s.source}: ${s.count} referrals`),
    '',
    '### Articles by AI Referral Volume',
    ...articles.slice(0, 20).map((a, i) =>
      `${i + 1}. **${a.pageTitle || a.pagePath}** — ${a.totalReferrals} referrals from ${a.uniqueSourceCount} sources`
    ),
  ];

  return lines.join('\n');
}

export async function getPageCitations(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getPageCitationsSchema>
): Promise<string> {
  const data = await apiClient.getWordPressPageCitations({
    projectId: args.projectId,
    limit: args.limit,
  }) as Record<string, unknown>;

  const citations = (data.citations || []) as Array<Record<string, unknown>>;
  const summary = (data.summary || {}) as Record<string, unknown>;

  const lines: string[] = [
    '## Page Citations (LLM Bot Crawls)\n',
    `**Total pages crawled:** ${summary.totalPages || 0}`,
    `**Total crawls:** ${summary.totalCrawls || 0}`,
    `**Avg crawls per page:** ${summary.avgCrawlsPerPage || 0}`,
    '',
    '### Pages (by crawl volume)',
    ...citations.slice(0, 25).map((c, i) =>
      `${i + 1}. **${c.pageTitle || c.pagePath}** — ${c.totalCrawls} crawls, ${c.uniqueBots} unique bots`
    ),
  ];

  return lines.join('\n');
}

export async function getWebflowTracking(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getPlatformTrackingSchema>
): Promise<string> {
  const data = await apiClient.getWebflowTracking({
    projectId: args.projectId,
    timeRange: args.timeRange,
  }) as Record<string, unknown>;

  return formatPlatformTracking('Webflow', data);
}

export async function getWixTracking(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getPlatformTrackingSchema>
): Promise<string> {
  const data = await apiClient.getWixTracking({
    projectId: args.projectId,
    timeRange: args.timeRange,
  }) as Record<string, unknown>;

  return formatPlatformTracking('Wix', data);
}

function formatPlatformTracking(platform: string, data: Record<string, unknown>): string {
  const stats = (data.stats || {}) as Record<string, unknown>;
  const botTypes = (data.botTypes || []) as Array<Record<string, unknown>>;
  const topPages = (data.topPages || []) as Array<Record<string, unknown>>;

  const lines: string[] = [
    `## ${platform} Bot Tracking (${data.timeRange || '7d'})\n`,
    `**Total events:** ${stats.totalEvents || 0}`,
    `**Bot events:** ${stats.botEvents || 0}`,
    `**Human events:** ${stats.humanEvents || 0}`,
    '',
    '### Bot Types',
    ...botTypes.map(b => `- ${b.type}: ${b.count}`),
    '',
    '### Top Pages',
    ...topPages.slice(0, 15).map((p, i) => `${i + 1}. ${p.title || p.page} (${p.count} bot visits)`),
  ];

  return lines.join('\n');
}

// ---- Tool Definitions ----

export const trackingTools = [
  {
    name: 'get_ai_referral_performance',
    description: 'Get AI referral performance for WordPress articles. Shows which articles get traffic from AI engines (ChatGPT, Perplexity, etc.), top referral sources, and performance scores.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        timeRange: { type: 'string', description: 'Time range: 24h, 7d, 30d, 90d (default 30d)' },
        limit: { type: 'number', description: 'Max articles to return (default 50)' },
      },
    },
  },
  {
    name: 'get_page_citations',
    description: 'Get page citations — which of your pages are being crawled by LLM bots (GPTBot, ClaudeBot, etc.), how often, and by which bots.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        limit: { type: 'number', description: 'Max citations to return (default 50)' },
      },
    },
  },
  {
    name: 'get_webflow_tracking',
    description: 'Get Webflow site bot tracking analytics. Shows AI bot visits, bot type breakdown, and top crawled pages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        timeRange: { type: 'string', description: 'Time range: 24h, 7d, 30d, 90d (default 7d)' },
      },
    },
  },
  {
    name: 'get_wix_tracking',
    description: 'Get Wix site bot tracking analytics. Shows AI bot visits, bot type breakdown, and top crawled pages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        timeRange: { type: 'string', description: 'Time range: 24h, 7d, 30d, 90d (default 7d)' },
      },
    },
  },
];
