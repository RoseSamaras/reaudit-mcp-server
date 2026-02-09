/**
 * Action Grid Tools
 * 
 * MCP tools for managing optimization task boards.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

export const listActionGridsSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.number().optional().describe('Max grids to return (default: 20, max: 50)'),
});

export const createActionGridSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Grid name'),
  description: z.string().optional().describe('Grid description'),
  items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'skipped']).optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    category: z.string().optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  })).optional().describe('Initial items'),
  categories: z.array(z.string()).optional().describe('Category labels'),
  source: z.enum(['manual', 'audit', 'strategy', 'ai_suggestion']).optional().describe('Source type'),
  tags: z.array(z.string()).optional().describe('Tags'),
});

export const getActionGridSchema = z.object({ id: z.string().describe('Grid ID') });
export const deleteActionGridSchema = z.object({ id: z.string().describe('Grid ID') });

export const addGridItemsSchema = z.object({
  gridId: z.string().describe('Grid ID'),
  items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'skipped']).optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    category: z.string().optional(),
  })).describe('Items to add'),
});

export const updateGridItemSchema = z.object({
  gridId: z.string().describe('Grid ID'),
  itemId: z.string().describe('Item ID'),
  status: z.enum(['todo', 'in_progress', 'done', 'skipped']).optional().describe('New status'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('New priority'),
  assignee: z.string().optional().describe('Assignee'),
  notes: z.string().optional().describe('Notes'),
});

/**
 * List action grids
 */
export async function listActionGrids(
  client: ReauditAPIClient,
  args: z.infer<typeof listActionGridsSchema>
): Promise<string> {
  const result = await client.listActionGrids(args.projectId, args.limit);

  let response = `## Action Grids\n`;
  response += `Total: ${result.count}\n\n`;

  if (result.grids.length === 0) {
    response += 'No action grids found. Create one with create_action_grid.\n';
    return response;
  }

  for (const grid of result.grids) {
    response += `### ${grid.name}\n`;
    if (grid.description) response += `${grid.description}\n`;
    response += `- ID: ${grid.id}\n`;
    response += `- Items: ${grid.stats.total} total (${grid.stats.todo} todo, ${grid.stats.inProgress} in progress, ${grid.stats.done} done)\n`;
    response += `- Categories: ${grid.categories?.join(', ') || 'none'}\n`;
    if (grid.tags?.length) response += `- Tags: ${grid.tags.join(', ')}\n`;
    response += '\n';
  }

  return response;
}

/**
 * Create an action grid
 */
export async function createActionGrid(
  client: ReauditAPIClient,
  args: z.infer<typeof createActionGridSchema>
): Promise<string> {
  const result = await client.createActionGrid({
    projectId: args.projectId,
    name: args.name,
    description: args.description,
    items: args.items,
    categories: args.categories,
    source: args.source,
    tags: args.tags,
  });

  return `## Action Grid Created\n\n- ID: ${result.id}\n- Name: ${result.name}\n- Items: ${result.itemCount}\n- Categories: ${result.categories?.join(', ')}\n`;
}

/**
 * Get action grid details
 */
export async function getActionGrid(
  client: ReauditAPIClient,
  args: z.infer<typeof getActionGridSchema>
): Promise<string> {
  const grid = await client.getActionGrid(args.id);

  let response = `## ${grid.name}\n`;
  if (grid.description) response += `${grid.description}\n\n`;
  
  response += `### Progress\n`;
  response += `- Total: ${grid.stats.total}\n`;
  response += `- Todo: ${grid.stats.todo} | In Progress: ${grid.stats.inProgress} | Done: ${grid.stats.done} | Skipped: ${grid.stats.skipped}\n\n`;

  if (grid.items && grid.items.length > 0) {
    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const item of grid.items) {
      const cat = item.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    for (const [category, items] of Object.entries(byCategory)) {
      response += `### ${category}\n`;
      for (const item of items) {
        const statusIcon = item.status === 'done' ? '✅' : item.status === 'in_progress' ? '🔄' : item.status === 'skipped' ? '⏭️' : '⬜';
        const priorityTag = item.priority === 'critical' ? '🔴' : item.priority === 'high' ? '🟠' : item.priority === 'medium' ? '🟡' : '🟢';
        response += `${statusIcon} ${priorityTag} **${item.title}** (ID: ${item.id})\n`;
        if (item.description) response += `  ${item.description}\n`;
        if (item.assignee) response += `  Assignee: ${item.assignee}\n`;
        if (item.notes) response += `  Notes: ${item.notes}\n`;
      }
      response += '\n';
    }
  }

  return response;
}

/**
 * Delete an action grid
 */
export async function deleteActionGrid(
  client: ReauditAPIClient,
  args: z.infer<typeof deleteActionGridSchema>
): Promise<string> {
  await client.deleteActionGrid(args.id);
  return `Action grid ${args.id} has been deleted.`;
}

/**
 * Add items to an action grid
 */
export async function addGridItems(
  client: ReauditAPIClient,
  args: z.infer<typeof addGridItemsSchema>
): Promise<string> {
  const result = await client.addActionGridItems(args.gridId, args.items);
  return `Added ${result.addedCount} items to grid. Total items: ${result.totalItems}\nCategories: ${result.categories?.join(', ')}`;
}

/**
 * Update an action grid item
 */
export async function updateGridItem(
  client: ReauditAPIClient,
  args: z.infer<typeof updateGridItemSchema>
): Promise<string> {
  const result = await client.updateActionGridItem(args.gridId, args.itemId, {
    status: args.status,
    priority: args.priority,
    assignee: args.assignee,
    notes: args.notes,
  });
  
  const item = result.item;
  return `Updated item "${item.title}" — Status: ${item.status}, Priority: ${item.priority}`;
}

/**
 * Tool definitions for MCP
 */
export const actionGridTools = [
  {
    name: 'list_action_grids',
    description: 'List optimization task boards (action grids) for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Filter by project' },
        limit: { type: 'number', description: 'Max grids (default: 20, max: 50)' },
      },
    },
  },
  {
    name: 'create_action_grid',
    description: 'Create an optimization task board with categorized items. Use for SEO tasks, content optimization, or any workflow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Grid name' },
        description: { type: 'string', description: 'Grid description' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'skipped'] },
              priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              category: { type: 'string' },
            },
            required: ['title'],
          },
        },
        categories: { type: 'array', items: { type: 'string' } },
        source: { type: 'string', enum: ['manual', 'audit', 'strategy', 'ai_suggestion'] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'get_action_grid',
    description: 'Get an action grid with all items, grouped by category and showing progress.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Grid ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_action_grid',
    description: 'Delete an action grid.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Grid ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_grid_items',
    description: 'Add new items to an existing action grid.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        gridId: { type: 'string', description: 'Grid ID' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'skipped'] },
              priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              category: { type: 'string' },
            },
            required: ['title'],
          },
        },
      },
      required: ['gridId', 'items'],
    },
  },
  {
    name: 'update_grid_item',
    description: 'Update status, priority, assignee, or notes of an action grid item.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        gridId: { type: 'string', description: 'Grid ID' },
        itemId: { type: 'string', description: 'Item ID' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'skipped'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        assignee: { type: 'string', description: 'Assignee name' },
        notes: { type: 'string', description: 'Notes' },
      },
      required: ['gridId', 'itemId'],
    },
  },
];
