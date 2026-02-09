/**
 * Strategy Tools
 * 
 * MCP tools for GTM strategy management.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const listStrategiesSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  status: z.string().optional().describe('Filter by status (draft, in_progress, completed, archived)'),
  limit: z.number().optional().describe('Maximum number of strategies to return (default: 20)'),
});

export const getStrategyDetailsSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy to retrieve'),
});

export const createStrategySchema = z.object({
  name: z.string().describe('Name for the strategy'),
  description: z.string().optional().describe('Description of the strategy'),
  projectId: z.string().optional().describe('Project ID to associate with'),
  companyName: z.string().describe('Company or brand name'),
  industry: z.string().describe('Industry or sector'),
  productService: z.string().describe('Main product or service'),
  targetMarket: z.string().describe('Target market or audience'),
  currentChallenges: z.string().optional().describe('Current business challenges'),
  competitors: z.array(z.string()).optional().describe('List of competitor names'),
  uniqueValueProposition: z.string().optional().describe('Unique value proposition'),
});

export const getStrategyContentItemsSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy'),
  status: z.string().optional().describe('Filter by status (planned, draft, scheduled, published)'),
  weekNumber: z.number().optional().describe('Filter by week number'),
  platform: z.string().optional().describe('Filter by platform'),
});

export const updateContentItemStatusSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy'),
  itemId: z.string().describe('The ID of the content item to update'),
  status: z.string().optional().describe('New status (planned, draft, scheduled, published)'),
  notes: z.string().optional().describe('Notes for the content item'),
  topic: z.string().optional().describe('Updated topic'),
  platform: z.string().optional().describe('Updated platform'),
  plannedDate: z.string().optional().describe('Updated planned date (ISO format)'),
});

/**
 * List strategies tool handler
 */
export async function listStrategies(
  client: ReauditAPIClient,
  args: z.infer<typeof listStrategiesSchema>
): Promise<string> {
  const result = await client.listStrategies({
    projectId: args.projectId,
    status: args.status,
    limit: args.limit,
  });
  
  if (result.strategies.length === 0) {
    return 'No GTM strategies found. Create a strategy to start building your go-to-market plan.';
  }
  
  let response = `## GTM Strategies (${result.pagination.total} total)\n\n`;
  
  for (const strategy of result.strategies) {
    const statusEmoji = strategy.status === 'completed' ? '✅' :
                        strategy.status === 'in_progress' ? '🔄' :
                        strategy.status === 'archived' ? '📦' : '📝';
    
    response += `### ${statusEmoji} ${strategy.name}\n`;
    response += `- **ID:** ${strategy.id}\n`;
    response += `- **Status:** ${strategy.status}\n`;
    response += `- **Progress:** ${strategy.completionPercentage}%\n`;
    response += `- **Company:** ${strategy.businessContext.companyName}\n`;
    response += `- **Industry:** ${strategy.businessContext.industry}\n`;
    response += `- **Target Market:** ${strategy.businessContext.targetMarket}\n`;
    if (strategy.description) {
      response += `- **Description:** ${strategy.description}\n`;
    }
    response += `- **Current Module:** ${strategy.currentModule}, Step ${strategy.currentStep}\n`;
    response += `- **Created:** ${new Date(strategy.createdAt).toLocaleDateString()}\n`;
    response += '\n';
  }
  
  if (result.pagination.totalPages > 1) {
    response += `\n*Page ${result.pagination.page} of ${result.pagination.totalPages}*`;
  }
  
  return response;
}

/**
 * Get strategy details tool handler
 */
