/**
 * Social Media Tools
 * 
 * MCP tools for social media management.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const listSocialConnectionsSchema = z.object({});

export const listSocialPostsSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  platform: z.string().optional().describe('Filter by platform: twitter, linkedin'),
  status: z.string().optional().describe('Filter by status: draft, scheduled, published, failed'),
  limit: z.number().optional().describe('Maximum number of posts to return (default: 50)'),
});

export const generateSocialPostsSchema = z.object({
  contentId: z.string().describe('The ID of the content to create social posts from'),
  platforms: z.array(z.string()).describe('Platforms to generate for: twitter, linkedin'),
  tone: z.string().optional().describe('Tone: professional, casual, engaging, informative'),
  includeHashtags: z.boolean().optional().describe('Include relevant hashtags (default: true)'),
  includeLink: z.boolean().optional().describe('Include link to article (default: true)'),
});

export const publishSocialPostSchema = z.object({
  postId: z.string().describe('The ID of the social post to publish'),
});

export const scheduleSocialPostSchema = z.object({
  postId: z.string().describe('The ID of the social post to schedule'),
  scheduledFor: z.string().describe('ISO date string for when to publish (e.g., 2024-01-15T10:00:00Z)'),
});

/**
 * List social connections tool handler
 */
export async function listSocialConnections(
  client: ReauditAPIClient,
  _args: z.infer<typeof listSocialConnectionsSchema>
): Promise<string> {
  const result = await client.listSocialConnections();
  
  if (result.connections.length === 0) {
    return 'No social media connections found. Connect your social accounts in the Reaudit dashboard to enable posting.';
  }
  
  let response = `## Social Media Connections (${result.count})\n\n`;
  
  for (const conn of result.connections) {
    const verifiedIcon = conn.isVerified ? '✅' : '⚠️';
    const platformName = conn.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
    
    response += `### ${platformName}\n`;
    response += `- **ID:** ${conn.id}\n`;
    if (conn.platformUsername) response += `- **Username:** @${conn.platformUsername}\n`;
    response += `- **Status:** ${verifiedIcon} ${conn.isVerified ? 'Verified' : 'Not Verified'}\n`;
    response += `- **Stats:** ${conn.totalPublished} published, ${conn.totalScheduled} scheduled\n`;
    if (conn.lastPublishedAt) {
      response += `- **Last Published:** ${new Date(conn.lastPublishedAt).toLocaleDateString()}\n`;
    }
    response += '\n';
  }
  
  return response;
}

/**
 * List social posts tool handler
 */
export async function listSocialPosts(
  client: ReauditAPIClient,
  args: z.infer<typeof listSocialPostsSchema>
): Promise<string> {
  const result = await client.listSocialPosts({
    projectId: args.projectId,
    platform: args.platform,
    status: args.status,
    limit: args.limit,
  });
  
  if (result.posts.length === 0) {
    return 'No social media posts found. Use `generate_social_posts` to create posts from your content.';
  }
  
  let response = `## Social Media Posts (${result.pagination.total} total)\n\n`;
  
  const scheduled = result.posts.filter(p => p.status === 'scheduled');
  const published = result.posts.filter(p => p.status === 'published');
  const drafts = result.posts.filter(p => p.status === 'draft');
  const failed = result.posts.filter(p => p.status === 'failed');
  
  if (scheduled.length > 0) {
    response += `### Scheduled (${scheduled.length})\n\n`;
    for (const post of scheduled) {
      const platformName = post.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
      response += `**${platformName}** - ${post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : 'TBD'}\n`;
      response += `> ${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}\n`;
      response += `- ID: ${post.id}\n\n`;
    }
  }
  
  if (published.length > 0) {
    response += `### Published (${published.length})\n\n`;
    for (const post of published.slice(0, 10)) {
      const platformName = post.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
      response += `**${platformName}** - ${post.publishedAt ? new Date(post.publishedAt).toLocaleString() : ''}\n`;
      response += `> ${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}\n`;
      if (post.platformUrl) response += `- URL: ${post.platformUrl}\n`;
      response += `- ID: ${post.id}\n\n`;
    }
    if (published.length > 10) {
      response += `*...and ${published.length - 10} more published posts*\n\n`;
    }
  }
  
  if (drafts.length > 0) {
    response += `### Drafts (${drafts.length})\n\n`;
    for (const post of drafts) {
      const platformName = post.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
      response += `**${platformName}**\n`;
      response += `> ${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}\n`;
      response += `- ID: ${post.id}\n\n`;
    }
  }
  
  if (failed.length > 0) {
    response += `### Failed (${failed.length})\n\n`;
    for (const post of failed) {
      const platformName = post.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
      response += `**${platformName}**\n`;
      response += `> ${post.text.substring(0, 100)}${post.text.length > 100 ? '...' : ''}\n`;
      response += `- ID: ${post.id}\n\n`;
    }
  }
  
  return response;
}

