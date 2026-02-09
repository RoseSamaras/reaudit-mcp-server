/**
 * Publishing Tools
 * 
 * MCP tools for publishing content to WordPress, React/webhooks, and other platforms.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// ============ WordPress Schemas ============

export const listWordPressConnectionsSchema = z.object({});

export const publishToWordPressSchema = z.object({
  contentId: z.string().describe('The ID of the content to publish'),
  connectionId: z.string().describe('The WordPress connection ID to publish to'),
  status: z.enum(['draft', 'publish']).optional().describe('Publish status: draft (default) or publish'),
  categories: z.array(z.string()).optional().describe('Category names to assign'),
  tags: z.array(z.string()).optional().describe('Tag names to assign'),
});

// ============ React/Webhook Schemas ============

export const listReactConnectionsSchema = z.object({});

export const publishToReactSchema = z.object({
  contentId: z.string().describe('The ID of the content to publish'),
  connectionId: z.string().describe('The React connection ID to publish to'),
  section: z.string().optional().describe('Target section ID (e.g., blog, news) if the connection has multiple sections'),
});

// ============ WordPress Handlers ============

/**
 * List WordPress connections tool handler
 */
export async function listWordPressConnections(
  client: ReauditAPIClient,
  _args: z.infer<typeof listWordPressConnectionsSchema>
): Promise<string> {
  const result = await client.listWordPressConnections();
  
  if (result.connections.length === 0) {
    return 'No WordPress connections found. Connect a WordPress site in the Reaudit dashboard under Settings > Integrations.';
  }
  
  let response = `## WordPress Connections (${result.connections.length})\n\n`;
  
  for (const conn of result.connections) {
    const statusIcon = conn.isVerified ? '✅' : '⚠️';
    
    response += `### ${conn.siteName}\n`;
    response += `- **ID:** ${conn.id}\n`;
    response += `- **Site URL:** ${conn.siteUrl}\n`;
    response += `- **Status:** ${statusIcon} ${conn.isVerified ? 'Verified' : 'Not Verified'}\n`;
    response += `- **Stats:** ${conn.totalPublished} published, ${conn.totalDrafts} drafts\n`;
    if (conn.lastPublishedAt) {
      response += `- **Last Published:** ${new Date(conn.lastPublishedAt).toLocaleDateString()}\n`;
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Publish to WordPress tool handler
 */
export async function publishToWordPress(
  client: ReauditAPIClient,
  args: z.infer<typeof publishToWordPressSchema>
): Promise<string> {
  const result = await client.publishToWordPress({
    contentId: args.contentId,
    connectionId: args.connectionId,
    status: args.status || 'draft',
    categories: args.categories,
    tags: args.tags,
  });
  
  if (!result.success || !result.post) {
    return `Failed to publish to WordPress: ${result.error || 'Unknown error'}`;
  }
  
  const post = result.post;
  const statusText = post.status === 'published' ? 'Published' : 'Saved as draft';
  
  let response = `## ${statusText} to WordPress!\n\n`;
  response += `- **Title:** ${post.title}\n`;
  response += `- **WordPress Post ID:** ${post.wordpressPostId}\n`;
  response += `- **URL:** ${post.wordpressUrl}\n`;
  response += `- **Status:** ${post.status}\n`;
  if (post.publishedAt) {
    response += `- **Published At:** ${new Date(post.publishedAt).toLocaleString()}\n`;
  }
  
  response += `\nContent successfully ${post.status === 'published' ? 'published' : 'saved'} to WordPress.`;
  
  return response;
}

// ============ React/Webhook Handlers ============

/**
 * List React connections tool handler
 */
export async function listReactConnections(
  client: ReauditAPIClient,
  _args: z.infer<typeof listReactConnectionsSchema>
): Promise<string> {
  const result = await client.listReactConnections();
  
  if (result.connections.length === 0) {
    return 'No React/webhook connections found. Set up a React connection in the Reaudit dashboard under Settings > Integrations.';
  }
  
  let response = `## React/Webhook Connections (${result.connections.length})\n\n`;
  
  for (const conn of result.connections) {
    const statusIcon = conn.isActive ? '✅' : '⚠️';
    
    response += `### ${conn.siteName}\n`;
    response += `- **ID:** ${conn.id}\n`;
    response += `- **Site URL:** ${conn.siteUrl}\n`;
    response += `- **Status:** ${statusIcon} ${conn.isActive ? 'Active' : 'Inactive'}\n`;
    response += `- **Webhook:** ${conn.webhookUrl ? 'Configured' : 'Not configured'}\n`;
    
    if (conn.contentSections && conn.contentSections.length > 0) {
      response += `- **Sections:** ${conn.contentSections.map(s => s.name).join(', ')}\n`;
    }
    
    response += '\n';
  }
  
  return response;
}

/**
 * Publish to React/webhook tool handler
 */
export async function publishToReact(
  client: ReauditAPIClient,
  args: z.infer<typeof publishToReactSchema>
): Promise<string> {
  const result = await client.publishToReact({
    contentId: args.contentId,
    connectionId: args.connectionId,
    section: args.section,
  });
  
  if (!result.success) {
    return `❌ Failed to publish: ${result.error || 'Unknown error'}`;
  }
  
  let response = `## Published via Webhook!\n\n`;
  response += `- **Content ID:** ${result.contentId}\n`;
  response += `- **Slug:** ${result.slug}\n`;
  if (result.section) {
    response += `- **Section:** ${result.section}\n`;
  }
  response += `- **Webhook Sent:** ${result.webhookSent ? '✅ Yes' : '⚠️ No webhook URL configured'}\n`;
  
  response += `\n✅ Content marked as published. `;
  if (result.webhookSent) {
    response += `Your site has been notified via webhook with a download URL to fetch the content.`;
  } else {
    response += `Configure a webhook URL in your React connection to receive notifications.`;
  }
  
  return response;
}

// ============ Tool Definitions ============

export const publishingTools = [
  {
    name: 'list_wordpress_connections',
    description: 'List all connected WordPress sites. Use this to find the connectionId needed for publishing.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'publish_to_wordpress',
    description: 'Publish content to a WordPress site. Includes schema markup and markdown for AI search visibility.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        contentId: {
          type: 'string',
          description: 'The ID of the content to publish',
        },
        connectionId: {
          type: 'string',
          description: 'The WordPress connection ID (get from list_wordpress_connections)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'publish'],
          description: 'Publish status: draft (default) or publish',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Category names to assign (will be created if they don\'t exist)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names to assign (will be created if they don\'t exist)',
        },
      },
      required: ['contentId', 'connectionId'],
    },
  },
  {
    name: 'list_react_connections',
    description: 'List all React/webhook connections for headless CMS publishing.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'publish_to_react',
    description: 'Publish content via webhook to a React/Next.js site. Sends a notification with a download URL for the content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        contentId: {
          type: 'string',
          description: 'The ID of the content to publish',
        },
        connectionId: {
          type: 'string',
          description: 'The React connection ID (get from list_react_connections)',
        },
        section: {
          type: 'string',
          description: 'Target section ID (e.g., blog, news) if the connection has multiple sections',
        },
      },
      required: ['contentId', 'connectionId'],
    },
  },
];
