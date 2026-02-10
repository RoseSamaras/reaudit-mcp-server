/**
 * MCP Tools - SEO Alerts
 * Read unread SEO alerts and alert summaries
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getSeoAlertsSchema = z.object({
  type: z.enum(['unread', 'summary']).optional(),
});

// ---- Handlers ----

export async function getSeoAlerts(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getSeoAlertsSchema>
): Promise<string> {
  const alertType = args.type || 'unread';
  const data = await apiClient.getSeoAlerts(alertType);

  if (alertType === 'summary') {
    return `## SEO Alert Summary\n\n${JSON.stringify(data, null, 2)}`;
  }

  const alerts = ((data as Record<string, unknown>).alerts || []) as Array<Record<string, unknown>>;

  if (alerts.length === 0) {
    return 'No unread SEO alerts. Everything looks good!';
  }

  const lines: string[] = [
    `## Unread SEO Alerts (${alerts.length})\n`,
    ...alerts.map((a, i) => {
      const severity = (a.severity as string || 'info').toUpperCase();
      const change = a.changePercentage ? ` (${a.changePercentage}% change)` : '';
      return `${i + 1}. [${severity}] **${a.alertType}**${change}\n   ${a.message}\n   ${a.url ? `URL: ${a.url}` : ''}`;
    }),
  ];

  return lines.join('\n');
}

// ---- Tool Definitions ----

export const seoAlertTools = [
  {
    name: 'get_seo_alerts',
    description: 'Get SEO alerts for your account. Shows unread alerts (visibility drops, crawl issues, ranking changes) or a summary of all alert activity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', description: 'Alert type: "unread" for all unread alerts, "summary" for aggregated alert summary (default: unread)' },
      },
    },
  },
];