/**
 * Generate social posts from content tool handler
 */
export async function generateSocialPosts(
  client: ReauditAPIClient,
  args: z.infer<typeof generateSocialPostsSchema>
): Promise<string> {
  const result = await client.generateSocialPosts({
    contentId: args.contentId,
    platforms: args.platforms,
    tone: args.tone,
    includeHashtags: args.includeHashtags ?? true,
    includeLink: args.includeLink ?? true,
  });
  
  if (!result.success || !result.posts || result.posts.length === 0) {
    return `Failed to generate social posts: ${result.error || 'Unknown error'}. Make sure you have social accounts connected.`;
  }
  
  let response = `## Social Posts Generated!\n\n`;
  response += `Created ${result.posts.length} post(s) as drafts:\n\n`;
  
  for (const post of result.posts) {
    const platformName = post.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
    response += `### ${platformName}\n`;
    response += `**ID:** ${post._id}\n`;
    response += `**Status:** Draft\n\n`;
    response += `${post.text}\n\n`;
    if (post.hashtags && post.hashtags.length > 0) {
      response += `**Hashtags:** ${post.hashtags.join(' ')}\n\n`;
    }
    response += '---\n\n';
  }
  
  response += `Use \`publish_social_post\` or \`schedule_social_post\` to publish these posts.`;
  
  return response;
}

/**
 * Publish social post tool handler
 */
export async function publishSocialPost(
  client: ReauditAPIClient,
  args: z.infer<typeof publishSocialPostSchema>
): Promise<string> {
  const result = await client.publishSocialPost(args.postId);
  
  if (!result.success) {
    return `Failed to publish post: ${result.error || 'Unknown error'}`;
  }
  
  const platformName = result.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
  
  let response = `## Post Published!\n\n`;
  response += `- **Platform:** ${platformName}\n`;
  response += `- **Status:** Published\n`;
  if (result.platformUrl) {
    response += `- **URL:** ${result.platformUrl}\n`;
  }
  response += `\nYour post is now live!`;
  
  return response;
}

/**
 * Schedule social post tool handler
 */
export async function scheduleSocialPost(
  client: ReauditAPIClient,
  args: z.infer<typeof scheduleSocialPostSchema>
): Promise<string> {
  const result = await client.scheduleSocialPost(args.postId, args.scheduledFor);
  
  if (!result.success) {
    return `Failed to schedule post: ${result.error || 'Unknown error'}`;
  }
  
  const scheduledDate = new Date(args.scheduledFor);
  const platformName = result.platform === 'twitter' ? 'X/Twitter' : 'LinkedIn';
  
  let response = `## Post Scheduled!\n\n`;
  response += `- **Platform:** ${platformName}\n`;
  response += `- **Scheduled For:** ${scheduledDate.toLocaleString()}\n`;
  response += `- **Status:** Scheduled\n`;
  response += `\nYour post will be automatically published at the scheduled time.`;
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const socialTools = [
  {
    name: 'list_social_connections',
    description: 'List all connected social media accounts (X/Twitter, LinkedIn). Shows connection status and publishing stats.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'list_social_posts',
    description: 'List social media posts including scheduled, published, draft, and failed posts. Filter by platform, status, or project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform: twitter, linkedin',
        },
        status: {
          type: 'string',
          description: 'Filter by status: draft, scheduled, published, failed',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of posts to return (default: 50)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'generate_social_posts',
    description: 'Generate social media posts from existing content. Creates draft posts for X/Twitter and LinkedIn.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        contentId: {
          type: 'string',
          description: 'The ID of the content to create social posts from',
        },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Platforms to generate for: twitter, linkedin',
        },
        tone: {
          type: 'string',
          description: 'Tone: professional, casual, engaging, informative',
        },
        includeHashtags: {
          type: 'boolean',
          description: 'Include relevant hashtags (default: true)',
        },
        includeLink: {
          type: 'boolean',
          description: 'Include link to article (default: true)',
        },
      },
      required: ['contentId', 'platforms'],
    },
  },
  {
    name: 'publish_social_post',
    description: 'Publish a social media post immediately. The post must be in draft status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        postId: {
          type: 'string',
          description: 'The ID of the social post to publish',
        },
      },
      required: ['postId'],
    },
  },
  {
    name: 'schedule_social_post',
    description: 'Schedule a social media post for later publication.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        postId: {
          type: 'string',
          description: 'The ID of the social post to schedule',
        },
        scheduledFor: {
          type: 'string',
          description: 'ISO date string for when to publish (e.g., 2024-01-15T10:00:00Z)',
        },
      },
      required: ['postId', 'scheduledFor'],
    },
  },
];
