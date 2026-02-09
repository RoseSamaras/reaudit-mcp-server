/**
 * Indexing Tools
 * 
 * MCP tools for website indexing management (IndexNow, GSC).
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const listIndexingConnectionsSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  activeOnly: z.boolean().optional().describe('Only show active connections (default: true)'),
});

export const createIndexingConnectionSchema = z.object({
  siteUrl: z.string().describe('The website URL (e.g., https://example.com)'),
  siteName: z.string().describe('A friendly name for the site'),
  sitemapUrl: z.string().optional().describe('URL to the sitemap (auto-detected if not provided)'),
  projectId: z.string().optional().describe('Project ID to associate with'),
  indexNowEnabled: z.boolean().optional().describe('Enable IndexNow instant indexing (default: true)'),
});

export const syncIndexingConnectionSchema = z.object({
  connectionId: z.string().describe('The ID of the indexing connection to sync'),
});

/**
 * List indexing connections tool handler
 */
export async function listIndexingConnections(
  client: ReauditAPIClient,
  args: z.infer<typeof listIndexingConnectionsSchema>
): Promise<string> {
  const result = await client.listIndexingConnections({
    projectId: args.projectId,
    activeOnly: args.activeOnly,
  });
  
  if (result.connections.length === 0) {
    return 'No indexing connections found. Create a connection to start monitoring and submitting URLs to search engines.';
  }
  
  let response = `## Indexing Connections (${result.count})\n\n`;
  
  for (const conn of result.connections) {
    const statusIcon = conn.isActive ? '✅' : '⏸️';
    const indexNowIcon = conn.indexNowEnabled ? (conn.indexNowKeyVerified ? '🔑' : '⚠️') : '❌';
    
    response += `### ${statusIcon} ${conn.siteName}\n`;
    response += `- **ID:** ${conn.id}\n`;
    response += `- **Site URL:** ${conn.siteUrl}\n`;
    if (conn.sitemapUrl) response += `- **Sitemap:** ${conn.sitemapUrl}\n`;
    response += `- **Source Type:** ${conn.sourceType}\n`;
    response += `- **IndexNow:** ${indexNowIcon} ${conn.indexNowEnabled ? 'Enabled' : 'Disabled'}`;
    if (conn.indexNowEnabled) {
      response += conn.indexNowKeyVerified ? ' (Verified)' : ' (Not Verified)';
    }
    response += '\n';
    response += `- **GSC:** ${conn.gscEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    
    if (conn.stats) {
      response += `- **Stats:**\n`;
      response += `  - Total URLs: ${conn.stats.totalUrls || 0}\n`;
      response += `  - Indexed URLs: ${conn.stats.indexedUrls || 0}\n`;
      if (conn.stats.lastSyncAt) {
        response += `  - Last Sync: ${new Date(conn.stats.lastSyncAt).toLocaleString()}\n`;
      }
    }
    
    if (conn.project) {
      response += `- **Project:** ${conn.project.name} (${conn.project.id})\n`;
    }
    
    if (conn.lastError) {
      response += `- **⚠️ Last Error:** ${conn.lastError}\n`;
    }
    
    response += `- **Created:** ${new Date(conn.createdAt).toLocaleDateString()}\n`;
    response += '\n';
  }
  
  return response;
}

/**
 * Create indexing connection tool handler
 */
export async function createIndexingConnection(
  client: ReauditAPIClient,
  args: z.infer<typeof createIndexingConnectionSchema>
): Promise<string> {
  const result = await client.createIndexingConnection({
    siteUrl: args.siteUrl,
    siteName: args.siteName,
    sitemapUrl: args.sitemapUrl,
    projectId: args.projectId,
    indexNowEnabled: args.indexNowEnabled,
  });
  
  const conn = result.connection;
  
  let response = `## Indexing Connection Created\n\n`;
  response += `${result.message}\n\n`;
  response += `- **ID:** ${conn.id}\n`;
  response += `- **Site URL:** ${conn.siteUrl}\n`;
  response += `- **Site Name:** ${conn.siteName}\n`;
  if (conn.sitemapUrl) response += `- **Sitemap:** ${conn.sitemapUrl}\n`;
  response += `- **IndexNow:** ${conn.indexNowEnabled ? 'Enabled' : 'Disabled'}\n`;
  
  if (conn.indexNowKey) {
    response += `\n### IndexNow Setup\n`;
    response += `To verify IndexNow, add this key file to your website:\n`;
    response += `- **Key:** ${conn.indexNowKey}\n`;
    response += `- **File:** ${conn.siteUrl}/${conn.indexNowKey}.txt\n`;
    response += `- **Content:** ${conn.indexNowKey}\n`;
  }
  
  return response;
}

/**
 * Sync indexing connection tool handler
 */
export async function syncIndexingConnection(
  client: ReauditAPIClient,
  args: z.infer<typeof syncIndexingConnectionSchema>
): Promise<string> {
  const result = await client.syncIndexingConnection(args.connectionId);
  
  let response = `## Sync Triggered\n\n`;
  response += `${result.message}\n\n`;
  response += `- **Site URL:** ${result.connection.siteUrl}\n`;
  response += `- **Sitemap:** ${result.connection.sitemapUrl}\n`;
  
  if (result.connection.stats) {
    response += `\n### Current Stats\n`;
    response += `- Total URLs: ${result.connection.stats.totalUrls || 0}\n`;
    response += `- Indexed URLs: ${result.connection.stats.indexedUrls || 0}\n`;
  }
  
  if (result.connection.lastSyncAt) {
    response += `- Last Sync: ${new Date(result.connection.lastSyncAt).toLocaleString()}\n`;
  }
  
  response += `\n*The sync will process in the background. Check back later for updated stats.*`;
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const indexingTools = [
  {
    name: 'list_indexing_connections',
    description: 'List all website indexing connections. These connections enable IndexNow instant indexing and Google Search Console integration.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        activeOnly: {
          type: 'boolean',
          description: 'Only show active connections (default: true)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'create_indexing_connection',
    description: 'Create a new indexing connection for a website. This enables sitemap monitoring and IndexNow instant indexing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        siteUrl: {
          type: 'string',
          description: 'The website URL (e.g., https://example.com)',
        },
        siteName: {
          type: 'string',
          description: 'A friendly name for the site',
        },
        sitemapUrl: {
          type: 'string',
          description: 'URL to the sitemap (auto-detected if not provided)',
        },
        projectId: {
          type: 'string',
          description: 'Project ID to associate with',
        },
        indexNowEnabled: {
          type: 'boolean',
          description: 'Enable IndexNow instant indexing (default: true)',
        },
      },
      required: ['siteUrl', 'siteName'],
    },
  },
  {
    name: 'sync_indexing_connection',
    description: 'Trigger a sitemap sync for an indexing connection. This will fetch the latest URLs from the sitemap and submit new/updated URLs to search engines.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        connectionId: {
          type: 'string',
          description: 'The ID of the indexing connection to sync',
        },
      },
      required: ['connectionId'],
    },
  },
];
