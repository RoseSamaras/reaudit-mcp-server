/**
 * MCP Tools - Analytics Hub
 * Unified analytics across all connected sources (GA4, GSC, Bing, Clarity, Reaudit tracking)
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getAnalyticsHubSchema = z.object({
  projectId: z.string(),
  section: z.enum(['overview', 'behavior', 'pages', 'compare']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  compareStartDate: z.string().optional(),
  compareEndDate: z.string().optional(),
});

export const listAnalyticsAlertsSchema = z.object({
  projectId: z.string(),
});

export const createAnalyticsAlertSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  metric: z.enum([
    'sessions', 'pageViews', 'bounceRate', 'botCrawls',
    'aiReferrals', 'searchClicks', 'searchPosition',
    'avgScrollDepth', 'avgTimeOnPage',
  ]),
  condition: z.enum(['above', 'below', 'drops_by', 'increases_by']),
  threshold: z.number(),
  source: z.enum(['ga4', 'gsc', 'bing', 'tracking']),
});

export const deleteAnalyticsAlertSchema = z.object({
  alertId: z.string(),
});

// ---- Handlers ----

export async function getAnalyticsHub(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getAnalyticsHubSchema>
): Promise<string> {
  const data = await apiClient.getAnalyticsHub(args.projectId, {
    startDate: args.startDate,
    endDate: args.endDate,
    section: args.section || 'overview',
    compareStartDate: args.compareStartDate,
    compareEndDate: args.compareEndDate,
  });

  const sources = data.sources as Record<string, unknown> | undefined;
  const section = args.section || 'overview';
  const lines: string[] = ['## Analytics Hub\n'];

  if (sources) {
    const connected: string[] = [];
    if (sources.ga4) connected.push('GA4');
    if (sources.gsc) connected.push('GSC');
    if (sources.bing) connected.push('Bing');
    if (sources.clarity) connected.push('Clarity');
    if (sources.tracking) connected.push(`Reaudit (${sources.tracking})`);
    lines.push(`**Connected sources:** ${connected.length > 0 ? connected.join(', ') : 'None'}\n`);
  }

  if (section === 'overview') {
    formatOverview(data, lines);
  } else if (section === 'behavior') {
    formatBehavior(data, lines);
  } else if (section === 'pages') {
    formatPages(data, lines);
  } else if (section === 'compare') {
    formatCompare(data, lines);
  }

  return lines.join('\n');
}

export async function listAnalyticsAlerts(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof listAnalyticsAlertsSchema>
): Promise<string> {
  const result = await apiClient.getAnalyticsAlerts(args.projectId);
  const alerts = result.alerts || [];

  if (alerts.length === 0) {
    return '## Analytics Alerts\n\nNo alerts configured. Create one with `create_analytics_alert`.';
  }

  const lines = [`## Analytics Alerts (${alerts.length})\n`];

  for (const a of alerts) {
    const status = a.isActive ? '🟢 Active' : '⚪ Paused';
    const triggered = a.lastTriggeredAt
      ? `Last triggered: ${new Date(a.lastTriggeredAt as string).toLocaleDateString()}`
      : 'Never triggered';
    const lastVal = a.lastValue !== undefined ? ` | Last value: ${a.lastValue}` : '';
    lines.push(
      `- **${a.name}** (${status})`,
      `  ${a.metric} ${a.condition} ${a.threshold} [${(a.source as string).toUpperCase()}]`,
      `  ${triggered}${lastVal}`,
      '',
    );
  }

  return lines.join('\n');
}

export async function createAnalyticsAlert(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof createAnalyticsAlertSchema>
): Promise<string> {
  const result = await apiClient.createAnalyticsAlert(args);
  const alert = result.alert;
  return `Alert created successfully: **${alert.name}** — ${alert.metric} ${alert.condition} ${alert.threshold} [${(alert.source as string).toUpperCase()}]`;
}

export async function deleteAnalyticsAlert(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof deleteAnalyticsAlertSchema>
): Promise<string> {
  await apiClient.deleteAnalyticsAlert(args.alertId);
  return `Alert ${args.alertId} deleted successfully.`;
}

// ---- Formatters ----

function num(v: unknown): string {
  if (v === null || v === undefined) return 'N/A';
  const n = Number(v);
  if (isNaN(n)) return 'N/A';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatOverview(data: Record<string, unknown>, lines: string[]): void {
  const ga4 = data.ga4 as Record<string, unknown> | undefined;
  const gsc = data.gsc as Record<string, unknown> | undefined;
  const bing = data.bing as Record<string, unknown> | undefined;
  const tracking = data.tracking as Record<string, unknown> | undefined;

  if (ga4) {
    const ov = ga4.overview as Record<string, unknown> | undefined;
    if (ov) {
      lines.push(
        '### GA4 Overview',
        `- Sessions: ${num(ov.sessions)}`,
        `- Users: ${num(ov.users)}`,
        `- Page Views: ${num(ov.pageViews)}`,
        `- Bounce Rate: ${ov.bounceRate ? `${(Number(ov.bounceRate) * 100).toFixed(1)}%` : 'N/A'}`,
        '',
      );
    }
    const sources = ga4.sources as Array<Record<string, unknown>> | undefined;
    if (sources && sources.length > 0) {
      lines.push('### Top Traffic Sources (GA4)');
      sources.slice(0, 10).forEach((s, i) => {
        lines.push(`${i + 1}. ${s.source || 'unknown'} — ${num(s.sessions)} sessions`);
      });
      lines.push('');
    }
  }

  if (gsc) {
    const ov = gsc.overview as Record<string, unknown> | undefined;
    if (ov) {
      lines.push(
        '### Google Search Console',
        `- Clicks: ${num(ov.totalClicks)}`,
        `- Impressions: ${num(ov.totalImpressions)}`,
        `- CTR: ${ov.avgCtr ? `${(Number(ov.avgCtr) * 100).toFixed(1)}%` : 'N/A'}`,
        `- Avg Position: ${ov.avgPosition ? Number(ov.avgPosition).toFixed(1) : 'N/A'}`,
        '',
      );
    }
    const queries = gsc.queries as Array<Record<string, unknown>> | undefined;
    if (queries && queries.length > 0) {
      lines.push('### Top Search Queries (GSC)');
      queries.slice(0, 10).forEach((q, i) => {
        const keyword = (q.keys as string[])?.[0] || q.query || 'unknown';
        lines.push(`${i + 1}. "${keyword}" — ${num(q.clicks)} clicks, pos ${Number(q.position).toFixed(1)}`);
      });
      lines.push('');
    }
  }

  if (bing) {
    const traffic = bing.traffic as Array<Record<string, number>> | undefined;
    if (traffic && traffic.length > 0) {
      const totalClicks = traffic.reduce((s, t) => s + (t.Clicks || 0), 0);
      const totalImpressions = traffic.reduce((s, t) => s + (t.Impressions || 0), 0);
      lines.push(
        '### Bing Webmaster',
        `- Total Clicks: ${num(totalClicks)}`,
        `- Total Impressions: ${num(totalImpressions)}`,
        '',
      );
    }
  }

  if (tracking) {
    lines.push(
      `### Reaudit Tracking (${tracking.platform || 'unknown'})`,
      `- Page Views: ${num(tracking.pageViews)}`,
      `- Unique Visitors: ${num(tracking.uniqueVisitors)}`,
      `- Bot Crawls: ${num(tracking.botCrawls)}`,
      `- AI Referrals: ${num(tracking.aiReferrals)}`,
      `- Avg Scroll Depth: ${tracking.avgScrollDepth ? `${tracking.avgScrollDepth}%` : 'N/A'}`,
      `- Avg Time on Page: ${tracking.avgTimeOnPage ? `${tracking.avgTimeOnPage}s` : 'N/A'}`,
      '',
    );
  }
}

function formatBehavior(data: Record<string, unknown>, lines: string[]): void {
  const scrollDist = data.scrollDistribution as Array<Record<string, unknown>> | undefined;
  const exitPages = data.topExitPages as Array<Record<string, unknown>> | undefined;
  const clickTargets = data.topClickTargets as Array<Record<string, unknown>> | undefined;

  if (scrollDist && scrollDist.length > 0) {
    lines.push('### Scroll Depth Distribution');
    for (const d of scrollDist) {
      lines.push(`- ${d._id}%: ${d.count} exits`);
    }
    lines.push('');
  }

  if (exitPages && exitPages.length > 0) {
    lines.push('### Top Exit Pages');
    exitPages.slice(0, 15).forEach((p, i) => {
      const avgTime = p.avgTimeOnPage ? ` (avg ${Math.round(Number(p.avgTimeOnPage))}s)` : '';
      lines.push(`${i + 1}. ${p._id} — ${p.exits} exits${avgTime}`);
    });
    lines.push('');
  }

  if (clickTargets && clickTargets.length > 0) {
    lines.push('### Top Click Targets');
    clickTargets.slice(0, 15).forEach((c, i) => {
      lines.push(`${i + 1}. ${c._id} — ${c.clicks} clicks`);
    });
    lines.push('');
  }

  if (data.clarityDashboardUrl) {
    lines.push(
      '### Microsoft Clarity',
      `- Dashboard: ${data.clarityDashboardUrl}`,
      `- Heatmaps: ${data.clarityHeatmapUrl || 'N/A'}`,
      `- Recordings: ${data.clarityRecordingsUrl || 'N/A'}`,
      '',
    );
  }

  if (!scrollDist?.length && !exitPages?.length && !clickTargets?.length && !data.clarityDashboardUrl) {
    lines.push('No behavior data available. Install the Reaudit tracking script to capture scroll, click, and exit data.');
  }
}

function formatPages(data: Record<string, unknown>, lines: string[]): void {
  const ga4Pages = data.ga4Pages as Array<Record<string, unknown>> | undefined;
  const gscPages = data.gscPages as Array<Record<string, unknown>> | undefined;
  const trackingPages = data.trackingPages as Array<Record<string, unknown>> | undefined;

  if (ga4Pages && ga4Pages.length > 0) {
    lines.push('### Top Pages (GA4)');
    lines.push('| Page | Sessions | Users |');
    lines.push('|------|----------|-------|');
    ga4Pages.slice(0, 15).forEach(p => {
      lines.push(`| ${p.pagePath || p.page} | ${num(p.sessions)} | ${num(p.users)} |`);
    });
    lines.push('');
  }

  if (gscPages && gscPages.length > 0) {
    lines.push('### Top Pages (GSC)');
    lines.push('| Page | Clicks | Impressions | Position |');
    lines.push('|------|--------|-------------|----------|');
    gscPages.slice(0, 15).forEach(p => {
      const page = (p.keys as string[])?.[0] || p.page || '';
      lines.push(`| ${page} | ${num(p.clicks)} | ${num(p.impressions)} | ${Number(p.position).toFixed(1)} |`);
    });
    lines.push('');
  }

  if (trackingPages && trackingPages.length > 0) {
    lines.push('### Top Pages (Reaudit Tracking)');
    lines.push('| Page | Views | Bots | AI Referrals | Scroll % | Time (s) |');
    lines.push('|------|-------|------|-------------|----------|----------|');
    trackingPages.slice(0, 15).forEach(p => {
      lines.push(`| ${p.pagePath || p._id} | ${num(p.pageViews)} | ${num(p.botCrawls)} | ${num(p.aiReferrals)} | ${p.avgScrollDepth ?? 'N/A'} | ${p.avgTimeOnPage ?? 'N/A'} |`);
    });
    lines.push('');
  }

  if (!ga4Pages?.length && !gscPages?.length && !trackingPages?.length) {
    lines.push('No page data available.');
  }
}

function formatCompare(data: Record<string, unknown>, lines: string[]): void {
  const current = data.current as Record<string, unknown> | undefined;
  const previous = data.previous as Record<string, unknown> | undefined;

  if (!current || !previous) {
    lines.push('No comparison data. Provide compareStartDate and compareEndDate parameters.');
    return;
  }

  lines.push('### Period Comparison');
  lines.push('| Metric | Source | Current | Previous | Change |');
  lines.push('|--------|--------|---------|----------|--------|');

  const addRow = (label: string, source: string, cur: number | null | undefined, prev: number | null | undefined, fmt?: string) => {
    const fmtVal = (v: number | null | undefined) => {
      if (v == null) return 'N/A';
      if (fmt === 'pct') return `${(Number(v) * 100).toFixed(1)}%`;
      if (fmt === 'dec') return Number(v).toFixed(1);
      return num(v);
    };
    let change = 'N/A';
    if (cur != null && prev != null && prev !== 0) {
      const pct = ((Number(cur) - Number(prev)) / Math.abs(Number(prev))) * 100;
      change = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    }
    lines.push(`| ${label} | ${source} | ${fmtVal(cur)} | ${fmtVal(prev)} | ${change} |`);
  };

  const curGa4 = (current.ga4 as Record<string, unknown>)?.overview as Record<string, unknown> | undefined;
  const prevGa4 = (previous.ga4 as Record<string, unknown>)?.overview as Record<string, unknown> | undefined;
  if (curGa4 || prevGa4) {
    addRow('Sessions', 'GA4', curGa4?.sessions as number, prevGa4?.sessions as number);
    addRow('Users', 'GA4', curGa4?.users as number, prevGa4?.users as number);
    addRow('Bounce Rate', 'GA4', curGa4?.bounceRate as number, prevGa4?.bounceRate as number, 'pct');
  }

  const curGsc = (current.gsc as Record<string, unknown>)?.overview as Record<string, unknown> | undefined;
  const prevGsc = (previous.gsc as Record<string, unknown>)?.overview as Record<string, unknown> | undefined;
  if (curGsc || prevGsc) {
    addRow('Search Clicks', 'GSC', curGsc?.totalClicks as number, prevGsc?.totalClicks as number);
    addRow('Impressions', 'GSC', curGsc?.totalImpressions as number, prevGsc?.totalImpressions as number);
    addRow('Avg Position', 'GSC', curGsc?.avgPosition as number, prevGsc?.avgPosition as number, 'dec');
  }

  const curTracking = current.tracking as Record<string, unknown> | undefined;
  const prevTracking = previous.tracking as Record<string, unknown> | undefined;
  if (curTracking || prevTracking) {
    addRow('Page Views', 'Tracking', curTracking?.pageViews as number, prevTracking?.pageViews as number);
    addRow('Bot Crawls', 'Tracking', curTracking?.botCrawls as number, prevTracking?.botCrawls as number);
    addRow('AI Referrals', 'Tracking', curTracking?.aiReferrals as number, prevTracking?.aiReferrals as number);
  }

  lines.push('');
}

// ---- Tool Definitions ----

export const analyticsHubTools = [
  {
    name: 'get_analytics_hub',
    description: 'Get unified analytics data across all connected sources (GA4, GSC, Bing, Clarity, Reaudit tracking) in a single call. Sections: overview (KPIs, charts), behavior (scroll depth, clicks, exits), pages (per-page metrics), compare (period-over-period).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        section: { type: 'string', description: 'Data section: overview, behavior, pages, or compare (default: overview)' },
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD). Default: 30 days ago' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD). Default: today' },
        compareStartDate: { type: 'string', description: 'Comparison period start date (for section=compare)' },
        compareEndDate: { type: 'string', description: 'Comparison period end date (for section=compare)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_analytics_alerts',
    description: 'List all analytics alerts for a project. Alerts monitor metrics like sessions, bot crawls, AI referrals and notify via email when thresholds are crossed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_analytics_alert',
    description: 'Create an analytics alert that monitors a metric and sends email notifications when a threshold condition is met. Checked every 6 hours.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        name: { type: 'string', description: 'Alert name (e.g. "Bot crawl spike")' },
        metric: { type: 'string', description: 'Metric to monitor: sessions, pageViews, bounceRate, botCrawls, aiReferrals, searchClicks, searchPosition, avgScrollDepth, avgTimeOnPage' },
        condition: { type: 'string', description: 'Condition: above, below, drops_by, increases_by' },
        threshold: { type: 'number', description: 'Threshold value. For drops_by/increases_by this is a percentage.' },
        source: { type: 'string', description: 'Data source: ga4, gsc, bing, or tracking' },
      },
      required: ['projectId', 'name', 'metric', 'condition', 'threshold', 'source'],
    },
  },
  {
    name: 'delete_analytics_alert',
    description: 'Delete an analytics alert by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        alertId: { type: 'string', description: 'The alert ID to delete' },
      },
      required: ['alertId'],
    },
  },
];
