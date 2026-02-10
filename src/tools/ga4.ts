/**
 * MCP Tools - GA4 Analytics
 * Google Analytics 4 data access for connected projects
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getGA4AnalyticsSchema = z.object({
  projectId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metrics: z.string().optional(),
});

// ---- Handlers ----

export async function getGA4Analytics(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getGA4AnalyticsSchema>
): Promise<string> {
  const data = await apiClient.getGA4Analytics(args.projectId, {
    startDate: args.startDate,
    endDate: args.endDate,
    metrics: args.metrics,
  });

  const dateRange = (data.dateRange || {}) as Record<string, string>;
  const overview = data.overview as Record<string, unknown> | null;
  const sources = (data.trafficSources || []) as Array<Record<string, unknown>>;
  const pages = (data.topPages || []) as Array<Record<string, unknown>>;
  const aiReferrals = data.aiReferrals;

  const lines: string[] = [
    `## GA4 Analytics — ${data.propertyName || data.propertyId}`,
    `**Date range:** ${dateRange.startDate} to ${dateRange.endDate}\n`,
  ];

  if (overview) {
    lines.push(
      '### Traffic Overview',
      `- Sessions: ${(overview as Record<string, unknown>).sessions || 'N/A'}`,
      `- Users: ${(overview as Record<string, unknown>).totalUsers || 'N/A'}`,
      `- Pageviews: ${(overview as Record<string, unknown>).pageviews || 'N/A'}`,
      `- Bounce rate: ${(overview as Record<string, unknown>).bounceRate || 'N/A'}`,
      '',
    );
  }

  if (sources.length > 0) {
    lines.push('### Top Traffic Sources');
    sources.slice(0, 10).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.source || s.sessionSource || 'unknown'} — ${s.sessions || s.activeUsers || 0} sessions`);
    });
    lines.push('');
  }

  if (pages.length > 0) {
    lines.push('### Top Landing Pages');
    pages.slice(0, 10).forEach((p, i) => {
      lines.push(`${i + 1}. ${p.pagePath || p.landingPage || 'unknown'} — ${p.sessions || p.activeUsers || 0} sessions`);
    });
    lines.push('');
  }

  if (aiReferrals && Array.isArray(aiReferrals) && aiReferrals.length > 0) {
    lines.push('### AI Referral Traffic');
    aiReferrals.slice(0, 10).forEach((r: Record<string, unknown>, i: number) => {
      lines.push(`${i + 1}. ${r.source || 'unknown'} — ${r.sessions || r.activeUsers || 0} sessions`);
    });
  }

  return lines.join('\n');
}

// ---- Tool Definitions ----

export const ga4Tools = [
  {
    name: 'get_ga4_analytics',
    description: 'Get Google Analytics 4 data for a project. Includes traffic overview, sources, top pages, timeseries, and AI referral traffic. Requires an active GA4 connection.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID with an active GA4 connection' },
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD). Default: 30 days ago' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD). Default: today' },
        metrics: { type: 'string', description: 'Comma-separated metrics: overview, sources, pages, timeseries, ai_referrals (default: overview,sources,pages)' },
      },
      required: ['projectId'],
    },
  },
];
