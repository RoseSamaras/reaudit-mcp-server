/**
 * MCP Prompts
 * 
 * Pre-built prompt templates for common workflows.
 * These help users get started with common tasks.
 */

import { ReauditAPIClient } from '../lib/api-client.js';

/**
 * Prompt definitions for MCP
 */
export const mcpPrompts = [
  {
    name: 'weekly_visibility_report',
    description: 'Generate a weekly AI visibility report for a project, including mentions, sentiment, and competitor comparison.',
    arguments: [
      {
        name: 'projectId',
        description: 'The ID of the project to report on',
        required: true,
      },
    ],
  },
  {
    name: 'seo_action_plan',
    description: 'Create an actionable SEO improvement plan based on the latest audit results.',
    arguments: [
      {
        name: 'auditId',
        description: 'The ID of the audit to base the plan on',
        required: true,
      },
    ],
  },
  {
    name: 'content_strategy',
    description: 'Generate a content strategy based on knowledge base analysis and SEO recommendations.',
    arguments: [
      {
        name: 'projectId',
        description: 'The ID of the project',
        required: true,
      },
      {
        name: 'topic',
        description: 'Optional topic focus for the strategy',
        required: false,
      },
    ],
  },
  {
    name: 'competitor_analysis',
    description: 'Analyze competitor visibility and provide strategic recommendations.',
    arguments: [
      {
        name: 'projectId',
        description: 'The ID of the project',
        required: true,
      },
    ],
  },
  {
    name: 'bot_activity_summary',
    description: 'Summarize AI bot crawling activity on your WordPress site with insights.',
    arguments: [
      {
        name: 'projectId',
        description: 'The ID of the project',
        required: true,
      },
    ],
  },
];

/**
 * Generate prompt content based on template name
 */
