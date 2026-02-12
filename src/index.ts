#!/usr/bin/env node

/**
 * Reaudit MCP Server
 * 
 * Model Context Protocol server for accessing Reaudit AI Visibility Platform
 * from AI assistants like Claude Desktop and Cursor.
 * 
 * @see https://reaudit.io/docs/mcp
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ReauditAPIClient } from './lib/api-client.js';

// Project tools
import { projectTools, listProjects, setActiveProject, getActiveProject } from './tools/projects.js';

// Project settings tools
import {
  projectSettingsTools,
  getProjectSettings,
  updateProjectSettings,
} from './tools/project-settings.js';

// Account tools
import { accountTools, getUsageSummary } from './tools/account.js';

// Visibility tools
import {
  visibilityTools,
  getVisibilityScore,
  getBrandMentions,
  getCompetitorComparison,
} from './tools/visibility.js';

// Audit tools
import {
  auditTools,
  listAudits,
  getAuditDetails,
  getAuditRecommendations,
} from './tools/audits.js';

// Content tools
import {
  contentTools,
  searchKnowledgeBase,
  getContentSuggestions,
} from './tools/content.js';

// Analytics tools
import {
  analyticsTools,
  getCitationAnalytics,
  getWordPressAnalytics,
} from './tools/analytics.js';

// Usage tools
import {
  usageTools,
  getTokenUsage,
  getBudgetStatus,
  setBudgetLimits,
} from './tools/usage.js';

// Calendar tools
import {
  calendarTools,
  getContentCalendar,
} from './tools/calendar.js';

// Strategy tools
import {
  strategyTools,
  listStrategies,
  getStrategyDetails,
  createStrategy,
  getStrategyContentItems,
  updateContentItemStatus,
} from './tools/strategy.js';

// Strategy step tools (generate, read, edit steps)
import {
  strategyStepTools,
  generateStrategyStep,
  getStrategyStepOutput,
  editStrategyStep,
  getStrategyStepMap,
} from './tools/strategy-steps.js';

// Content generation tools
import {
  contentGenerationTools,
  generateContent,
  getContentHistory,
  getContentDetails,
  editContent,
  deleteContent,
} from './tools/content-generation.js';

// Sources & outreach tools
import {
  sourcesTools,
  getCitationSources,
  extractAuthorInfo,
  listOutreachOpportunities,
  createOutreachOpportunity,
} from './tools/sources.js';

// Indexing tools
import {
  indexingTools,
  listIndexingConnections,
  createIndexingConnection,
  syncIndexingConnection,
} from './tools/indexing.js';

// Social media tools
import {
  socialTools,
  listSocialConnections,
  listSocialPosts,
  generateSocialPosts,
  publishSocialPost,
  scheduleSocialPost,
} from './tools/social.js';

// Publishing tools
import {
  publishingTools,
  listWordPressConnections,
  publishToWordPress,
  listReactConnections,
  publishToReact,
} from './tools/publishing.js';

// Optimization tools
import {
  optimizationTools,
  generateLlmsTxt,
  translateContent,
} from './tools/optimization.js';

// Prompt tracking tools
import {
  promptTools,
  listPromptTopics,
  createPromptTopic,
  addPromptsToTopic,
  trackPrompt,
  getPromptAnalytics,
  generatePromptSuggestions,
} from './tools/prompts.js';

// Analytics query tools
import {
  analyticsQueryTools,
  queryAnalytics,
} from './tools/analytics-query.js';

// Saved reports tools
import {
  reportsTools,
  listReports,
  createReport,
  getReport,
  deleteReport,
} from './tools/reports.js';

// Action grid tools
import {
  actionGridTools,
  listActionGrids,
  createActionGrid,
  getActionGrid,
  deleteActionGrid,
  addGridItems,
  updateGridItem,
} from './tools/action-grids.js';

// Agent analytics (AI bot crawl tracking)
import {
  agentAnalyticsTools,
  getAgentAnalytics,
} from './tools/agent-analytics.js';

// Site tracking tools (WordPress, Webflow, Wix)
import {
  trackingTools,
  getAiReferralPerformance,
  getPageCitations,
  getWebflowTracking,
  getWixTracking,
} from './tools/tracking.js';

// Competitor management tools
import {
  competitorTools,
  listCompetitors,
  addCompetitor,
  deleteCompetitor,
} from './tools/competitors.js';

// Reddit lead monitoring tools
import {
  redditTools,
  listRedditMonitors,
  getRedditLeads,
  updateRedditLead,
} from './tools/reddit.js';

// GA4 analytics tools
import {
  ga4Tools,
  getGA4Analytics,
} from './tools/ga4.js';

// SEO alerts tools
import {
  seoAlertTools,
  getSeoAlerts,
} from './tools/seo-alerts.js';

// Prompts
import { mcpPrompts, generatePromptContent } from './prompts/index.js';

// Resources
import { listResources, readResource } from './resources/index.js';

// Configuration - always use production URL
const BASE_URL = process.env.REAUDIT_BASE_URL || 'https://reaudit.io';

// Initialize API client
const apiClient = new ReauditAPIClient(BASE_URL);

// Create MCP server
const server = new Server(
  {
    name: 'reaudit-mcp-server',
    version: '1.3.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...projectTools,
  ...projectSettingsTools,
  ...accountTools,
  ...visibilityTools,
  ...auditTools,
  ...contentTools,
  ...analyticsTools,
  ...usageTools,
  ...calendarTools,
  ...strategyTools,
  ...strategyStepTools,
  ...contentGenerationTools,
  ...sourcesTools,
  ...indexingTools,
  ...socialTools,
  ...publishingTools,
  ...optimizationTools,
  ...promptTools,
  ...analyticsQueryTools,
  ...reportsTools,
  ...actionGridTools,
  ...agentAnalyticsTools,
  ...trackingTools,
  ...competitorTools,
  ...redditTools,
  ...ga4Tools,
  ...seoAlertTools,
];

/**
 * Handle list tools request
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result: string;
    
    switch (name) {
      // Project tools
      case 'list_projects':
        result = await listProjects(apiClient, args || {});
        break;
      case 'set_active_project':
        result = await setActiveProject(apiClient, args as any);
        break;
      case 'get_active_project':
        result = await getActiveProject(apiClient, args || {});
        break;
      
      // Project settings tools
      case 'get_project_settings':
        result = await getProjectSettings(apiClient, args as any);
        break;
      case 'update_project_settings':
        result = await updateProjectSettings(apiClient, args as any);
        break;
      
      // Account tools
      case 'get_usage_summary':
        result = await getUsageSummary(apiClient, args || {});
        break;
      
      // Visibility tools
      case 'get_visibility_score':
        result = await getVisibilityScore(apiClient, args as any);
        break;
      case 'get_brand_mentions':
        result = await getBrandMentions(apiClient, args as any);
        break;
      case 'get_competitor_comparison':
        result = await getCompetitorComparison(apiClient, args as any);
        break;
      
      // Audit tools
      case 'list_audits':
        result = await listAudits(apiClient, args as any);
        break;
      case 'get_audit_details':
        result = await getAuditDetails(apiClient, args as any);
        break;
      case 'get_audit_recommendations':
        result = await getAuditRecommendations(apiClient, args as any);
        break;
      
      // Content tools
      case 'search_knowledge_base':
        result = await searchKnowledgeBase(apiClient, args as any);
        break;
      case 'get_content_suggestions':
        result = await getContentSuggestions(apiClient, args as any);
        break;
      
      // Analytics tools
      case 'get_citation_analytics':
        result = await getCitationAnalytics(apiClient, args as any);
        break;
      case 'get_wordpress_analytics':
        result = await getWordPressAnalytics(apiClient, args as any);
        break;
      
      // Usage tools
      case 'get_token_usage':
        result = await getTokenUsage(apiClient, args as any);
        break;
      case 'get_budget_status':
        result = await getBudgetStatus(apiClient, args as any);
        break;
      case 'set_budget_limits':
        result = await setBudgetLimits(apiClient, args as any);
        break;
      
      // Calendar tools
      case 'get_content_calendar':
        result = await getContentCalendar(apiClient, args as any);
        break;
      
      // Strategy tools
      case 'list_strategies':
        result = await listStrategies(apiClient, args as any);
        break;
      case 'get_strategy_details':
        result = await getStrategyDetails(apiClient, args as any);
        break;
      case 'create_strategy':
        result = await createStrategy(apiClient, args as any);
        break;
      case 'get_strategy_content_items':
        result = await getStrategyContentItems(apiClient, args as any);
        break;
      case 'update_content_item_status':
        result = await updateContentItemStatus(apiClient, args as any);
        break;
      
      // Strategy step tools
      case 'generate_strategy_step':
        result = await generateStrategyStep(apiClient, args as any);
        break;
      case 'get_strategy_step_output':
        result = await getStrategyStepOutput(apiClient, args as any);
        break;
      case 'edit_strategy_step':
        result = await editStrategyStep(apiClient, args as any);
        break;
      case 'get_strategy_step_map':
        result = await getStrategyStepMap();
        break;
      
      // Content generation tools
      case 'generate_content':
        result = await generateContent(apiClient, args as any);
        break;
      case 'get_content_history':
        result = await getContentHistory(apiClient, args as any);
        break;
      case 'get_content_details':
        result = await getContentDetails(apiClient, args as any);
        break;
      case 'edit_content':
        result = await editContent(apiClient, args as any);
        break;
      case 'delete_content':
        result = await deleteContent(apiClient, args as any);
        break;
      
      // Sources & outreach tools
      case 'get_citation_sources':
        result = await getCitationSources(apiClient, args as any);
        break;
      case 'extract_author_info':
        result = await extractAuthorInfo(apiClient, args as any);
        break;
      case 'list_outreach_opportunities':
        result = await listOutreachOpportunities(apiClient, args as any);
        break;
      case 'create_outreach_opportunity':
        result = await createOutreachOpportunity(apiClient, args as any);
        break;
      
      // Indexing tools
      case 'list_indexing_connections':
        result = await listIndexingConnections(apiClient, args as any);
        break;
      case 'create_indexing_connection':
        result = await createIndexingConnection(apiClient, args as any);
        break;
      case 'sync_indexing_connection':
        result = await syncIndexingConnection(apiClient, args as any);
        break;
      
      // Social media tools
      case 'list_social_connections':
        result = await listSocialConnections(apiClient, args as any);
        break;
      case 'list_social_posts':
        result = await listSocialPosts(apiClient, args as any);
        break;
      case 'generate_social_posts':
        result = await generateSocialPosts(apiClient, args as any);
        break;
      case 'publish_social_post':
        result = await publishSocialPost(apiClient, args as any);
        break;
      case 'schedule_social_post':
        result = await scheduleSocialPost(apiClient, args as any);
        break;
      
      // Publishing tools
      case 'list_wordpress_connections':
        result = await listWordPressConnections(apiClient, args as any);
        break;
      case 'publish_to_wordpress':
        result = await publishToWordPress(apiClient, args as any);
        break;
      case 'list_react_connections':
        result = await listReactConnections(apiClient, args as any);
        break;
      case 'publish_to_react':
        result = await publishToReact(apiClient, args as any);
        break;
      
      // Utility tools
      case 'generate_llms_txt':
        result = await generateLlmsTxt(apiClient, args as any);
        break;
      case 'translate_content':
        result = await translateContent(apiClient, args as any);
        break;
      
      // Prompt tracking tools
      case 'list_prompt_topics':
        result = await listPromptTopics(apiClient, args as any);
        break;
      case 'create_prompt_topic':
        result = await createPromptTopic(apiClient, args as any);
        break;
      case 'add_prompts_to_topic':
        result = await addPromptsToTopic(apiClient, args as any);
        break;
      case 'track_prompt':
        result = await trackPrompt(apiClient, args as any);
        break;
      case 'get_prompt_analytics':
        result = await getPromptAnalytics(apiClient, args as any);
        break;
      case 'generate_prompt_suggestions':
        result = await generatePromptSuggestions(apiClient, args as any);
        break;
      
      // Analytics query tools
      case 'query_analytics':
        result = await queryAnalytics(apiClient, args as any);
        break;
      
      // Saved reports tools
      case 'list_reports':
        result = await listReports(apiClient, args as any);
        break;
      case 'create_report':
        result = await createReport(apiClient, args as any);
        break;
      case 'get_report':
        result = await getReport(apiClient, args as any);
        break;
      case 'delete_report':
        result = await deleteReport(apiClient, args as any);
        break;
      
      // Action grid tools
      case 'list_action_grids':
        result = await listActionGrids(apiClient, args as any);
        break;
      case 'create_action_grid':
        result = await createActionGrid(apiClient, args as any);
        break;
      case 'get_action_grid':
        result = await getActionGrid(apiClient, args as any);
        break;
      case 'delete_action_grid':
        result = await deleteActionGrid(apiClient, args as any);
        break;
      case 'add_grid_items':
        result = await addGridItems(apiClient, args as any);
        break;
      case 'update_grid_item':
        result = await updateGridItem(apiClient, args as any);
        break;

      // Agent analytics tools
      case 'get_agent_analytics':
        result = await getAgentAnalytics(apiClient, args as any);
        break;

      // Site tracking tools
      case 'get_ai_referral_performance':
        result = await getAiReferralPerformance(apiClient, args as any);
        break;
      case 'get_page_citations':
        result = await getPageCitations(apiClient, args as any);
        break;
      case 'get_webflow_tracking':
        result = await getWebflowTracking(apiClient, args as any);
        break;
      case 'get_wix_tracking':
        result = await getWixTracking(apiClient, args as any);
        break;

      // Competitor tools
      case 'list_competitors':
        result = await listCompetitors(apiClient, args as any);
        break;
      case 'add_competitor':
        result = await addCompetitor(apiClient, args as any);
        break;
      case 'delete_competitor':
        result = await deleteCompetitor(apiClient, args as any);
        break;

      // Reddit tools
      case 'list_reddit_monitors':
        result = await listRedditMonitors(apiClient, args as any);
        break;
      case 'get_reddit_leads':
        result = await getRedditLeads(apiClient, args as any);
        break;
      case 'update_reddit_lead':
        result = await updateRedditLead(apiClient, args as any);
        break;

      // GA4 tools
      case 'get_ga4_analytics':
        result = await getGA4Analytics(apiClient, args as any);
        break;

      // SEO alerts tools
      case 'get_seo_alerts':
        result = await getSeoAlerts(apiClient, args as any);
        break;
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Handle list resources request
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: listResources(),
  };
});

/**
 * Handle read resource request
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    return await readResource(apiClient, uri);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read resource: ${errorMessage}`);
  }
});

/**
 * Handle list prompts request
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: mcpPrompts,
  };
});

/**
 * Handle get prompt request
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const content = await generatePromptContent(apiClient, name, args || {});
    
    return {
      description: mcpPrompts.find(p => p.name === name)?.description || '',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: content,
          },
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate prompt: ${errorMessage}`);
  }
});

/**
 * Start the server with HTTP/SSE transport
 */
