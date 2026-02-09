/**
 * Audit Tools
 * 
 * MCP tools for SEO audits and recommendations.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// Tool schemas
export const listAuditsSchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.number().optional().describe('Maximum number of audits to return (default: 10, max: 50)'),
  status: z.string().optional().describe('Filter by status (pending, processing, completed, failed)'),
});

export const getAuditDetailsSchema = z.object({
  auditId: z.string().describe('The ID of the audit to get details for'),
});

export const getAuditRecommendationsSchema = z.object({
  auditId: z.string().describe('The ID of the audit'),
  category: z.string().optional().describe('Filter by category (technical, content, performance, mobile, local)'),
  impact: z.string().optional().describe('Filter by impact level (critical, high, medium, low)'),
});

/**
 * List audits tool handler
 */
export async function listAudits(
  client: ReauditAPIClient,
  args: z.infer<typeof listAuditsSchema>
): Promise<string> {
  const result = await client.listAudits({
    projectId: args.projectId,
    limit: args.limit,
    status: args.status,
  });
  
  if (result.audits.length === 0) {
    return 'No SEO audits found. Run an audit in the Reaudit dashboard to get started.';
  }
  
  let response = `## SEO Audits (${result.count} total)\n\n`;
  
  for (const audit of result.audits) {
    const statusEmoji = audit.status === 'completed' ? '✅' : 
                       audit.status === 'processing' ? '⏳' : 
                       audit.status === 'failed' ? '❌' : '⏸️';
    
    response += `### ${statusEmoji} ${audit.domain}\n`;
    response += `- **URL:** ${audit.url}\n`;
    response += `- **Status:** ${audit.status}\n`;
    
    if (audit.currentScore !== null) {
      response += `- **Score:** ${audit.currentScore}/100`;
      if (audit.potentialScore !== null && audit.potentialScore > audit.currentScore) {
        response += ` (potential: ${audit.potentialScore})`;
      }
      response += '\n';
    }
    
    if (audit.pageTitle) {
      response += `- **Title:** ${audit.pageTitle}\n`;
    }
    
    response += `- **ID:** ${audit.id}\n`;
    response += `- **Date:** ${new Date(audit.createdAt).toLocaleDateString()}\n\n`;
  }
  
  return response;
}

/**
 * Get audit details tool handler
 */
export async function getAuditDetails(
  client: ReauditAPIClient,
  args: z.infer<typeof getAuditDetailsSchema>
): Promise<string> {
  const audit = await client.getAuditDetails(args.auditId);
  
  if (audit.status !== 'completed') {
    return `Audit is ${audit.status}. ${audit.status === 'processing' ? 'Please wait for it to complete.' : ''}`;
  }
  
  let response = `## SEO Audit: ${audit.domain}\n\n`;
  response += `**URL:** ${audit.url}\n`;
  response += `**Title:** ${audit.pageTitle}\n`;
  response += `**Description:** ${audit.pageDescription}\n\n`;
  
  response += `### Scores\n`;
  response += `- **Current SEO Score:** ${audit.scores.current}/100\n`;
  response += `- **Potential Score:** ${audit.scores.potential}/100\n`;
  if (audit.scores.pageSpeed !== null) {
    response += `- **Page Speed:** ${audit.scores.pageSpeed}/100\n`;
  }
  if (audit.scores.accessibility !== null) {
    response += `- **Accessibility:** ${audit.scores.accessibility}/100\n`;
  }
  response += '\n';
  
  response += `### Focus Keyphrase\n`;
  response += `${audit.focusKeyphrase}\n\n`;
  
  if (audit.recommendations.length > 0) {
    response += `### Top Recommendations (${audit.recommendations.length} total)\n`;
    const topRecs = audit.recommendations.slice(0, 5);
    for (const rec of topRecs) {
      const impactEmoji = rec.impact === 'critical' ? '🔴' : 
                         rec.impact === 'high' ? '🟠' : 
                         rec.impact === 'medium' ? '🟡' : '🟢';
      response += `${impactEmoji} **${rec.title}** (${rec.category})\n`;
      response += `   ${rec.description}\n\n`;
    }
  }
  
  if (audit.technicalIssues.length > 0) {
    response += `### Technical Issues (${audit.technicalIssues.length})\n`;
    for (const issue of audit.technicalIssues.slice(0, 3)) {
      response += `- **${issue.issue}**\n`;
      response += `  Impact: ${issue.impact}\n`;
      response += `  Solution: ${issue.solution}\n\n`;
    }
  }
  
  if (audit.pageSpeed) {
    response += `### Page Speed Metrics\n`;
    response += `- FCP: ${audit.pageSpeed.fcp}\n`;
    response += `- LCP: ${audit.pageSpeed.lcp}\n`;
    response += `- TBT: ${audit.pageSpeed.tbt}\n`;
    response += `- CLS: ${audit.pageSpeed.cls}\n\n`;
  }
  
  if (audit.contentQuality) {
    response += `### Content Quality\n`;
    response += `- Overall: ${audit.contentQuality.overall}/100\n`;
    response += `- Clarity: ${audit.contentQuality.clarity}/100\n`;
    response += `- Factuality: ${audit.contentQuality.factuality}/100\n`;
    response += `- Answerability: ${audit.contentQuality.answerability}/100\n`;
  }
  
  return response;
}