export async function generatePromptContent(
  client: ReauditAPIClient,
  promptName: string,
  args: Record<string, string>
): Promise<string> {
  switch (promptName) {
    case 'weekly_visibility_report':
      return generateWeeklyReport(client, args.projectId);
    
    case 'seo_action_plan':
      return generateSeoActionPlan(client, args.auditId);
    
    case 'content_strategy':
      return generateContentStrategy(client, args.projectId, args.topic);
    
    case 'competitor_analysis':
      return generateCompetitorAnalysis(client, args.projectId);
    
    case 'bot_activity_summary':
      return generateBotActivitySummary(client, args.projectId);
    
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}

/**
 * Generate weekly visibility report prompt
 */
async function generateWeeklyReport(client: ReauditAPIClient, projectId: string): Promise<string> {
  const [visibility, mentions, competitors] = await Promise.all([
    client.getVisibilityScore(projectId),
    client.getBrandMentions(projectId, { days: 7, limit: 10 }),
    client.getCompetitorComparison(projectId),
  ]);
  
  let prompt = `# Weekly AI Visibility Report for ${visibility.brandName}\n\n`;
  prompt += `## Executive Summary\n`;
  prompt += `Please analyze the following data and provide:\n`;
  prompt += `1. Key highlights from this week\n`;
  prompt += `2. Areas of concern\n`;
  prompt += `3. Recommended actions for next week\n\n`;
  
  prompt += `## Current Metrics\n`;
  prompt += `- Visibility Score: ${visibility.visibilityScore}/100\n`;
  prompt += `- Total Mentions (7 days): ${mentions.count}\n`;
  prompt += `- Citation Rate: ${visibility.metrics.citationRate}%\n`;
  prompt += `- Average Sentiment: ${visibility.metrics.avgSentiment}/100\n\n`;
  
  prompt += `## Platform Breakdown\n`;
  for (const platform of visibility.platformBreakdown) {
    prompt += `- ${platform.platform}: ${platform.mentions} mentions (sentiment: ${platform.avgSentiment})\n`;
  }
  prompt += '\n';
  
  prompt += `## Sentiment Distribution\n`;
  prompt += `- Positive: ${visibility.sentimentDistribution.positive}\n`;
  prompt += `- Neutral: ${visibility.sentimentDistribution.neutral}\n`;
  prompt += `- Negative: ${visibility.sentimentDistribution.negative}\n\n`;
  
  if (competitors.competitors.length > 0) {
    prompt += `## Competitive Position\n`;
    prompt += `Your rank: #${competitors.yourMetrics.rank} of ${competitors.yourMetrics.totalCompetitors + 1}\n\n`;
    prompt += `Top competitors:\n`;
    for (const comp of competitors.competitors.slice(0, 3)) {
      prompt += `- ${comp.name}: ${comp.mentions} mentions\n`;
    }
    prompt += '\n';
  }
  
  prompt += `## Recent Mentions\n`;
  for (const mention of mentions.mentions.slice(0, 5)) {
    prompt += `### ${mention.platform} (${mention.sentimentLabel})\n`;
    prompt += `${mention.excerpt}\n\n`;
  }
  
  return prompt;
}

/**
 * Generate SEO action plan prompt
 */
async function generateSeoActionPlan(client: ReauditAPIClient, auditId: string): Promise<string> {
  const [audit, recommendations] = await Promise.all([
    client.getAuditDetails(auditId),
    client.getAuditRecommendations(auditId),
  ]);
  
  let prompt = `# SEO Action Plan for ${audit.domain}\n\n`;
  prompt += `## Current State\n`;
  prompt += `- URL: ${audit.url}\n`;
  prompt += `- Current Score: ${audit.scores.current}/100\n`;
  prompt += `- Potential Score: ${audit.scores.potential}/100\n`;
  prompt += `- Gap to Close: ${audit.scores.potential - audit.scores.current} points\n\n`;
  
  prompt += `## Task\n`;
  prompt += `Please create a prioritized action plan with:\n`;
  prompt += `1. Quick wins (can be done this week)\n`;
  prompt += `2. Medium-term improvements (2-4 weeks)\n`;
  prompt += `3. Long-term strategic changes\n`;
  prompt += `4. Estimated impact for each action\n\n`;
  
  prompt += `## Issues Summary\n`;
  prompt += `- Critical: ${recommendations.summary.critical}\n`;
  prompt += `- High: ${recommendations.summary.high}\n`;
  prompt += `- Medium: ${recommendations.summary.medium}\n`;
  prompt += `- Low: ${recommendations.summary.low}\n\n`;
  
  if (recommendations.byImpact.critical.length > 0) {
    prompt += `## Critical Issues (Fix Immediately)\n`;
    for (const rec of recommendations.byImpact.critical) {
      prompt += `### ${rec.title}\n`;
      prompt += `${rec.description}\n`;
      prompt += `- Category: ${rec.category}\n`;
      prompt += `- Effort: ${rec.effort}\n`;
      if (rec.implementation) {
        prompt += `- How to fix: ${rec.implementation}\n`;
      }
      prompt += '\n';
    }
  }
  
  if (recommendations.byImpact.high.length > 0) {
    prompt += `## High Priority Issues\n`;
    for (const rec of recommendations.byImpact.high.slice(0, 5)) {
      prompt += `### ${rec.title}\n`;
      prompt += `${rec.description}\n`;
      prompt += `- Effort: ${rec.effort}\n\n`;
    }
  }
  
  if (audit.technicalIssues.length > 0) {
    prompt += `## Technical Issues\n`;
    for (const issue of audit.technicalIssues.slice(0, 5)) {
      prompt += `- **${issue.issue}**: ${issue.solution}\n`;
    }
    prompt += '\n';
  }
  
  return prompt;
}

/**
 * Generate content strategy prompt
 */
async function generateContentStrategy(
  client: ReauditAPIClient,
  projectId: string,
  topic?: string
): Promise<string> {
  const [suggestions, kbResult] = await Promise.all([
    client.getContentSuggestions(projectId, { limit: 10 }),
    topic 
      ? client.searchKnowledgeBase(projectId, topic, 5)
      : Promise.resolve(null),
  ]);
  
  let prompt = `# Content Strategy Development\n\n`;
  prompt += `## Task\n`;
  prompt += `Please develop a content strategy that includes:\n`;
  prompt += `1. Content pillars and themes\n`;
  prompt += `2. Specific content pieces to create\n`;
  prompt += `3. Keywords to target\n`;
  prompt += `4. Content formats (blog, video, infographic, etc.)\n`;
  prompt += `5. Publishing schedule recommendations\n\n`;
  
  if (topic) {
    prompt += `## Focus Topic: ${topic}\n\n`;
  }
  
  if (kbResult && kbResult.results.length > 0) {
    prompt += `## Existing Content on Topic\n`;
    for (const result of kbResult.results) {
      prompt += `### ${result.title || 'Content Chunk'}\n`;
      prompt += `${result.content.substring(0, 300)}...\n\n`;
    }
  }
  
  if (suggestions.suggestions.length > 0) {
    prompt += `## AI-Generated Content Suggestions\n`;
    for (const sug of suggestions.suggestions) {
      prompt += `### ${sug.title}\n`;
      prompt += `${sug.description}\n`;
      if (sug.targetKeywords.length > 0) {
        prompt += `Keywords: ${sug.targetKeywords.join(', ')}\n`;
      }
      prompt += '\n';
    }
  }
  
  return prompt;
}

/**
 * Generate competitor analysis prompt
 */
async function generateCompetitorAnalysis(client: ReauditAPIClient, projectId: string): Promise<string> {
  const [visibility, competitors, citations] = await Promise.all([
    client.getVisibilityScore(projectId),
    client.getCompetitorComparison(projectId),
    client.getCitationAnalytics(projectId, 30),
  ]);
  
  let prompt = `# Competitive Analysis for ${visibility.brandName}\n\n`;
  prompt += `## Task\n`;
  prompt += `Please analyze the competitive landscape and provide:\n`;
  prompt += `1. Competitive strengths and weaknesses\n`;
  prompt += `2. Opportunities to gain market share\n`;
  prompt += `3. Threats from competitors\n`;
  prompt += `4. Strategic recommendations\n\n`;
  
  prompt += `## Your Current Position\n`;
  prompt += `- Visibility Score: ${visibility.visibilityScore}/100\n`;
  prompt += `- Total Mentions: ${visibility.metrics.totalMentions}\n`;
  prompt += `- Citation Rate: ${visibility.metrics.citationRate}%\n`;
  prompt += `- Sentiment: ${visibility.metrics.avgSentiment}/100\n`;
  prompt += `- Competitive Rank: #${competitors.yourMetrics.rank}\n\n`;
  
  prompt += `## Competitor Metrics\n`;
  for (const comp of competitors.competitors) {
    prompt += `### ${comp.name}\n`;
    prompt += `- Mentions: ${comp.mentions}\n`;
    prompt += `- Sentiment: ${comp.avgSentiment}/100\n`;
    prompt += `- Citations: ${comp.citations}\n\n`;
  }
  
  prompt += `## Citation Sources\n`;
  prompt += `Top domains citing your brand:\n`;
  for (const domain of citations.topCitedDomains.slice(0, 5)) {
    prompt += `- ${domain.domain}: ${domain.count} citations\n`;
  }
  prompt += '\n';
  
  prompt += `## Platform Performance\n`;
  for (const platform of visibility.platformBreakdown) {
    prompt += `- ${platform.platform}: ${platform.mentions} mentions\n`;
  }
  
  return prompt;
}

/**
 * Generate bot activity summary prompt
 */
async function generateBotActivitySummary(client: ReauditAPIClient, projectId: string): Promise<string> {
  const wpAnalytics = await client.getWordPressAnalytics(projectId, 30);
  
  let prompt = `# AI Bot Activity Summary\n\n`;
  prompt += `## Task\n`;
  prompt += `Please analyze the AI bot crawling activity and provide:\n`;
  prompt += `1. Key insights about which AI systems are indexing the site\n`;
  prompt += `2. Content that is attracting the most AI attention\n`;
  prompt += `3. Recommendations to improve AI discoverability\n`;
  prompt += `4. Any concerns or anomalies\n\n`;
  
  prompt += `## Summary (Last 30 Days)\n`;
  prompt += `- Total Bot Visits: ${wpAnalytics.summary.totalBotVisits}\n`;
  prompt += `- Unique Bot Types: ${wpAnalytics.summary.uniqueBotTypes}\n\n`;
  
  prompt += `## Bot Breakdown\n`;
  for (const bot of wpAnalytics.botBreakdown) {
    prompt += `### ${bot.botType}\n`;
    prompt += `- Visits: ${bot.visits}\n`;
    prompt += `- Unique Pages: ${bot.uniquePages}\n\n`;
  }
  
  prompt += `## Most Crawled Pages\n`;
  for (const page of wpAnalytics.topCrawledPages.slice(0, 10)) {
    prompt += `- ${page.url}\n`;
    prompt += `  Visits: ${page.visits} | Bots: ${page.bots.join(', ')}\n`;
  }
  
  return prompt;
}
