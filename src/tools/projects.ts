/**
 * Project Tools
 * 
 * MCP tools for managing and querying projects.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Store active project context
let activeProjectId: string | null = null;
let activeProjectName: string | null = null;

// Tool schemas
export const listProjectsSchema = z.object({});

export const getProjectSchema = z.object({
  projectId: z.string().describe('The ID of the project to retrieve'),
});

export const setActiveProjectSchema = z.object({
  projectId: z.string().describe('The ID of the project to set as active'),
});

export const getActiveProjectSchema = z.object({});

/**
 * List all projects tool handler
 */
export async function listProjects(
  client: ReauditAPIClient,
  _args: z.infer<typeof listProjectsSchema>
): Promise<string> {
  const result = await client.listProjects();
  
  if (result.projects.length === 0) {
    return 'You have no projects yet. Create a project in the Reaudit dashboard to get started.';
  }
  
  let response = `Found ${result.count} project(s):\n\n`;
  
  for (const project of result.projects) {
    response += `**${project.name}**\n`;
    response += `- ID: ${project.id}\n`;
    if (project.domain) {
      response += `- Domain: ${project.domain}\n`;
    }
    if (project.industry) {
      response += `- Industry: ${project.industry}\n`;
    }
    response += '\n';
  }
  
  return response;
}

/**
 * Set active project tool handler
 */
export async function setActiveProject(
  client: ReauditAPIClient,
  args: z.infer<typeof setActiveProjectSchema>
): Promise<string> {
  const result = await client.listProjects();
  
  const project = result.projects.find(p => p.id === args.projectId);
  
  if (!project) {
    return `Project not found with ID: ${args.projectId}. Use list_projects to see available projects.`;
  }
  
  activeProjectId = project.id;
  activeProjectName = project.name;
  
  return `Active project set to: **${project.name}** (${project.id})\n\nYou can now use tools without specifying projectId - they will use this project by default.`;
}

/**
 * Get active project tool handler
 */
export async function getActiveProject(
  _client: ReauditAPIClient,
  _args: z.infer<typeof getActiveProjectSchema>
): Promise<string> {
  if (!activeProjectId) {
    return 'No active project set. Use set_active_project to set one, or specify projectId in each tool call.';
  }
  
  return `Active project: **${activeProjectName}** (${activeProjectId})`;
}

/**
 * Get the current active project ID (for use by other tools)
 */
export function getActiveProjectId(): string | null {
  return activeProjectId;
}

/**
 * Tool definitions for MCP
 */
export const projectTools = [
  {
    name: 'list_projects',
    description: 'List all projects in your Reaudit account. Returns project names, IDs, domains, and industries.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'set_active_project',
    description: 'Set the active project context. Once set, other tools will use this project by default without needing to specify projectId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to set as active',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_active_project',
    description: 'Get the currently active project context.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
];