/**
 * Get audit recommendations tool handler
 */
export async function getAuditRecommendations(
  client: ReauditAPIClient,
  args: z.infer<typeof getAuditRecommendationsSchema>
): Promise<string> {
  const result = await client.getAuditRecommendations(args.auditId, {
    category: args.category,
    impact: args.impact,
  });
  
  if (result.totalRecommendations === 0) {
    return 'No recommendations found for this audit.';
  }
  
  let response = `## SEO Recommendations for ${result.url}\n`;
  response += `**Current Score:** ${result.currentScore}/100\n`;
  response += `**Total Recommendations:** ${result.totalRecommendations}\n\n`;
  
  response += `### Summary\n`;
  response += `- 🔴 Critical: ${result.summary.critical}\n`;
  response += `- 🟠 High: ${result.summary.high}\n`;
  response += `- 🟡 Medium: ${result.summary.medium}\n`;
  response += `- 🟢 Low: ${result.summary.low}\n\n`;
  
  const sections = [
    { name: 'Critical', emoji: '🔴', items: result.byImpact.critical },
    { name: 'High', emoji: '🟠', items: result.byImpact.high },
    { name: 'Medium', emoji: '🟡', items: result.byImpact.medium },
    { name: 'Low', emoji: '🟢', items: result.byImpact.low },
  ];
  
  for (const section of sections) {
    if (section.items.length > 0) {
      response += `### ${section.emoji} ${section.name} Priority\n\n`;
      for (const rec of section.items) {
        response += `**${rec.title}** (${rec.category})\n`;
        response += `${rec.description}\n`;
        response += `- Effort: ${rec.effort}\n`;
        response += `- Time to Impact: ${rec.timeToImpact}\n`;
        if (rec.implementation) {
          response += `- Implementation: ${rec.implementation}\n`;
        }
        response += '\n';
      }
    }
  }
  
  return response;
}

/**
 * Tool definitions for MCP
 */
export const auditTools = [
  {
    name: 'list_audits',
    description: 'List SEO audits. Shows audit status, scores, and basic info for each audited page.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of audits to return (default: 10, max: 50)',
        },
        status: {
          type: 'string',
          description: 'Filter by status (pending, processing, completed, failed)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_audit_details',
    description: 'Get detailed results of a specific SEO audit including scores, recommendations, technical issues, and page speed metrics.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        auditId: {
          type: 'string',
          description: 'The ID of the audit to get details for',
        },
      },
      required: ['auditId'],
    },
  },
  {
    name: 'get_audit_recommendations',
    description: 'Get prioritized SEO recommendations from an audit, grouped by impact level (critical, high, medium, low).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        auditId: {
          type: 'string',
          description: 'The ID of the audit',
        },
        category: {
          type: 'string',
          description: 'Filter by category (technical, content, performance, mobile, local)',
        },
        impact: {
          type: 'string',
          description: 'Filter by impact level (critical, high, medium, low)',
        },
      },
      required: ['auditId'],
    },
  },
];
