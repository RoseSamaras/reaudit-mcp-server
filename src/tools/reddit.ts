/**
 * MCP Tools - Reddit Lead Monitoring
 * Monitor subreddits and manage identified leads
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const listRedditMonitorsSchema = z.object({
  projectId: z.string(),
});

export const getRedditLeadsSchema = z.object({
  projectId: z.string(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dismissed']).optional(),
  minScore: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const updateRedditLeadSchema = z.object({
  leadId: z.string(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'dismissed']),
  notes: z.string().optional(),
});

// ---- Handlers ----

export async function listRedditMonitors(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof listRedditMonitorsSchema>
): Promise<string> {
  const data = await apiClient.listRedditMonitors(args.projectId) as Record<string, unknown>;
  const monitors = (data.monitors || []) as Array<Record<string, unknown>>;

  if (monitors.length === 0) {
    return 'No Reddit monitors configured for this project.';
  }

  const lines: string[] = [
    `## Reddit Monitors (${monitors.length})\n`,
    ...monitors.map((m, i) => {
      const keywords = (m.keywords as string[]) || [];
      return `${i + 1}. **r/${m.subreddit}** ${m.displayName ? `(${m.displayName})` : ''}\n   Subscribers: ${m.subscribers || 'N/A'} | Posts found: ${m.postsFound || 0} | Leads: ${m.leadsIdentified || 0}\n   Keywords: ${keywords.join(', ') || 'none'}\n   Active: ${m.isActive ? 'Yes' : 'No'} | Last checked: ${m.lastChecked || 'never'}`;
    }),
  ];

  return lines.join('\n');
}

export async function getRedditLeads(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getRedditLeadsSchema>
): Promise<string> {
  const data = await apiClient.getRedditLeads(args.projectId, {
    status: args.status,
    minScore: args.minScore,
    limit: args.limit,
  }) as Record<string, unknown>;

  const leads = (data.leads || []) as Array<Record<string, unknown>>;

  if (leads.length === 0) {
    return 'No Reddit leads found matching your criteria.';
  }

  const lines: string[] = [
    `## Reddit Leads (${leads.length})\n`,
    ...leads.map((l, i) => {
      const keywords = (l.matchedKeywords as string[]) || [];
      return `${i + 1}. **${l.title}** (score: ${l.leadScore}/100)\n   r/${l.subreddit} by u/${l.author} | Status: ${l.status} | Intent: ${l.intent || 'N/A'}\n   Reason: ${l.leadReason || 'N/A'}\n   Keywords: ${keywords.join(', ')}\n   Link: https://reddit.com${l.permalink}`;
    }),
  ];

  return lines.join('\n');
}

export async function updateRedditLead(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof updateRedditLeadSchema>
): Promise<string> {
  const data = await apiClient.updateRedditLead(args.leadId, args.status, args.notes) as Record<string, unknown>;
  const lead = (data.lead || {}) as Record<string, unknown>;

  return `Lead updated (ID: ${lead.id})\nNew status: **${lead.status}**${lead.notes ? `\nNotes: ${lead.notes}` : ''}`;
}

// ---- Tool Definitions ----

export const redditTools = [
  {
    name: 'list_reddit_monitors',
    description: 'List monitored subreddits for a project. Shows active monitors, keywords tracked, and lead statistics.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID to list monitors for' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_reddit_leads',
    description: 'Get Reddit leads identified from monitored subreddits. Filter by status, minimum lead score, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID to get leads for' },
        status: { type: 'string', description: 'Filter by status: new, contacted, qualified, converted, dismissed' },
        minScore: { type: 'number', description: 'Minimum lead score to include (0-100)' },
        limit: { type: 'number', description: 'Max leads to return (default 50)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'update_reddit_lead',
    description: 'Update a Reddit lead status (new, contacted, qualified, converted, dismissed). Optionally add notes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string', description: 'The ID of the lead to update' },
        status: { type: 'string', description: 'New status: new, contacted, qualified, converted, dismissed' },
        notes: { type: 'string', description: 'Optional notes about the lead' },
      },
      required: ['leadId', 'status'],
    },
  },
];
