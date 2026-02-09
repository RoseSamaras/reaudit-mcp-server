/**
 * Prompt Tracking Tools
 * 
 * MCP tools for managing prompt topics and tracking brand visibility in AI responses.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// ============ Schemas ============

export const listPromptTopicsSchema = z.object({
  projectId: z.string().describe('The ID of the project to list topics for'),
});

export const createPromptTopicSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  name: z.string().describe('Name of the topic (e.g., "Product Questions", "Industry Trends")'),
  description: z.string().optional().describe('Optional description of the topic'),
  prompts: z.array(z.string()).describe('Array of prompt texts to add to the topic'),
  language: z.string().optional().describe('Language code (default: en)'),
  region: z.string().optional().describe('Region code (default: global)'),
});

export const addPromptsToTopicSchema = z.object({
  topicId: z.string().describe('The ID of the topic to add prompts to'),
  prompts: z.array(z.string()).describe('Array of prompt texts to add'),
});

export const trackPromptSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  promptText: z.string().describe('The prompt text to track'),
  promptId: z.string().optional().describe('Optional prompt ID if tracking an existing prompt'),
  engines: z.array(z.string()).optional().describe('AI engines to track: chatgpt, perplexity, google (default: all)'),
});

export const getPromptAnalyticsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  days: z.number().optional().describe('Number of days to analyze (default: 30)'),
});

export const generatePromptSuggestionsSchema = z.object({
  projectId: z.string().describe('The ID of the project'),
  topic: z.string().optional().describe('Optional topic focus for suggestions'),
  count: z.number().optional().describe('Number of suggestions to generate (default: 10)'),
});

// ============ Handlers ============

/**
 * List prompt topics tool handler
 */
