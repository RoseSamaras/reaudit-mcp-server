/**
 * Optimization Tools
 * 
 * MCP tools for llms.txt generation, translation, and content optimization.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const generateLlmsTxtSchema = z.object({
  projectId: z.string().describe('The ID of the project to generate llms.txt for'),
});

export const translateContentSchema = z.object({
  contentId: z.string().describe('The ID of the content to translate'),
  targetLanguage: z.string().describe('Target language code (e.g., es, fr, de, el, it, pt, nl, pl, ja, ko, zh)'),
});

/**
 * Generate llms.txt tool handler
 */
export async function generateLlmsTxt(
  client: ReauditAPIClient,
  args: z.infer<typeof generateLlmsTxtSchema>
): Promise<string> {
  const result = await client.generateLlmsTxt(args.projectId);
  
  if (!result.success || !result.content) {
    return `Failed to generate llms.txt: ${result.error || 'Unknown error'}`;
  }
  
  let response = `## llms.txt Generated!\n\n`;
  if (result.metadata) {
    response += `**Generated At:** ${result.metadata.generatedAt}\n`;
    response += `**Model:** ${result.metadata.model}\n`;
    response += `**Used Knowledge Base:** ${result.metadata.hasKnowledgeBase ? 'Yes' : 'No'}\n\n`;
  }
  response += `---\n\n`;
  response += `### Content\n\n`;
  response += '```\n';
  response += result.content;
  response += '\n```\n\n';
  response += `---\n`;
  response += `Copy this content to your website's \`/llms.txt\` file to help AI assistants understand your business.\n`;
  
  return response;
}

/**
 * Translate content tool handler
 */
export async function translateContent(
  client: ReauditAPIClient,
  args: z.infer<typeof translateContentSchema>
): Promise<string> {
  const result = await client.translateContent(args.contentId, args.targetLanguage);
  
  if (!result.success || !result.content) {
    return `Failed to translate content: ${result.error || 'Unknown error'}`;
  }
  
  const content = result.content;
  
  let response = `## Content Translated!\n\n`;
  response += `**Original Language:** ${result.originalLanguage || 'en'}\n`;
  response += `**Target Language:** ${args.targetLanguage}\n`;
  response += `**New Content ID:** ${content.id}\n\n`;
  
  response += `### Translated Content\n\n`;
  response += `- **Title:** ${content.title}\n`;
  response += `- **Slug:** ${content.slug}\n`;
  response += `- **Meta Title:** ${content.metaTitle}\n`;
  response += `- **Meta Description:** ${content.metaDescription}\n`;
  response += `- **Word Count:** ${content.wordCount}\n`;
  
  if (content.excerpt) {
    response += `\n**Excerpt:**\n> ${content.excerpt}\n`;
  }
  
  response += `\n---\n`;
  response += `Use \`get_content_details\` with ID \`${content.id}\` to view the full translated content.\n`;
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const optimizationTools = [
  {
    name: 'generate_llms_txt',
    description: 'Generate an AI-optimized llms.txt file for your project. This file helps AI assistants understand your business and provide accurate information.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to generate llms.txt for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'translate_content',
    description: 'Translate generated content to another language. Creates a new content entry with the translated version.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        contentId: {
          type: 'string',
          description: 'The ID of the content to translate',
        },
        targetLanguage: {
          type: 'string',
          description: 'Target language code (e.g., es, fr, de, el, it, pt, nl, pl, ja, ko, zh)',
        },
      },
      required: ['contentId', 'targetLanguage'],
    },
  },
];
