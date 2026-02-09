/**
 * Content Generation Tools
 * 
 * MCP tools for AI content generation.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const generateContentSchema = z.object({
  keyword: z.string().describe('The main keyword or keyphrase for the content'),
  topic: z.string().describe('The topic or title for the content'),
  contentType: z.string().optional().describe('Type of content: blog, faq, comparison, tutorial, case-study, linkedin-post, twitter-post, newsletter, youtube-script, etc.'),
  contentLength: z.enum(['short', 'medium', 'long', 'comprehensive']).optional().describe('Content length: short (~650 words), medium (~1000 words), long (~1500 words), comprehensive (~2100 words)'),
  tone: z.string().optional().describe('Tone of voice: professional, casual, analytical, educational, engaging, instructive, clear'),
  customTone: z.string().optional().describe('Custom tone description if standard tones are not suitable'),
  useProjectTone: z.boolean().optional().describe('Use the project\'s configured tone of voice (requires projectId)'),
  additionalContext: z.string().optional().describe('Additional context or instructions for the content'),
  projectId: z.string().optional().describe('Project ID to use project settings, knowledge base, and internal links'),
  language: z.string().optional().describe('Output language code (e.g., en, es, fr, de)'),
  useSemanticVariants: z.boolean().optional().describe('Use semantic keyword variants for better SEO (default: true)'),
  useWebSearch: z.boolean().optional().describe('Use Perplexity AI web search for real-time research and citations (costs extra credits)'),
});

export const getContentHistorySchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  contentType: z.string().optional().describe('Filter by content type'),
  limit: z.number().optional().describe('Maximum number of items to return (default: 50)'),
});

export const getContentDetailsSchema = z.object({
  contentId: z.string().describe('The ID of the content to retrieve'),
  includeSchema: z.boolean().optional().describe('Include full JSON-LD schema markup (default: false, saves tokens)'),
});

/**
 * Generate content tool handler
 */
export async function generateContent(
  client: ReauditAPIClient,
  args: z.infer<typeof generateContentSchema>
): Promise<string> {
  const result = await client.generateContent({
    keyword: args.keyword,
    topic: args.topic,
    contentType: args.contentType,
    contentLength: args.contentLength,
    tone: args.tone,
    customTone: args.customTone,
    useProjectTone: args.useProjectTone,
    additionalContext: args.additionalContext,
    projectId: args.projectId,
    language: args.language,
    useSemanticVariants: args.useSemanticVariants,
    useWebSearch: args.useWebSearch,
  });
  
  const content = result.content;
  
  let response = `## Content Generated Successfully!\n\n`;
  response += `### ${content.title}\n\n`;
  response += `- **ID:** ${content.id}\n`;
  response += `- **Type:** ${content.contentType}\n`;
  response += `- **Keyword:** ${content.keyword}\n`;
  response += `- **Word Count:** ${content.wordCount}\n`;
  response += `- **Language:** ${content.language || 'en'}\n`;
  
  if (content.seoScore || content.readabilityScore) {
    response += `\n### SEO Metrics\n`;
    if (content.seoScore) response += `- **SEO Score:** ${content.seoScore}/100\n`;
    if (content.readabilityScore) response += `- **Readability Score:** ${content.readabilityScore}/100\n`;
    if (content.keywordDensity) response += `- **Keyword Density:** ${content.keywordDensity}%\n`;
  }
  
  response += `\n### Meta Information\n`;
  response += `- **Meta Title:** ${content.metaTitle || content.title}\n`;
  response += `- **Meta Description:** ${content.metaDescription}\n`;
  response += `- **Excerpt:** ${content.excerpt}\n`;
  
  if (content.headings) {
    response += `\n### Content Structure\n`;
    if (content.headings.h2?.length) response += `- **H2 Headings:** ${content.headings.h2.join(', ')}\n`;
    if (content.headings.h3?.length) response += `- **H3 Headings:** ${content.headings.h3.join(', ')}\n`;
  }
  
  if (content.suggestedTags && content.suggestedTags.length > 0) {
    response += `\n### Suggested Tags\n`;
    response += content.suggestedTags.join(', ') + '\n';
  }
  
  if (content.faq && content.faq.length > 0) {
    response += `\n### FAQ Section (${content.faq.length} questions)\n`;
    for (const item of content.faq.slice(0, 3)) {
      response += `- **Q:** ${item.question}\n`;
    }
    if (content.faq.length > 3) {
      response += `- *...and ${content.faq.length - 3} more questions*\n`;
    }
  }
  
  if (content.internalLinks && content.internalLinks.length > 0) {
    response += `\n### Internal Links\n`;
    response += `${content.internalLinks.length} internal links included in content:\n`;
    for (const link of content.internalLinks) {
      response += `- [${link.text}](${link.url})\n`;
    }
  } else if (content.internalLinkSuggestionsUsed) {
    response += `\n### Internal Links\n`;
    response += `${content.internalLinkSuggestionsUsed} internal link suggestions were provided to the AI\n`;
  }
  
  if (content.hasSchemaMarkup) {
    response += `\n### Schema Markup\n`;
    response += `✅ JSON-LD schema markup generated (Article + FAQPage)\n`;
  }
  
  if (content.knowledgeBaseContext && content.knowledgeBaseContext.length > 0) {
    response += `\n### Knowledge Base\n`;
    response += `✅ Content enhanced using ${content.knowledgeBaseContext.length} sources from project knowledge base\n`;
  }
  
  if (content.semanticVariantsUsed) {
    response += `\n### Semantic Variants\n`;
    response += `✅ ${content.semanticVariantsUsed} semantic keyword variants used for better SEO\n`;
  }
  
  if (content.webSearchUsed) {
    response += `\n### Real-Time Web Research\n`;
    response += `✅ Perplexity AI research included (${content.webSearchUsed.citationsCount} citations)\n`;
  }
  
  response += `\n---\n`;
  response += `Use \`get_content_details\` with ID \`${content.id}\` to retrieve the full content including HTML, schema markup, and markdown.`;
  
  return response;
}