export async function listPromptTopics(
  client: ReauditAPIClient,
  args: z.infer<typeof listPromptTopicsSchema>
): Promise<string> {
  const result = await client.listPromptTopics(args.projectId);
  
  if (!result.topics || result.topics.length === 0) {
    return 'No prompt topics found for this project. Use `create_prompt_topic` to create one.';
  }
  
  let response = `## Prompt Topics (${result.topics.length})\n\n`;
  
  for (const topic of result.topics) {
    response += `### ${topic.name}\n`;
    response += `- **ID:** ${topic.id}\n`;
    if (topic.description) {
      response += `- **Description:** ${topic.description}\n`;
    }
    response += `- **Prompts:** ${topic.promptCount}\n`;
    response += `- **Language:** ${topic.language || 'en'}\n`;
    response += `- **Region:** ${topic.region || 'global'}\n`;
    response += `- **Schedule:** ${topic.schedule || 'weekly'}\n`;
    response += `- **Enabled:** ${topic.enabled ? 'Yes' : 'No'}\n`;
    if (topic.lastExecutedAt) {
      response += `- **Last Tracked:** ${new Date(topic.lastExecutedAt).toLocaleDateString()}\n`;
    }
    
    // Show first few prompts
    if (topic.prompts && topic.prompts.length > 0) {
      response += `\n**Sample Prompts:**\n`;
      const samplePrompts = topic.prompts.slice(0, 3);
      for (const prompt of samplePrompts) {
        const text = typeof prompt === 'string' ? prompt : prompt.text;
        response += `- ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}\n`;
      }
      if (topic.prompts.length > 3) {
        response += `- *...and ${topic.prompts.length - 3} more*\n`;
      }
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Create prompt topic tool handler
 */
export async function createPromptTopic(
  client: ReauditAPIClient,
  args: z.infer<typeof createPromptTopicSchema>
): Promise<string> {
  const result = await client.createPromptTopic({
    projectId: args.projectId,
    name: args.name,
    description: args.description,
    prompts: args.prompts,
    language: args.language || 'en',
    region: args.region || 'global',
  });
  
  if (!result.success || !result.topic) {
    return `Failed to create topic: ${result.error || 'Unknown error'}`;
  }
  
  const topic = result.topic;
  
  let response = `## Topic Created!\n\n`;
  response += `- **Name:** ${topic.name}\n`;
  response += `- **ID:** ${topic.id}\n`;
  response += `- **Prompts Added:** ${args.prompts.length}\n`;
  response += `- **Language:** ${args.language || 'en'}\n`;
  response += `- **Region:** ${args.region || 'global'}\n\n`;
  
  response += `**Prompts:**\n`;
  for (const prompt of args.prompts) {
    response += `- ${prompt}\n`;
  }
  
  response += `\n---\n`;
  response += `Use \`track_prompt\` to submit these prompts for AI tracking.`;
  
  return response;
}

/**
 * Add prompts to topic tool handler
 */
export async function addPromptsToTopic(
  client: ReauditAPIClient,
  args: z.infer<typeof addPromptsToTopicSchema>
): Promise<string> {
  const result = await client.addPromptsToTopic(args.topicId, args.prompts);
  
  if (!result.success) {
    return `Failed to add prompts: ${result.error || 'Unknown error'}`;
  }
  
  let response = `## Prompts Added!\n\n`;
  response += `Added ${args.prompts.length} prompt(s) to topic.\n\n`;
  response += `**New Prompts:**\n`;
  for (const prompt of args.prompts) {
    response += `- ${prompt}\n`;
  }
  
  if (result.totalPrompts) {
    response += `\n**Total Prompts in Topic:** ${result.totalPrompts}`;
  }
  
  return response;
}

/**
 * Track prompt tool handler
 */
export async function trackPrompt(
  client: ReauditAPIClient,
  args: z.infer<typeof trackPromptSchema>
): Promise<string> {
  const engines = args.engines || ['chatgpt', 'perplexity', 'google'];
  
  const result = await client.trackPrompt({
    projectId: args.projectId,
    promptText: args.promptText,
    promptId: args.promptId,
    engines,
  });
  
  if (!result.success) {
    return `Failed to track prompt: ${result.error || 'Unknown error'}`;
  }
  
  let response = `## Prompt Submitted for Tracking!\n\n`;
  response += `**Prompt:** ${args.promptText}\n\n`;
  response += `**Query ID:** ${result.queryId}\n`;
  response += `**Status:** ${result.status}\n`;
  response += `**Engines:** ${engines.join(', ')}\n`;
  
  if (result.estimatedTimeSeconds) {
    response += `**Estimated Time:** ${result.estimatedTimeSeconds} seconds\n`;
  }
  
  response += `\n---\n`;
  response += `Results will be available in the project's AI visibility data. Use \`get_prompt_analytics\` to view tracking results.`;
  
  return response;
}

/**
 * Get prompt analytics tool handler
 */
export async function getPromptAnalytics(
  client: ReauditAPIClient,
  args: z.infer<typeof getPromptAnalyticsSchema>
): Promise<string> {
  const days = args.days || 30;
  const result = await client.getPromptAnalytics(args.projectId, days);
  
  if (!result.success) {
    return `Failed to get analytics: ${result.error || 'Unknown error'}`;
  }
  
  let response = `## Prompt Tracking Analytics (Last ${days} Days)\n\n`;
  
  // Summary stats
  if (result.summary) {
    response += `### Summary\n`;
    response += `- **Total Prompts Tracked:** ${result.summary.totalPrompts || 0}\n`;
    response += `- **Total Queries:** ${result.summary.totalQueries || 0}\n`;
    response += `- **Brand Mentions:** ${result.summary.brandMentions || 0}\n`;
    response += `- **Average Sentiment:** ${result.summary.avgSentiment || 'N/A'}\n`;
    response += `- **Visibility Rate:** ${result.summary.visibilityRate || 0}%\n\n`;
  }
  
  // Platform breakdown
  if (result.platformBreakdown && result.platformBreakdown.length > 0) {
    response += `### Platform Performance\n`;
    for (const platform of result.platformBreakdown) {
      response += `- **${platform.platform}:** ${platform.mentions} mentions, ${platform.sentiment}/100 sentiment\n`;
    }
    response += '\n';
  }
  
  // Top performing prompts
  if (result.topPrompts && result.topPrompts.length > 0) {
    response += `### Top Performing Prompts\n`;
    for (const prompt of result.topPrompts.slice(0, 5)) {
      response += `- "${prompt.text.substring(0, 60)}${prompt.text.length > 60 ? '...' : ''}"\n`;
      response += `  Mentions: ${prompt.mentions}, Sentiment: ${prompt.sentiment}\n`;
    }
    response += '\n';
  }
  
  // Recent queries
  if (result.recentQueries && result.recentQueries.length > 0) {
    response += `### Recent Tracking Results\n`;
    for (const query of result.recentQueries.slice(0, 5)) {
      const statusIcon = query.status === 'completed' ? '✅' : query.status === 'pending' ? '⏳' : '❌';
      response += `${statusIcon} "${query.query.substring(0, 50)}${query.query.length > 50 ? '...' : ''}"\n`;
      if (query.brandMentioned !== undefined) {
        response += `   Brand Mentioned: ${query.brandMentioned ? 'Yes' : 'No'}\n`;
      }
    }
  }
  
  return response;
}

/**
 * Generate prompt suggestions tool handler
 */
export async function generatePromptSuggestions(
  client: ReauditAPIClient,
  args: z.infer<typeof generatePromptSuggestionsSchema>
): Promise<string> {
  const count = args.count || 10;
  
  const result = await client.generatePromptSuggestions({
    projectId: args.projectId,
    topic: args.topic,
    count,
  });
  
  if (!result.success || !result.suggestions || result.suggestions.length === 0) {
    return `Failed to generate suggestions: ${result.error || 'No suggestions generated'}`;
  }
  
  let response = `## AI-Generated Prompt Suggestions\n\n`;
  
  if (args.topic) {
    response += `**Topic Focus:** ${args.topic}\n\n`;
  }
  
  response += `Generated ${result.suggestions.length} prompt suggestions:\n\n`;
  
  for (let i = 0; i < result.suggestions.length; i++) {
    const suggestion = result.suggestions[i];
    response += `${i + 1}. ${suggestion.text}\n`;
    if (suggestion.searchIntent) {
      response += `   *Intent: ${suggestion.searchIntent}*\n`;
    }
  }
  
  response += `\n---\n`;
  response += `Use \`create_prompt_topic\` to save these prompts to a topic, or \`track_prompt\` to track them individually.`;
  
  return response;
}

// ============ Tool Definitions ============

export const promptTools = [
  {
    name: 'list_prompt_topics',
    description: 'List all prompt topics (PromptSets) for a project. Topics contain prompts that are tracked to monitor brand visibility in AI responses.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to list topics for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_prompt_topic',
    description: 'Create a new prompt topic with initial prompts. Topics group related prompts for organized tracking of brand visibility.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        name: {
          type: 'string',
          description: 'Name of the topic (e.g., "Product Questions", "Industry Trends")',
        },
        description: {
          type: 'string',
          description: 'Optional description of the topic',
        },
        prompts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of prompt texts to add to the topic',
        },
        language: {
          type: 'string',
          description: 'Language code (default: en)',
        },
        region: {
          type: 'string',
          description: 'Region code (default: global)',
        },
      },
      required: ['projectId', 'name', 'prompts'],
    },
  },
  {
    name: 'add_prompts_to_topic',
    description: 'Add new prompts to an existing topic.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topicId: {
          type: 'string',
          description: 'The ID of the topic to add prompts to',
        },
        prompts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of prompt texts to add',
        },
      },
      required: ['topicId', 'prompts'],
    },
  },
  {
    name: 'track_prompt',
    description: 'Submit a prompt for AI tracking. The prompt will be sent to AI engines (ChatGPT, Perplexity, Google) to check if/how your brand is mentioned.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        promptText: {
          type: 'string',
          description: 'The prompt text to track',
        },
        promptId: {
          type: 'string',
          description: 'Optional prompt ID if tracking an existing prompt from a topic',
        },
        engines: {
          type: 'array',
          items: { type: 'string' },
          description: 'AI engines to track: chatgpt, perplexity, google (default: all three)',
        },
      },
      required: ['projectId', 'promptText'],
    },
  },
  {
    name: 'get_prompt_analytics',
    description: 'Get analytics for tracked prompts including brand mentions, sentiment, and visibility rates across AI platforms.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        days: {
          type: 'number',
          description: 'Number of days to analyze (default: 30)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'generate_prompt_suggestions',
    description: 'Use AI to generate prompt suggestions based on your project and optional topic focus. Great for discovering new prompts to track.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project',
        },
        topic: {
          type: 'string',
          description: 'Optional topic focus for suggestions (e.g., "product comparisons", "industry trends")',
        },
        count: {
          type: 'number',
          description: 'Number of suggestions to generate (default: 10, max: 20)',
        },
      },
      required: ['projectId'],
    },
  },
];
