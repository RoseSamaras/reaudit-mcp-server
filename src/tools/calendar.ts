/**
 * Calendar Tools
 * 
 * MCP tools for content calendar management.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const getContentCalendarSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  startDate: z.string().optional().describe('Start date for filtering (ISO format)'),
  endDate: z.string().optional().describe('End date for filtering (ISO format)'),
  limit: z.number().optional().describe('Maximum number of events to return (default: 50)'),
});

/**
 * Get content calendar tool handler
 */
export async function getContentCalendar(
  client: ReauditAPIClient,
  args: z.infer<typeof getContentCalendarSchema>
): Promise<string> {
  const result = await client.getContentCalendar({
    projectId: args.projectId,
    startDate: args.startDate,
    endDate: args.endDate,
    limit: args.limit,
  });
  
  if (result.events.length === 0) {
    return 'No content calendar events found. Schedule content or create a GTM strategy to populate your calendar.';
  }
  
  let response = `## Content Calendar\n\n`;
  response += `### Summary\n`;
  response += `- **Total Events:** ${result.stats.total}\n`;
  response += `- **Social Media:** ${result.stats.socialMedia}\n`;
  response += `- **WordPress:** ${result.stats.wordpress}\n`;
  response += `- **Blog:** ${result.stats.blog}\n`;
  response += `- **Strategy Planned:** ${result.stats.strategyPlanned}\n\n`;
  
  response += `### Status Breakdown\n`;
  response += `- Planned: ${result.stats.planned}\n`;
  response += `- Scheduled: ${result.stats.scheduled}\n`;
  response += `- Published: ${result.stats.published}\n\n`;
  
  response += `### Events (${result.events.length})\n\n`;
  
  // Group events by date
  const eventsByDate = new Map<string, typeof result.events>();
  for (const event of result.events) {
    const dateKey = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  }
  
  for (const [date, events] of eventsByDate) {
    response += `#### ${date}\n`;
    for (const event of events) {
      const statusEmoji = event.status === 'published' ? '✅' : 
                          event.status === 'scheduled' ? '📅' : 
                          event.status === 'draft' ? '📝' : '📋';
      response += `- ${statusEmoji} **${event.title}**\n`;
      response += `  - Type: ${event.type} | Platform: ${event.platform} | Status: ${event.status}\n`;
      if (event.strategyName) {
        response += `  - Strategy: ${event.strategyName}`;
        if (event.weekNumber) response += ` (Week ${event.weekNumber})`;
        response += '\n';
      }
      if (event.url) {
        response += `  - URL: ${event.url}\n`;
      }
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const calendarTools = [
  {
    name: 'get_content_calendar',
    description: 'Get your content calendar showing all scheduled, planned, and published content across social media, WordPress, blog, and GTM strategy items. Filter by project, date range, or limit results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID (optional)',
        },
        startDate: {
          type: 'string',
          description: 'Start date for filtering in ISO format (e.g., 2024-01-01)',
        },
        endDate: {
          type: 'string',
          description: 'End date for filtering in ISO format (e.g., 2024-12-31)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 50)',
        },
      },
      required: [] as string[],
    },
  },
];
