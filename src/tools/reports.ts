/**
 * Saved Reports Tools
 * 
 * MCP tools for managing saved analytics reports.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

export const listReportsSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  pinned: z.boolean().optional().describe('Only show pinned reports'),
  limit: z.number().optional().describe('Max reports to return (default: 20, max: 50)'),
});

export const createReportSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  name: z.string().describe('Report name'),
  description: z.string().optional().describe('Report description'),
  query: z.object({
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()).optional(),
    timeGrain: z.string().optional(),
    days: z.number().optional(),
    filters: z.any().optional(),
  }).describe('Analytics query configuration'),
  visualization: z.object({
    type: z.enum(['line', 'bar', 'pie', 'table', 'metric']).optional(),
    title: z.string().optional(),
  }).optional().describe('Visualization settings'),
  schedule: z.enum(['daily', 'weekly', 'monthly']).optional().describe('Auto-refresh schedule'),
  tags: z.array(z.string()).optional().describe('Tags for organization'),
  pinned: z.boolean().optional().describe('Pin to dashboard'),
});

export const getReportSchema = z.object({ id: z.string().describe('Report ID') });
export const deleteReportSchema = z.object({ id: z.string().describe('Report ID') });

/**
 * List saved reports
 */
export async function listReports(
  client: ReauditAPIClient,
  args: z.infer<typeof listReportsSchema>
): Promise<string> {
  const result = await client.listReports(args.projectId, args.pinned, args.limit);

  let response = `## Saved Reports\n`;
  response += `Total: ${result.count}\n\n`;

  if (result.reports.length === 0) {
    response += 'No saved reports found. Create one with create_report.\n';
    return response;
  }

  for (const report of result.reports) {
    response += `### ${report.pinned ? '📌 ' : ''}${report.name}\n`;
    if (report.description) response += `${report.description}\n`;
    response += `- ID: ${report.id}\n`;
    response += `- Metrics: ${report.query?.metrics?.join(', ')}\n`;
    response += `- Visualization: ${report.visualization?.type || 'table'}\n`;
    if (report.schedule) response += `- Schedule: ${report.schedule}\n`;
    if (report.tags?.length) response += `- Tags: ${report.tags.join(', ')}\n`;
    response += `- Updated: ${report.updatedAt}\n\n`;
  }

  return response;
}

/**
 * Create a saved report
 */
export async function createReport(
  client: ReauditAPIClient,
  args: z.infer<typeof createReportSchema>
): Promise<string> {
  const result = await client.createReport({
    projectId: args.projectId,
    name: args.name,
    description: args.description,
    query: args.query,
    visualization: args.visualization,
    schedule: args.schedule,
    tags: args.tags,
    pinned: args.pinned,
  });

  return `## Report Created\n\n- ID: ${result.id}\n- Name: ${result.name}\n- Metrics: ${result.query?.metrics?.join(', ')}\n- Visualization: ${result.visualization?.type || 'table'}\n`;
}

/**
 * Get a saved report
 */
export async function getReport(
  client: ReauditAPIClient,
  args: z.infer<typeof getReportSchema>
): Promise<string> {
  const report = await client.getReport(args.id);

  let response = `## ${report.pinned ? '📌 ' : ''}${report.name}\n`;
  if (report.description) response += `${report.description}\n\n`;
  response += `- ID: ${report.id}\n`;
  response += `- Project: ${report.projectId}\n`;
  response += `- Metrics: ${report.query?.metrics?.join(', ')}\n`;
  response += `- Dimensions: ${report.query?.dimensions?.join(', ') || 'none'}\n`;
  response += `- Time Grain: ${report.query?.timeGrain || 'day'}\n`;
  response += `- Days: ${report.query?.days || 30}\n`;
  response += `- Visualization: ${report.visualization?.type || 'table'}\n`;
  if (report.schedule) response += `- Schedule: ${report.schedule}\n`;
  if (report.tags?.length) response += `- Tags: ${report.tags.join(', ')}\n`;
  response += `\nTo execute this report's query, use query_analytics with the same parameters.\n`;

  return response;
}

/**
 * Delete a saved report
 */
export async function deleteReport(
  client: ReauditAPIClient,
  args: z.infer<typeof deleteReportSchema>
): Promise<string> {
  await client.deleteReport(args.id);
  return `Report ${args.id} has been deleted.`;
}

/**
 * Tool definitions for MCP
 */
export const reportsTools = [
  {
    name: 'list_reports',
    description: 'List saved analytics reports. Reports store reusable query configurations for dashboards.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        pinned: { type: 'boolean', description: 'Only show pinned reports' },
        limit: { type: 'number', description: 'Max reports (default: 20, max: 50)' },
      },
    },
  },
  {
    name: 'create_report',
    description: 'Create a saved analytics report with custom metrics, dimensions, filters, and visualization settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Report name' },
        description: { type: 'string', description: 'Report description' },
        query: {
          type: 'object',
          properties: {
            metrics: { type: 'array', items: { type: 'string' } },
            dimensions: { type: 'array', items: { type: 'string' } },
            timeGrain: { type: 'string', enum: ['day', 'week', 'month'] },
            days: { type: 'number' },
          },
          required: ['metrics'],
        },
        visualization: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['line', 'bar', 'pie', 'table', 'metric'] },
            title: { type: 'string' },
          },
        },
        schedule: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        tags: { type: 'array', items: { type: 'string' } },
        pinned: { type: 'boolean' },
      },
      required: ['projectId', 'name', 'query'],
    },
  },
  {
    name: 'get_report',
    description: 'Get details of a saved analytics report by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Report ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_report',
    description: 'Delete a saved analytics report.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Report ID' },
      },
      required: ['id'],
    },
  },
];
