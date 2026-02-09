/**
 * MCP Resources
 * 
 * Read-only data resources accessible via reaudit:// URIs.
 */

import { ReauditAPIClient } from '../lib/api-client.js';

/**
 * Resource definitions for MCP
 */
export const mcpResources = [
  {
    uri: 'reaudit://projects',
    name: 'Projects List',
    description: 'List of all your Reaudit projects',
    mimeType: 'application/json',
  },
  {
    uri: 'reaudit://account',
    name: 'Account Information',
    description: 'Your account details and usage summary',
    mimeType: 'application/json',
  },
];

/**
 * Resource templates for dynamic resources
 */
export const resourceTemplates = [
  {
    uriTemplate: 'reaudit://projects/{projectId}/visibility',
    name: 'Project Visibility',
    description: 'AI visibility score and metrics for a project',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'reaudit://projects/{projectId}/mentions',
    name: 'Brand Mentions',
    description: 'Recent brand mentions across AI platforms',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'reaudit://audits/{auditId}',
    name: 'Audit Details',
    description: 'Detailed SEO audit results',
    mimeType: 'application/json',
  },
];

/**
 * Read a resource by URI
 */
export async function readResource(
  client: ReauditAPIClient,
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  // Parse the URI
  const url = new URL(uri);
  const path = url.pathname;
  
  // Route to appropriate handler
  if (uri === 'reaudit://projects') {
    const data = await client.listProjects();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
  
  if (uri === 'reaudit://account') {
    const data = await client.getAccount();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
  
  // Handle project-specific resources
  const projectVisibilityMatch = path.match(/^\/\/projects\/([^/]+)\/visibility$/);
  if (projectVisibilityMatch) {
    const projectId = projectVisibilityMatch[1];
    const data = await client.getVisibilityScore(projectId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
  
  const projectMentionsMatch = path.match(/^\/\/projects\/([^/]+)\/mentions$/);
  if (projectMentionsMatch) {
    const projectId = projectMentionsMatch[1];
    const data = await client.getBrandMentions(projectId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
  
  // Handle audit resources
  const auditMatch = path.match(/^\/\/audits\/([^/]+)$/);
  if (auditMatch) {
    const auditId = auditMatch[1];
    const data = await client.getAuditDetails(auditId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
  
  throw new Error(`Resource not found: ${uri}`);
}

/**
 * List available resources
 */
export function listResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}> {
  return mcpResources;
}
