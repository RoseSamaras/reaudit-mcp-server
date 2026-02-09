/**
 * Analytics Query Tools
 * 
 * MCP tools for flexible BI-style analytics queries.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

export const queryAnalyticsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  metrics: z.array(z.enum(['mentions', 'citations', 'sentiment', 'visibility_rate']))
    .describe('Metrics to compute'),
  dimensions: z.array(z.enum(['platform', 'date', 'week', 'month', 'sentimentLabel']))
    .optional()
    .describe('Dimensions to group by'),
  timeGrain: z.enum(['day', 'week', 'month']).optional()
    .describe('Time grain for date dimensions (default: day)'),
  days: z.number().optional()
    .describe('Number of days to analyze (default: 30, max: 90)'),
  filters: z.object({
    platform: z.string().optional(),
    sentimentMin: z.number().optional(),
    sentimentMax: z.number().optional(),
    hasCitations: z.boolean().optional(),
  }).optional().describe('Filters to apply'),
  limit: z.number().optional()
    .describe('Max rows to return (default: 100, max: 500)'),
});

/**
 * Execute a flexible analytics query
 */
export async function queryAnalytics(
  client: ReauditAPIClient,
  args: z.infer<typeof queryAnalyticsSchema>
): Promise<string> {
  const result = await client.queryAnalytics({
    projectId: args.projectId,
    metrics: args.metrics,
    dimensions: args.dimensions,
    timeGrain: args.timeGrain,
    days: args.days,
    filters: args.filters,
    limit: args.limit,
  });

  let response = `## Analytics Query Results for ${result.brandName}\n`;
  response += `Period: Last ${result.period} | Time grain: ${result.timeGrain}\n`;
  response += `Metrics: ${result.metrics.join(', ')} | Dimensions: ${(result.dimensions || []).join(', ') || 'none'}\n\n`;

  if (result.results && result.results.length > 0) {
    // Build a simple table
    const cols = Object.keys(result.results[0]);
    response += `| ${cols.join(' | ')} |\n`;
    response += `| ${cols.map(() => '---').join(' | ')} |\n`;
    
    for (const row of result.results) {
      const values = cols.map(c => row[c] ?? '-');
      response += `| ${values.join(' | ')} |\n`;
    }
    
    response += `\nTotal rows: ${result.count}\n`;
  } else {
    response += 'No data found for the given query.\n';
  }

  return response;
}

/**
 * Tool definitions for MCP
 */
export const analyticsQueryTools = [
  {
    name: 'query_analytics',
    description: 'Execute a flexible analytics query with custom metrics (mentions, citations, sentiment, visibility_rate), dimensions (platform, date, week, month), filters, and time grains. Use this for building custom reports and dashboards.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The ID of the project' },
        metrics: {
          type: 'array',
          items: { type: 'string', enum: ['mentions', 'citations', 'sentiment', 'visibility_rate'] },
          description: 'Metrics to compute',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string', enum: ['platform', 'date', 'week', 'month', 'sentimentLabel'] },
          description: 'Dimensions to group by',
        },
        timeGrain: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'Time grain for date dimensions (default: day)',
        },
        days: { type: 'number', description: 'Number of days (default: 30, max: 90)' },
        filters: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            sentimentMin: { type: 'number' },
            sentimentMax: { type: 'number' },
            hasCitations: { type: 'boolean' },
          },
          description: 'Filters to apply',
        },
        limit: { type: 'number', description: 'Max rows (default: 100, max: 500)' },
      },
      required: ['projectId', 'metrics'],
    },
  },
];
