/**
 * Content Tools
 * 
 * MCP tools for knowledge base and content management.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const searchKnowledgeBaseSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  query: z.string().describe('The search query to find relevant content'),
  topK: z.number().optional().describe('Number of results to return (default: 3, max: 10)'),
});

export const getContentSuggestionsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  status: z.string().optional().describe('Filter by status'),
  limit: z.number().optional().describe('Maximum number of suggestions to return (default: 10, max: 50)'),
});

/**
 * Search knowledge base tool handler
 */
export async function searchKnowledgeBase(
  client: ReauditAPIClient,
  args: z.infer<typeof searchKnowledgeBaseSchema>
): Promise<string> {
  // Default to 3 results to save tokens (was 5)
  const topK = args.topK ?? 3;
  const result = await client.searchKnowledgeBase(args.projectId, args.query, topK);
  
  if (result.message && result.results.length === 0) {
    return result.message;
  }
  
  let response = `## Knowledge Base Search Results\n`;
  response += `**Query:** ${result.query}\n`;
  response += `**Knowledge Base:** ${result.stats.totalPages} pages, ${result.stats.totalChunks} chunks\n\n`;
  
  if (result.results.length === 0) {
    response += 'No relevant content found for your query.\n';
    return response;
  }
  
  response += `### Results (${result.results.length})\n\n`;
  
  for (const item of result.results) {
    response += `#### Result #${item.rank}\n`;
    if (item.title) {
      response += `**Title:** ${item.title}\n`;
    }
    if (item.source) {
      response += `**Source:** ${item.source}\n`;
    }
    response += `\n${item.content}\n\n`;
    response += '---\n\n';
  }
  
  return response;
}

/**
 * Get content suggestions tool handler
 */
export async function getContentSuggestions(
  client: ReauditAPIClient,
  args: z.infer<typeof getContentSuggestionsSchema>
): Promise<string> {
  const result = await client.getContentSuggestions(args.projectId, {
    status: args.status,
    limit: args.limit,
  });
  
  if (result.suggestions.length === 0) {
    return 'No content suggestions available. Run an SEO audit to generate content recommendations.';
  }
  
  let response = `## Content Suggestions (${result.count})\n\n`;
  
  for (const sug of result.suggestions) {
    const priorityStars = '⭐'.repeat(Math.min(sug.priority, 5));
    
    response += `### ${sug.title}\n`;
    response += `**Type:** ${sug.type} | **Priority:** ${priorityStars} | **Status:** ${sug.status}\n`;
    response += `${sug.description}\n`;
    
    if (sug.targetKeywords.length > 0) {
      response += `**Target Keywords:** ${sug.targetKeywords.join(', ')}\n`;
    }
    
    if (sug.estimatedImpact) {
      response += `**Estimated Impact:** ${sug.estimatedImpact}\n`;
    }
    
    response += '\n';
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const contentTools = [
  {
    name: 'search_knowledge_base',
    description: 'Search your project knowledge base for relevant content. The knowledge base contains scraped content from your website that can be used for context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        query: {
          type: 'string',
          description: 'The search query to find relevant content',
        },
        topK: {
          type: 'number',
          description: 'Number of results to return (default: 3, max: 10)',
        },
      },
      required: ['projectId', 'query'],
    },
  },
  {
    name: 'get_content_suggestions',
    description: 'Get AI-generated content suggestions for your project based on SEO analysis and competitor research.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        status: {
          type: 'string',
          description: 'Filter by status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of suggestions to return (default: 10, max: 50)',
        },
      },
      required: ['projectId'],
    },
  },
];
