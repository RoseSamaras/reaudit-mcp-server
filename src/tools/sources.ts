/**
 * Sources & Outreach Tools
 * 
 * MCP tools for citation sources and outreach management.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const getCitationSourcesSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  type: z.string().optional().describe('Filter by type: Brand, Third-party, or All'),
  limit: z.number().optional().describe('Maximum number of sources to return (default: 50)'),
});

export const extractAuthorInfoSchema = z.object({
  url: z.string().describe('The URL to extract author information from'),
});

export const listOutreachOpportunitiesSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  status: z.string().optional().describe('Filter by status: discovered, contacted, responded, converted, rejected'),
  limit: z.number().optional().describe('Maximum number of opportunities to return (default: 20)'),
});

export const createOutreachOpportunitySchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  articleUrl: z.string().describe('URL of the article'),
  articleTitle: z.string().describe('Title of the article'),
  authorName: z.string().optional().describe('Name of the author'),
  authorEmail: z.string().optional().describe('Email of the author'),
  authorBio: z.string().optional().describe('Bio of the author'),
  notes: z.string().optional().describe('Notes about this opportunity'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
});

/**
 * Get citation sources tool handler
 */
export async function getCitationSources(
  client: ReauditAPIClient,
  args: z.infer<typeof getCitationSourcesSchema>
): Promise<string> {
  const result = await client.getCitationSources(args.projectId, {
    type: args.type,
    limit: args.limit,
  });
  
  if (result.sources.length === 0) {
    return 'No citation sources found. Run AI visibility queries to discover sources citing your content.';
  }
  
  let response = `## Citation Sources\n\n`;
  
  response += `### Summary\n`;
  response += `- **Total Sources:** ${result.stats.totalSources}\n`;
  response += `- **Brand Sources:** ${result.stats.brandSources}\n`;
  response += `- **Third-party Sources:** ${result.stats.thirdPartySources}\n`;
  response += `- **Total Citations:** ${result.stats.totalCitations}\n\n`;
  
  if (Object.keys(result.stats.modelBreakdown).length > 0) {
    response += `### Citations by AI Model\n`;
    for (const [model, count] of Object.entries(result.stats.modelBreakdown)) {
      response += `- **${model}:** ${count}\n`;
    }
    response += '\n';
  }
  
  response += `### Sources (${result.sources.length})\n\n`;
  
  // Group by type
  const brandSources = result.sources.filter(s => s.type === 'Brand');
  const thirdPartySources = result.sources.filter(s => s.type === 'Third-party');
  
  if (brandSources.length > 0) {
    response += `#### Brand Sources\n`;
    for (const source of brandSources.slice(0, 10)) {
      response += `- **${source.title}**\n`;
      response += `  - URL: ${source.url}\n`;
      response += `  - Domain: ${source.domain}\n`;
      response += `  - Frequency: ${source.frequency} citations\n`;
      response += `  - Models: ${source.models.join(', ')}\n`;
      response += `  - Prompts: ${source.promptCount}\n`;
    }
    response += '\n';
  }
  
  if (thirdPartySources.length > 0) {
    response += `#### Third-party Sources\n`;
    for (const source of thirdPartySources.slice(0, 15)) {
      response += `- **${source.title}**\n`;
      response += `  - URL: ${source.url}\n`;
      response += `  - Domain: ${source.domain}\n`;
      response += `  - Frequency: ${source.frequency} citations\n`;
      response += `  - Models: ${source.models.join(', ')}\n`;
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Extract author info tool handler
 */
export async function extractAuthorInfo(
  client: ReauditAPIClient,
  args: z.infer<typeof extractAuthorInfoSchema>
): Promise<string> {
  const result = await client.extractAuthorInfo(args.url);
  
  if (!result.found) {
    return `Could not extract author information from ${args.url}. ${result.message || 'The page may not have structured author data.'}`;
  }
  
  const author = result.author!;
  
  let response = `## Author Information Extracted\n\n`;
  
  if (author.name) response += `- **Name:** ${author.name}\n`;
  if (author.email) response += `- **Email:** ${author.email}\n`;
  if (author.bio) response += `- **Bio:** ${author.bio}\n`;
  if (author.imageUrl) response += `- **Image:** ${author.imageUrl}\n`;
  
  if (author.socialLinks && Object.keys(author.socialLinks).length > 0) {
    response += `\n### Social Links\n`;
    for (const [platform, url] of Object.entries(author.socialLinks)) {
      response += `- **${platform}:** ${url}\n`;
    }
  }
  
  if (author.articleTitle) {
    response += `\n### Article\n`;
    response += `- **Title:** ${author.articleTitle}\n`;
    if (author.articleExcerpt) {
      response += `- **Excerpt:** ${author.articleExcerpt}\n`;
    }
  }
  
  if (author.confidence) {
    response += `\n*Confidence: ${Math.round(author.confidence * 100)}%*`;
  }
  
  return response;
}

/**
 * List outreach opportunities tool handler
 */
export async function listOutreachOpportunities(
  client: ReauditAPIClient,
  args: z.infer<typeof listOutreachOpportunitiesSchema>
): Promise<string> {
  const result = await client.listOutreachOpportunities(args.projectId, {
    status: args.status,
    limit: args.limit,
  });
  
  if (result.opportunities.length === 0) {
    return 'No outreach opportunities found. Create opportunities manually or discover them from citation sources.';
  }
  
  let response = `## Outreach Opportunities (${result.pagination.total} total)\n\n`;
  
  if (Object.keys(result.statusCounts).length > 0) {
    response += `### Status Summary\n`;
    for (const [status, count] of Object.entries(result.statusCounts)) {
      response += `- **${status}:** ${count}\n`;
    }
    response += '\n';
  }
  
  response += `### Opportunities\n\n`;
  
  for (const opp of result.opportunities) {
    const statusEmoji = opp.status === 'converted' ? '✅' :
                        opp.status === 'responded' ? '💬' :
                        opp.status === 'contacted' ? '📧' :
                        opp.status === 'rejected' ? '❌' : '🔍';
    
    response += `#### ${statusEmoji} ${opp.articleTitle}\n`;
    response += `- **ID:** ${opp.id}\n`;
    response += `- **URL:** ${opp.articleUrl}\n`;
    response += `- **Domain:** ${opp.articleDomain}\n`;
    response += `- **Status:** ${opp.status}\n`;
    if (opp.authorName) response += `- **Author:** ${opp.authorName}\n`;
    if (opp.authorEmail) response += `- **Email:** ${opp.authorEmail}\n`;
    if (opp.discoveredFrom) response += `- **Source:** ${opp.discoveredFrom}\n`;
    if (opp.notes) response += `- **Notes:** ${opp.notes}\n`;
    if (opp.tags && opp.tags.length > 0) response += `- **Tags:** ${opp.tags.join(', ')}\n`;
    response += `- **Created:** ${new Date(opp.createdAt).toLocaleDateString()}\n`;
    response += '\n';
  }
  
  if (result.pagination.totalPages > 1) {
    response += `\n*Page ${result.pagination.page} of ${result.pagination.totalPages}*`;
  }
  
  return response;
}

/**
 * Create outreach opportunity tool handler
 */
export async function createOutreachOpportunity(
  client: ReauditAPIClient,
  args: z.infer<typeof createOutreachOpportunitySchema>
): Promise<string> {
  const result = await client.createOutreachOpportunity({
    projectId: args.projectId,
    articleUrl: args.articleUrl,
    articleTitle: args.articleTitle,
    authorName: args.authorName,
    authorEmail: args.authorEmail,
    authorBio: args.authorBio,
    notes: args.notes,
    tags: args.tags,
  });
  
  const opp = result.opportunity;
  
  let response = `## Outreach Opportunity Created\n\n`;
  response += `- **ID:** ${opp.id}\n`;
  response += `- **Title:** ${opp.articleTitle}\n`;
  response += `- **URL:** ${opp.articleUrl}\n`;
  response += `- **Domain:** ${opp.articleDomain}\n`;
  response += `- **Status:** ${opp.status}\n`;
  if (opp.authorName) response += `- **Author:** ${opp.authorName}\n`;
  if (opp.authorEmail) response += `- **Email:** ${opp.authorEmail}\n`;
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const sourcesTools = [
  {
    name: 'get_citation_sources',
    description: 'Get all citation sources for a project showing which URLs are being cited by AI models, their frequency, and which models cite them.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        type: {
          type: 'string',
          description: 'Filter by type: Brand (your own content), Third-party (external sources), or All',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sources to return (default: 50)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'extract_author_info',
    description: 'Extract author information from a URL including name, email, bio, and social links. Useful for outreach preparation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The URL to extract author information from',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'list_outreach_opportunities',
    description: 'List outreach opportunities for a project. These are potential contacts for link building or content collaboration.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        status: {
          type: 'string',
          description: 'Filter by status: discovered, contacted, responded, converted, rejected',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of opportunities to return (default: 20)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_outreach_opportunity',
    description: 'Create a new outreach opportunity manually. Use this to track potential link building or collaboration contacts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        articleUrl: {
          type: 'string',
          description: 'URL of the article',
        },
        articleTitle: {
          type: 'string',
          description: 'Title of the article',
        },
        authorName: {
          type: 'string',
          description: 'Name of the author',
        },
        authorEmail: {
          type: 'string',
          description: 'Email of the author',
        },
        authorBio: {
          type: 'string',
          description: 'Bio of the author',
        },
        notes: {
          type: 'string',
          description: 'Notes about this opportunity',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
      },
      required: ['projectId', 'articleUrl', 'articleTitle'],
    },
  },
];
