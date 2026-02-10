/**
 * MCP Tools - Competitor Management
 * List, add, and delete tracked competitors
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const listCompetitorsSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const addCompetitorSchema = z.object({
  name: z.string(),
  url: z.string(),
  category: z.enum(['direct', 'indirect', 'aspirational']).optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const deleteCompetitorSchema = z.object({
  competitorId: z.string(),
});

// ---- Handlers ----

export async function listCompetitors(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof listCompetitorsSchema>
): Promise<string> {
  const data = await apiClient.listCompetitors({
    category: args.category,
    search: args.search,
    limit: args.limit,
  });

  const comps = data.competitors || [];

  if (comps.length === 0) {
    return 'No competitors found. Use `add_competitor` to start tracking competitors.';
  }

  const lines: string[] = [
    `## Competitors (${comps.length} of ${data.total})\n`,
    ...comps.map((c: Record<string, unknown>, i: number) => {
      const tags = c.tags as string[] | undefined;
      return `${i + 1}. **${c.name}** — ${c.domain}\n   Category: ${c.category || 'direct'} | Industry: ${c.industry || 'N/A'} | Uses: ${c.usageCount || 0}${tags && tags.length > 0 ? `\n   Tags: ${tags.join(', ')}` : ''}`;
    }),
  ];

  return lines.join('\n');
}

export async function addCompetitor(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof addCompetitorSchema>
): Promise<string> {
  const data = await apiClient.addCompetitor({
    name: args.name,
    url: args.url,
    category: args.category,
    industry: args.industry,
    tags: args.tags,
    description: args.description,
  });

  const comp = (data as Record<string, unknown>).competitor as Record<string, unknown>;
  return `Competitor added: **${comp.name}** (${comp.domain})\nCategory: ${comp.category}\nID: ${comp.id}`;
}

export async function deleteCompetitor(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof deleteCompetitorSchema>
): Promise<string> {
  await apiClient.deleteCompetitor(args.competitorId);
  return `Competitor deleted (ID: ${args.competitorId})`;
}

// ---- Tool Definitions ----

export const competitorTools = [
  {
    name: 'list_competitors',
    description: 'List your tracked competitors with filtering by category, search term, and pagination.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category: direct, indirect, aspirational' },
        search: { type: 'string', description: 'Search by name, domain, or tags' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'add_competitor',
    description: 'Add a new competitor to track. Provide name and URL at minimum.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Competitor name' },
        url: { type: 'string', description: 'Competitor website URL (e.g. https://example.com)' },
        category: { type: 'string', description: 'Category: direct, indirect, aspirational (default: direct)' },
        industry: { type: 'string', description: 'Industry or sector' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        description: { type: 'string', description: 'Brief description of the competitor' },
      },
      required: ['name', 'url'],
    },
  },
  {
    name: 'delete_competitor',
    description: 'Delete (deactivate) a tracked competitor by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        competitorId: { type: 'string', description: 'The ID of the competitor to delete' },
      },
      required: ['competitorId'],
    },
  },
];