/**
 * Get content history tool handler
 */
export async function getContentHistory(
  client: ReauditAPIClient,
  args: z.infer<typeof getContentHistorySchema>
): Promise<string> {
  const result = await client.getContentHistory({
    projectId: args.projectId,
    contentType: args.contentType,
    limit: args.limit,
  });
  
  if (result.history.length === 0) {
    return 'No content generation history found. Use `generate_content` to create new content.';
  }
  
  let response = `## Content History (${result.pagination.total} total)\n\n`;
  
  for (const content of result.history) {
    response += `### ${content.title}\n`;
    response += `- **ID:** ${content.id}\n`;
    response += `- **Type:** ${content.contentType}\n`;
    response += `- **Keyword:** ${content.keyword}\n`;
    response += `- **Word Count:** ${content.wordCount}\n`;
    response += `- **Generated:** ${new Date(content.generatedAt).toLocaleDateString()}\n`;
    response += '\n';
  }
  
  if (result.pagination.hasMore) {
    response += `\n*Showing ${result.history.length} of ${result.pagination.total} items. Use \`skip\` parameter to see more.*`;
  }
  
  return response;
}

/**
 * Get content details tool handler
 */
export async function getContentDetails(
  client: ReauditAPIClient,
  args: z.infer<typeof getContentDetailsSchema>
): Promise<string> {
  const result = await client.getContentDetails(args.contentId);
  const content = result.content;
  const includeSchema = args.includeSchema ?? false;
  
  let response = `## ${content.title}\n\n`;
  
  response += `### Metadata\n`;
  response += `- **ID:** ${content.id}\n`;
  response += `- **Slug:** ${content.slug}\n`;
  response += `- **Type:** ${content.contentType}\n`;
  response += `- **Keyword:** ${content.keyword}\n`;
  response += `- **Topic:** ${content.topic}\n`;
  response += `- **Word Count:** ${content.wordCount}\n`;
  response += `- **Language:** ${content.language}\n`;
  response += `- **Provider:** ${content.provider}\n`;
  response += `- **Generated:** ${new Date(content.generatedAt).toLocaleDateString()}\n\n`;
  
  if (content.seoScore || content.readabilityScore) {
    response += `### Scores\n`;
    if (content.seoScore) response += `- **SEO Score:** ${content.seoScore}/100\n`;
    if (content.readabilityScore) response += `- **Readability Score:** ${content.readabilityScore}/100\n`;
    if (content.keywordDensity) response += `- **Keyword Density:** ${content.keywordDensity}%\n`;
    if (content.sentiment) response += `- **Sentiment:** ${content.sentiment}\n`;
    response += '\n';
  }
  
  response += `### SEO\n`;
  response += `- **Meta Title:** ${content.metaTitle || content.title}\n`;
  response += `- **Meta Description:** ${content.metaDescription}\n`;
  response += `- **Focus Keyphrase:** ${content.focusKeyphrase || content.keyword}\n\n`;
  
  if (content.suggestedTags && content.suggestedTags.length > 0) {
    response += `### Tags\n`;
    response += content.suggestedTags.join(', ') + '\n\n';
  }
  
  if (content.headings) {
    response += `### Headings Structure\n`;
    if (content.headings.h1?.length) response += `- **H1:** ${content.headings.h1.join(', ')}\n`;
    if (content.headings.h2?.length) response += `- **H2:** ${content.headings.h2.join(', ')}\n`;
    if (content.headings.h3?.length) response += `- **H3:** ${content.headings.h3.join(', ')}\n`;
    response += '\n';
  }
  
  if (content.internalLinks && content.internalLinks.length > 0) {
    response += `### Internal Links\n`;
    for (const link of content.internalLinks) {
      response += `- [${link.text}](${link.url})\n`;
    }
    response += '\n';
  }
  
  if (content.imagePrompts && content.imagePrompts.length > 0) {
    response += `### Image Prompts\n`;
    for (let i = 0; i < content.imagePrompts.length; i++) {
      response += `${i + 1}. ${content.imagePrompts[i]}\n`;
    }
    response += '\n';
  }
  
  if (content.faq && content.faq.length > 0) {
    response += `### FAQ Section\n`;
    for (const item of content.faq) {
      response += `**Q: ${item.question}**\n`;
      response += `A: ${item.answer}\n\n`;
    }
  }
  
  // Schema markup - only include if explicitly requested (saves ~40% tokens)
  if (content.schemaMarkup) {
    if (includeSchema) {
      response += `### Schema Markup (JSON-LD)\n`;
      response += '```json\n';
      try {
        const schema = typeof content.schemaMarkup === 'string' 
          ? JSON.parse(content.schemaMarkup) 
          : content.schemaMarkup;
        response += JSON.stringify(schema, null, 2);
      } catch {
        response += content.schemaMarkup;
      }
      response += '\n```\n\n';
    } else {
      response += `### Schema Markup\n`;
      response += `✅ JSON-LD schema available (use \`includeSchema: true\` to view)\n\n`;
    }
  }
  
  response += `### Content\n\n`;
  
  // Prefer markdown content if available
  if (content.markdownContent) {
    response += content.markdownContent;
  } else if (content.content) {
    // Strip HTML tags for display
    const plainText = content.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    response += plainText;
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const contentGenerationTools = [
  {
    name: 'generate_content',
    description: 'Generate AI-powered content including blog posts, social media posts, newsletters, video scripts, and more. Uses project knowledge base for context when projectId is provided.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        keyword: {
          type: 'string',
          description: 'The main keyword or keyphrase for the content',
        },
        topic: {
          type: 'string',
          description: 'The topic or title for the content',
        },
        contentType: {
          type: 'string',
          description: 'Type of content: blog, faq, comparison, tutorial, case-study, linkedin-post, twitter-post, twitter-thread, newsletter, email-sequence, youtube-script, podcast-outline, video-script',
        },
        contentLength: {
          type: 'string',
          enum: ['short', 'medium', 'long', 'comprehensive'],
          description: 'Content length: short (~650 words), medium (~1000 words), long (~1500 words), comprehensive (~2100 words)',
        },
        tone: {
          type: 'string',
          description: 'Tone of voice: professional, casual, analytical, educational, engaging, instructive, clear',
        },
        customTone: {
          type: 'string',
          description: 'Custom tone description if standard tones are not suitable',
        },
        useProjectTone: {
          type: 'boolean',
          description: 'Use the project\'s configured tone of voice (requires projectId)',
        },
        additionalContext: {
          type: 'string',
          description: 'Additional context or instructions for the content',
        },
        projectId: {
          type: 'string',
          description: 'Project ID to use project settings, knowledge base, and internal links for better context',
        },
        language: {
          type: 'string',
          description: 'Output language code (e.g., en, es, fr, de, el)',
        },
        useSemanticVariants: {
          type: 'boolean',
          description: 'Use semantic keyword variants for better SEO coverage (default: true)',
        },
        useWebSearch: {
          type: 'boolean',
          description: 'Use Perplexity AI for real-time web research and citations (costs extra credits)',
        },
      },
      required: ['keyword', 'topic'],
    },
  },
  {
    name: 'get_content_history',
    description: 'Get your content generation history. Filter by project or content type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        contentType: {
          type: 'string',
          description: 'Filter by content type',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return (default: 50)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_content_details',
    description: 'Get full details of a generated content piece including the complete content and SEO data. Schema markup is available on request.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        contentId: {
          type: 'string',
          description: 'The ID of the content to retrieve',
        },
        includeSchema: {
          type: 'boolean',
          description: 'Include full JSON-LD schema markup (default: false, saves ~40% tokens)',
        },
      },
      required: ['contentId'],
    },
  },
];