async function startHttpServer(port: number) {
  const http = await import('http');
  const url = await import('url');
  
  // Track active SSE transports by session
  const transports = new Map<string, SSEServerTransport>();
  
  const httpServer = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Health check
    if (parsedUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', tools: allTools.length }));
      return;
    }
    
    // SSE endpoint - client connects here to receive events
    if (parsedUrl.pathname === '/sse') {
      const transport = new SSEServerTransport('/message', res);
      const sessionId = transport.sessionId;
      transports.set(sessionId, transport);
      
      // Clean up on close
      res.on('close', () => {
        transports.delete(sessionId);
      });
      
      await server.connect(transport);
      return;
    }
    
    // Message endpoint - client sends messages here
    if (parsedUrl.pathname === '/message') {
      const sessionId = parsedUrl.query?.sessionId as string;
      const transport = transports.get(sessionId);
      
      if (!transport) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or expired session' }));
        return;
      }
      
      await transport.handlePostMessage(req, res);
      return;
    }
    
    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  httpServer.listen(port, () => {
    console.error(`✅ Reaudit MCP Server running on http://localhost:${port}`);
    console.error(`   SSE endpoint: http://localhost:${port}/sse`);
    console.error(`   Message endpoint: http://localhost:${port}/message`);
    console.error(`   Health check: http://localhost:${port}/health`);
  });
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes('--http') || args.includes('--sse');
  const portArg = args.find(a => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 8090;
  
  console.error('🚀 Reaudit MCP Server starting...');
  console.error(`📡 Connecting to: ${BASE_URL}`);
  console.error(`🔧 Available tools: ${allTools.length}`);
  
  if (useHttp) {
    console.error(`🌐 Transport: HTTP/SSE on port ${port}`);
    await startHttpServer(port);
  } else {
    console.error('🔌 Transport: stdio');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Reaudit MCP Server running');
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