export async function getStrategyDetails(
  client: ReauditAPIClient,
  args: z.infer<typeof getStrategyDetailsSchema>
): Promise<string> {
  const result = await client.getStrategyDetails(args.strategyId);
  const strategy = result.strategy;
  
  let response = `## Strategy: ${strategy.name}\n\n`;
  response += `### Overview\n`;
  response += `- **ID:** ${strategy.id}\n`;
  response += `- **Status:** ${strategy.status}\n`;
  response += `- **Progress:** ${strategy.completionPercentage}%\n`;
  response += `- **Credits Used:** ${strategy.totalCreditsUsed || 0}\n\n`;
  
  response += `### Business Context\n`;
  response += `- **Company:** ${strategy.businessContext.companyName}\n`;
  response += `- **Industry:** ${strategy.businessContext.industry}\n`;
  response += `- **Product/Service:** ${strategy.businessContext.productService}\n`;
  response += `- **Target Market:** ${strategy.businessContext.targetMarket}\n\n`;
  
  response += `### Module Progress\n\n`;
  
  const modules = [
    { name: 'Research', data: strategy.modules.research },
    { name: 'Strategy', data: strategy.modules.strategy },
    { name: 'Content Strategy', data: strategy.modules.contentStrategy },
    { name: 'Funnel', data: strategy.modules.funnel },
    { name: 'Execution', data: strategy.modules.execution },
  ];
  
  for (const mod of modules) {
    response += `#### ${mod.name}\n`;
    for (const [key, step] of Object.entries(mod.data || {})) {
      if (step && typeof step === 'object') {
        const stepData = step as { status?: string; stepName?: string; hasOutput?: boolean };
        const statusIcon = stepData.status === 'completed' ? '✅' :
                          stepData.status === 'in_progress' ? '🔄' :
                          stepData.status === 'skipped' ? '⏭️' : '⏳';
        response += `- ${statusIcon} **${stepData.stepName || key}**: ${stepData.status || 'pending'}`;
        if (stepData.hasOutput) {
          response += ` (has output)`;
        }
        response += '\n';
      }
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Create strategy tool handler
 */
export async function createStrategy(
  client: ReauditAPIClient,
  args: z.infer<typeof createStrategySchema>
): Promise<string> {
  const result = await client.createStrategy({
    name: args.name,
    description: args.description,
    projectId: args.projectId,
    businessContext: {
      companyName: args.companyName,
      industry: args.industry,
      productService: args.productService,
      targetMarket: args.targetMarket,
      currentChallenges: args.currentChallenges,
      competitors: args.competitors,
      uniqueValueProposition: args.uniqueValueProposition,
    },
  });
  
  const strategy = result.strategy;
  
  let response = `## Strategy Created Successfully!\n\n`;
  response += `- **Name:** ${strategy.name}\n`;
  response += `- **ID:** ${strategy.id}\n`;
  response += `- **Status:** ${strategy.status}\n`;
  response += `- **Company:** ${strategy.businessContext.companyName}\n`;
  response += `- **Industry:** ${strategy.businessContext.industry}\n\n`;
  response += `You can now use \`get_strategy_details\` to view the full strategy or \`get_strategy_content_items\` to see the content calendar.`;
  
  return response;
}

/**
 * Get strategy content items tool handler
 */
export async function getStrategyContentItems(
  client: ReauditAPIClient,
  args: z.infer<typeof getStrategyContentItemsSchema>
): Promise<string> {
  const result = await client.getStrategyContentItems(args.strategyId, {
    status: args.status,
    weekNumber: args.weekNumber,
    platform: args.platform,
  });
  
  if (result.items.length === 0) {
    return 'No content items found for this strategy. Generate a content calendar in the strategy to create content items.';
  }
  
  let response = `## Strategy Content Items (${result.count} items)\n\n`;
  
  response += `### Status Summary\n`;
  response += `- Total: ${result.stats.total || 0}\n`;
  response += `- Planned: ${result.stats.planned || 0}\n`;
  response += `- Draft: ${result.stats.draft || 0}\n`;
  response += `- Scheduled: ${result.stats.scheduled || 0}\n`;
  response += `- Published: ${result.stats.published || 0}\n\n`;
  
  // Group by week
  const itemsByWeek = new Map<number, typeof result.items>();
  for (const item of result.items) {
    const week = item.weekNumber || 0;
    if (!itemsByWeek.has(week)) {
      itemsByWeek.set(week, []);
    }
    itemsByWeek.get(week)!.push(item);
  }
  
  for (const [week, items] of Array.from(itemsByWeek.entries()).sort((a, b) => a[0] - b[0])) {
    response += `### Week ${week}\n`;
    for (const item of items) {
      const statusIcon = item.status === 'published' ? '✅' :
                        item.status === 'scheduled' ? '📅' :
                        item.status === 'draft' ? '📝' : '📋';
      response += `- ${statusIcon} **${item.topic}**\n`;
      response += `  - ID: ${item.id}\n`;
      response += `  - Platform: ${item.platform} | Status: ${item.status}\n`;
      if (item.pillar) response += `  - Pillar: ${item.pillar}\n`;
      if (item.funnelStage) response += `  - Funnel Stage: ${item.funnelStage}\n`;
      if (item.plannedDate) {
        response += `  - Planned: ${new Date(item.plannedDate).toLocaleDateString()}\n`;
      }
      if (item.hasGeneratedContent) {
        response += `  - ✨ Content generated (ID: ${item.generatedContentId})\n`;
      }
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Update content item status tool handler
 */
export async function updateContentItemStatus(
  client: ReauditAPIClient,
  args: z.infer<typeof updateContentItemStatusSchema>
): Promise<string> {
  const result = await client.updateStrategyContentItem(
    args.strategyId,
    args.itemId,
    {
      status: args.status,
      notes: args.notes,
      topic: args.topic,
      platform: args.platform,
      plannedDate: args.plannedDate,
    }
  );
  
  const item = result.item;
  
  let response = `## Content Item Updated\n\n`;
  response += `- **Topic:** ${item.topic}\n`;
  response += `- **ID:** ${item.id}\n`;
  response += `- **Platform:** ${item.platform}\n`;
  response += `- **Status:** ${item.status}\n`;
  if (item.plannedDate) {
    response += `- **Planned Date:** ${new Date(item.plannedDate).toLocaleDateString()}\n`;
  }
  if (item.notes) {
    response += `- **Notes:** ${item.notes}\n`;
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const strategyTools = [
  {
    name: 'list_strategies',
    description: 'List all GTM (Go-To-Market) strategies. Filter by project, status, or limit results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        status: {
          type: 'string',
          description: 'Filter by status: draft, in_progress, completed, archived',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of strategies to return (default: 20)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_strategy_details',
    description: 'Get detailed information about a specific GTM strategy including all module progress and outputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy to retrieve',
        },
      },
      required: ['strategyId'],
    },
  },
  {
    name: 'create_strategy',
    description: 'Create a new GTM strategy session with business context. This starts the strategy generation process.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name for the strategy',
        },
        description: {
          type: 'string',
          description: 'Description of the strategy',
        },
        projectId: {
          type: 'string',
          description: 'Project ID to associate with',
        },
        companyName: {
          type: 'string',
          description: 'Company or brand name',
        },
        industry: {
          type: 'string',
          description: 'Industry or sector',
        },
        productService: {
          type: 'string',
          description: 'Main product or service',
        },
        targetMarket: {
          type: 'string',
          description: 'Target market or audience',
        },
        currentChallenges: {
          type: 'string',
          description: 'Current business challenges',
        },
        competitors: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of competitor names',
        },
        uniqueValueProposition: {
          type: 'string',
          description: 'Unique value proposition',
        },
      },
      required: ['name', 'companyName', 'industry', 'productService', 'targetMarket'],
    },
  },
  {
    name: 'get_strategy_content_items',
    description: 'Get content items from a strategy\'s 90-day content calendar. Filter by status, week, or platform.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy',
        },
        status: {
          type: 'string',
          description: 'Filter by status: planned, draft, scheduled, published',
        },
        weekNumber: {
          type: 'number',
          description: 'Filter by week number (1-12)',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform: linkedin, twitter, blog, newsletter, youtube, etc.',
        },
      },
      required: ['strategyId'],
    },
  },
  {
    name: 'update_content_item_status',
    description: 'Update a content item\'s status, notes, topic, platform, or planned date.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy',
        },
        itemId: {
          type: 'string',
          description: 'The ID of the content item to update',
        },
        status: {
          type: 'string',
          description: 'New status: planned, draft, scheduled, published',
        },
        notes: {
          type: 'string',
          description: 'Notes for the content item',
        },
        topic: {
          type: 'string',
          description: 'Updated topic',
        },
        platform: {
          type: 'string',
          description: 'Updated platform',
        },
        plannedDate: {
          type: 'string',
          description: 'Updated planned date in ISO format',
        },
      },
      required: ['strategyId', 'itemId'],
    },
  },
];
