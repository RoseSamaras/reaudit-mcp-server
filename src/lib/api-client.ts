/**
 * Reaudit API Client
 * 
 * HTTP client for communicating with the Reaudit MCP API.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuthClient } from '../auth/oauth-client.js';
import { withRetry, parseError, formatErrorForUser } from './error-handler.js';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  error_description?: string;
}

// Types
export interface Project {
  id: string;
  name: string;
  domain: string | null;
  brandName: string;
  industry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInfo {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string;
  };
  usage: {
    prompts: { used: number; limit: number; resetsAt: string; unlimited: boolean };
    content: { used: number; limit: number; resetsAt: string; unlimited: boolean };
    images: { used: number; limit: number; resetsAt: string; unlimited: boolean };
    audits: { used: number; limit: number; resetsAt: string; unlimited: boolean };
  };
}

export interface VisibilityScore {
  brandName: string;
  visibilityScore: number;
  period: string;
  metrics: {
    totalMentions: number;
    citationsReceived: number;
    citationRate: number;
    avgSentiment: number;
  };
  platformBreakdown: Array<{
    platform: string;
    mentions: number;
    avgSentiment: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface BrandMention {
  id: string;
  platform: string;
  prompt: string;
  excerpt: string;
  sentiment: number;
  sentimentLabel: string;
  citationCount: number;
  timestamp: string;
}

export interface CompetitorComparison {
  brandName: string;
  yourMetrics: {
    mentions: number;
    avgSentiment: number;
    citations: number;
    rank: number;
    totalCompetitors: number;
  };
  competitors: Array<{
    name: string;
    domain: string;
    mentions: number;
    avgSentiment: number;
    citations: number;
  }>;
  period: string;
}

export interface AuditSummary {
  id: string;
  url: string;
  domain: string;
  status: string;
  pageTitle: string | null;
  currentScore: number | null;
  potentialScore: number | null;
  processingTime: string | null;
  createdAt: string;
}

export interface AuditDetails {
  id: string;
  url: string;
  domain: string;
  status: string;
  pageTitle: string;
  pageDescription: string;
  scores: {
    current: number;
    potential: number;
    pageSpeed: number | null;
    accessibility: number | null;
  };
  focusKeyphrase: string;
  metaDescription: string;
  recommendations: Array<{
    title: string;
    description: string;
    priority: number;
    impact: string;
    category: string;
    effort: string;
  }>;
  technicalIssues: Array<{
    issue: string;
    impact: string;
    solution: string;
  }>;
  contentSuggestions: Array<{
    suggestion: string;
    benefit: string;
  }>;
  pageSpeed: {
    performance: number;
    fcp: string;
    lcp: string;
    tbt: string;
    cls: string;
  } | null;
  contentQuality: {
    overall: number;
    clarity: number;
    factuality: number;
    answerability: number;
  } | null;
  createdAt: string;
  processingTime: string | null;
}

export interface KnowledgeBaseResult {
  projectId: string;
  query: string;
  results: Array<{
    rank: number;
    content: string;
    source: string | null;
    title: string | null;
  }>;
  stats: {
    totalPages: number;
    totalChunks: number;
  };
  message?: string;
}

export interface ContentSuggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: number;
  status: string;
  targetKeywords: string[];
  estimatedImpact: string;
  createdAt: string;
}

// ============ New Types for Extended Features ============

export interface CalendarEvent {
  id: string;
  type: 'social_media' | 'wordpress' | 'blog' | 'strategy_planned';
  platform: string;
  title: string;
  status: string;
  date: string;
  url?: string;
  strategyName?: string;
  weekNumber?: number;
  pillar?: string;
  funnelStage?: string;
}

export interface CalendarStats {
  total: number;
  socialMedia: number;
  wordpress: number;
  blog: number;
  strategyPlanned: number;
  planned: number;
  scheduled: number;
  published: number;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  currentModule: number;
  currentStep: number;
  completionPercentage: number;
  businessContext: {
    companyName: string;
    industry: string;
    productService: string;
    targetMarket: string;
  };
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyContentItem {
  id: string;
  platform: string;
  format?: string;
  topic: string;
  pillar?: string;
  funnelStage?: string;
  status: 'planned' | 'draft' | 'scheduled' | 'published';
  plannedDate: string;
  weekNumber?: number;
  dayOfWeek?: string;
  weekTheme?: string;
  notes?: string;
  hasGeneratedContent: boolean;
  generatedContentId?: string;
}

export interface GeneratedContent {
  id: string;
  title: string;
  slug: string;
  content?: string;
  markdownContent?: string;
  excerpt: string;
  metaTitle?: string;
  metaDescription: string;
  contentType: string;
  keyword: string;
  topic: string;
  wordCount: number;
  seoScore?: number;
  readabilityScore?: number;
  keywordDensity?: number;
  sentiment?: string;
  suggestedTags?: string[];
  suggestedCategories?: string[];
  focusKeyphrase?: string;
  schemaMarkup?: string;
  structuredData?: Record<string, unknown>;
  headings?: {
    h1?: string[];
    h2?: string[];
    h3?: string[];
  };
  internalLinks?: Array<{ text: string; url: string }>;
  imagePrompts?: string[];
  faq?: Array<{ question: string; answer: string }>;
  hasSchemaMarkup?: boolean;
  knowledgeBaseContext?: Array<{
    content: string;
    source: string | null;
    title: string | null;
  }>;
  internalLinkSuggestionsUsed?: number;
  semanticVariantsUsed?: number;
  webSearchUsed?: {
    citationsCount: number;
    researchLength: number;
  };
  language: string;
  provider: string;
  projectId?: string;
  generatedAt: string;
}

export interface CitationSource {
  url: string;
  title: string;
  domain: string;
  type: 'Brand' | 'Third-party';
  frequency: number;
  models: string[];
  prompts: string[];
  promptCount: number;
  lastCited: string;
}

export interface AuthorInfo {
  name?: string;
  email?: string;
  bio?: string;
  imageUrl?: string;
  socialLinks?: Record<string, string>;
  articleTitle?: string;
  articleExcerpt?: string;
  confidence?: number;
}

export interface OutreachOpportunity {
  id: string;
  articleUrl: string;
  articleTitle: string;
  articleDomain: string;
  authorName?: string;
  authorEmail?: string;
  authorBio?: string;
  authorSocialLinks?: Record<string, string>;
  status: string;
  discoveredFrom: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export interface IndexingConnection {
  id: string;
  siteUrl: string;
  siteName: string;
  sitemapUrl?: string;
  sourceType: string;
  indexNowEnabled: boolean;
  indexNowKeyVerified: boolean;
  indexNowKey?: string;
  gscEnabled: boolean;
  stats?: {
    totalUrls: number;
    indexedUrls: number;
    lastSyncAt?: string;
  };
  isActive: boolean;
  lastError?: string;
  lastErrorAt?: string;
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SocialConnection {
  id: string;
  platform: string;
  platformUsername?: string;
  platformUserId?: string;
  isVerified: boolean;
  totalPublished: number;
  totalScheduled: number;
  totalFailed: number;
  lastPublishedAt?: string;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  platform: string;
  text: string;
  status: string;
  scheduledFor?: string;
  publishedAt?: string;
  platformUrl?: string;
  createdAt: string;
}

/**
 * API Client class
 */
export class ReauditAPIClient {
  private baseUrl: string;
  private oauthClient: OAuthClient;
  private httpClient: AxiosInstance;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.oauthClient = new OAuthClient(baseUrl);
    
    this.httpClient = axios.create({
      baseURL: `${baseUrl}/api/mcp/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReauditMCPServer/1.0.0',
      },
    });
  }
  
  /**
   * Make an authenticated API request with automatic retry
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    return withRetry(async () => {
      const accessToken = await this.oauthClient.getAccessToken();
      
      try {
        const response = await this.httpClient.request<APIResponse<T>>({
          method,
          url: path,
          data,
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (!response.data.success) {
          throw new Error(response.data.error_description || response.data.error || 'API request failed');
        }
        
        return response.data.data as T;
      } catch (error) {
        if (error instanceof AxiosError) {
          const apiError = error.response?.data as APIResponse<unknown>;
          
          // Handle 401 by refreshing token and retrying once
          if (error.response?.status === 401) {
            const newToken = await this.oauthClient.getAccessToken();
            
            const retryResponse = await this.httpClient.request<APIResponse<T>>({
              method,
              url: path,
              data,
              params,
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            
            if (!retryResponse.data.success) {
              throw new Error(retryResponse.data.error_description || 'API request failed');
            }
            
            return retryResponse.data.data as T;
          }
          
          // Parse and format error for better user experience
          const parsedError = parseError(error);
          throw new Error(formatErrorForUser(parsedError));
        }
        
        throw error;
      }
    });
  }
  
  // ============ Projects ============
  
  async listProjects(): Promise<{ projects: Project[]; count: number }> {
    return this.request('GET', '/projects');
  }
  
  // ============ Account ============
  
  async getAccount(): Promise<AccountInfo> {
    return this.request('GET', '/account');
  }
  
  // ============ Visibility ============
  
  async getVisibilityScore(projectId: string): Promise<VisibilityScore> {
    return this.request('GET', '/visibility/score', undefined, { projectId });
  }
  
  async getBrandMentions(
    projectId: string,
    options?: { platform?: string; limit?: number; days?: number }
  ): Promise<{ brandName: string; mentions: BrandMention[]; count: number; period: string }> {
    const params: Record<string, string> = { projectId };
    if (options?.platform) params.platform = options.platform;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.days) params.days = options.days.toString();
    
    return this.request('GET', '/visibility/mentions', undefined, params);
  }
  
  async getCompetitorComparison(projectId: string): Promise<CompetitorComparison> {
    return this.request('GET', '/visibility/competitors', undefined, { projectId });
  }
  
  // ============ Audits ============
  
  async listAudits(
    options?: { projectId?: string; limit?: number; status?: string }
  ): Promise<{ audits: AuditSummary[]; count: number }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.status) params.status = options.status;
    
    return this.request('GET', '/audits', undefined, params);
  }
  
  async getAuditDetails(auditId: string): Promise<AuditDetails> {
    return this.request('GET', `/audits/${auditId}`);
  }
  
  async getAuditRecommendations(
    auditId: string,
    options?: { category?: string; impact?: string }
  ): Promise<{
    auditId: string;
    url: string;
    currentScore: number;
    totalRecommendations: number;
    byImpact: {
      critical: any[];
      high: any[];
      medium: any[];
      low: any[];
    };
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const params: Record<string, string> = {};
    if (options?.category) params.category = options.category;
    if (options?.impact) params.impact = options.impact;
    
    return this.request('GET', `/audits/${auditId}/recommendations`, undefined, params);
  }
  
  // ============ Content ============
  
  async searchKnowledgeBase(
    projectId: string,
    query: string,
    topK?: number
  ): Promise<KnowledgeBaseResult> {
    const params: Record<string, string> = { projectId, query };
    if (topK) params.topK = topK.toString();
    
    return this.request('GET', '/content/knowledge-base', undefined, params);
  }
  
  async getContentSuggestions(
    projectId: string,
    options?: { status?: string; limit?: number }
  ): Promise<{ projectId: string; suggestions: ContentSuggestion[]; count: number }> {
    const params: Record<string, string> = { projectId };
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = options.limit.toString();
    
    return this.request('GET', '/content/suggestions', undefined, params);
  }
  
  // ============ Analytics ============
  
  async getCitationAnalytics(
    projectId: string,
    days?: number
  ): Promise<{
    brandName: string;
    period: string;
    summary: {
      totalCitations: number;
      mentionsWithCitations: number;
      avgCitationsPerMention: number;
    };
    dailyTrends: Array<{ date: string; citations: number; mentions: number }>;
    topCitedDomains: Array<{ domain: string; count: number }>;
    byPlatform: Array<{ platform: string; citations: number; mentions: number }>;
  }> {
    const params: Record<string, string> = { projectId };
    if (days) params.days = days.toString();
    
    return this.request('GET', '/analytics/citations', undefined, params);
  }
  
  async getWordPressAnalytics(
    projectId: string,
    days?: number
  ): Promise<{
    projectId: string;
    domain: string;
    period: string;
    summary: {
      totalBotVisits: number;
      uniqueBotTypes: number;
    };
    botBreakdown: Array<{ botType: string; visits: number; uniquePages: number }>;
    topCrawledPages: Array<{ url: string; visits: number; bots: string[] }>;
    dailyTrends: Array<Record<string, any>>;
  }> {
    const params: Record<string, string> = { projectId };
    if (days) params.days = days.toString();
    
    return this.request('GET', '/analytics/wordpress', undefined, params);
  }
  
  // ============ Usage & Budget ============
  
  async getTokenUsage(days?: number): Promise<{
    period: string;
    totalTokens: number;
    totalCost: number;
    totalCostFormatted: string;
    byOperation: Array<{ operation: string; tokens: number; cost: number; count: number }>;
    byDay: Array<{ date: string; tokens: number; cost: number }>;
    budget?: {
      tokenLimit?: number;
      costLimit?: number;
      percentUsed: number;
      alertThreshold: number;
    };
  }> {
    const params: Record<string, string> = {};
    if (days) params.days = days.toString();
    
    return this.request('GET', '/usage/tokens', undefined, params);
  }
  
  async getBudgetStatus(): Promise<{
    hasLimits: boolean;
    settings: {
      monthlyTokenLimit?: number;
      monthlyCostLimit?: number;
      monthlyCostLimitFormatted?: string;
      alertThreshold: number;
      pauseOnLimit: boolean;
      notifyOnAlert: boolean;
    } | null;
    currentPeriod: string | null;
    usage: {
      tokens: number;
      cost: number;
      costFormatted: string;
      tokenLimit?: number;
      costLimit?: number;
      percentUsed: number;
    } | null;
    status: {
      allowed: boolean;
      reason?: string;
      alertSent: boolean;
      limitReached: boolean;
    };
  }> {
    return this.request('GET', '/usage/budget');
  }
  
  async updateBudgetSettings(settings: {
    monthlyTokenLimit?: number | null;
    monthlyCostLimit?: number | null;
    alertThreshold?: number;
    pauseOnLimit?: boolean;
  }): Promise<{ message: string; settings: any }> {
    return this.request('PUT', '/usage/budget', settings);
  }
  
  // ============ Calendar ============
  
  async getContentCalendar(options?: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ events: CalendarEvent[]; stats: CalendarStats }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    if (options?.limit) params.limit = options.limit.toString();
    
    return this.request('GET', '/calendar', undefined, params);
  }
  
  // ============ Strategies ============
  
  async listStrategies(options?: {
    projectId?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<{
    strategies: Strategy[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.page) params.page = options.page.toString();
    
    return this.request('GET', '/strategies', undefined, params);
  }
  
  async getStrategyDetails(strategyId: string): Promise<{ strategy: any }> {
    return this.request('GET', `/strategies/${strategyId}`);
  }
  
  async createStrategy(data: {
    name: string;
    description?: string;
    projectId?: string;
    businessContext: {
      companyName: string;
      industry: string;
      productService: string;
      targetMarket: string;
      currentChallenges?: string;
      competitors?: string[];
      uniqueValueProposition?: string;
    };
  }): Promise<{ strategy: Strategy }> {
    return this.request('POST', '/strategies', data);
  }
  
  async getStrategyContentItems(
    strategyId: string,
    options?: {
      status?: string;
      weekNumber?: number;
      platform?: string;
    }
  ): Promise<{
    items: StrategyContentItem[];
    stats: Record<string, number>;
    count: number;
  }> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.weekNumber) params.weekNumber = options.weekNumber.toString();
    if (options?.platform) params.platform = options.platform;
    
    return this.request('GET', `/strategies/${strategyId}/content-items`, undefined, params);
  }
  
  async updateStrategyContentItem(
    strategyId: string,
    itemId: string,
    updates: {
      status?: string;
      notes?: string;
      topic?: string;
      platform?: string;
      plannedDate?: string;
    }
  ): Promise<{ item: StrategyContentItem }> {
    return this.request('PATCH', `/strategies/${strategyId}/content-items`, {
      itemId,
      ...updates,
    });
  }
  
  // ============ Content Generation ============
  
  async generateContent(data: {
    contentType?: string;
    keyword: string;
    topic: string;
    additionalContext?: string;
    contentLength?: 'short' | 'medium' | 'long' | 'comprehensive';
    tone?: string;
    customTone?: string;
    useProjectTone?: boolean;
    projectId?: string;
    language?: string;
    useSemanticVariants?: boolean;
    useWebSearch?: boolean;
  }): Promise<{ content: GeneratedContent }> {
    return this.request('POST', '/content/generate', data);
  }
  
  async getContentHistory(options?: {
    projectId?: string;
    contentType?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    history: GeneratedContent[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.contentType) params.contentType = options.contentType;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.skip) params.skip = options.skip.toString();
    
    return this.request('GET', '/content/history', undefined, params);
  }
  
  async getContentDetails(contentId: string): Promise<{ content: GeneratedContent }> {
    return this.request('GET', `/content/${contentId}`);
  }
  
  // ============ Sources & Outreach ============
  
  async getCitationSources(
    projectId: string,
    options?: { type?: string; limit?: number }
  ): Promise<{
    sources: CitationSource[];
    stats: {
      totalSources: number;
      brandSources: number;
      thirdPartySources: number;
      totalCitations: number;
      modelBreakdown: Record<string, number>;
    };
  }> {
    const params: Record<string, string> = { projectId };
    if (options?.type) params.type = options.type;
    if (options?.limit) params.limit = options.limit.toString();
    
    return this.request('GET', '/sources', undefined, params);
  }
  
  async extractAuthorInfo(url: string): Promise<{
    found: boolean;
    author?: AuthorInfo;
    message?: string;
  }> {
    return this.request('POST', '/sources/extract-author', { url });
  }
  
  async listOutreachOpportunities(
    projectId: string,
    options?: { status?: string; limit?: number; page?: number }
  ): Promise<{
    opportunities: OutreachOpportunity[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    statusCounts: Record<string, number>;
  }> {
    const params: Record<string, string> = { projectId };
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.page) params.page = options.page.toString();
    
    return this.request('GET', '/outreach', undefined, params);
  }
  
  async createOutreachOpportunity(data: {
    projectId: string;
    articleUrl: string;
    articleTitle: string;
    authorName?: string;
    authorEmail?: string;
    authorBio?: string;
    authorSocialLinks?: Record<string, string>;
    notes?: string;
    tags?: string[];
  }): Promise<{ opportunity: OutreachOpportunity }> {
    return this.request('POST', '/outreach', data);
  }
  
  // ============ Indexing ============
  
  async listIndexingConnections(options?: {
    projectId?: string;
    activeOnly?: boolean;
  }): Promise<{ connections: IndexingConnection[]; count: number }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.activeOnly !== undefined) params.activeOnly = options.activeOnly.toString();
    
    return this.request('GET', '/indexing/connections', undefined, params);
  }
  
  async createIndexingConnection(data: {
    siteUrl: string;
    siteName: string;
    sitemapUrl?: string;
    projectId?: string;
    indexNowEnabled?: boolean;
  }): Promise<{ connection: IndexingConnection; message: string }> {
    return this.request('POST', '/indexing/connections', data);
  }
  
  async syncIndexingConnection(connectionId: string): Promise<{
    message: string;
    connection: {
      id: string;
      siteUrl: string;
      sitemapUrl: string;
      stats: any;
      lastSyncAt?: string;
    };
  }> {
    return this.request('POST', `/indexing/connections/${connectionId}/sync`);
  }
  
  // ============ Social Media ============
  
  async listSocialConnections(): Promise<{
    connections: SocialConnection[];
    count: number;
  }> {
    return this.request('GET', '/social/connections');
  }
  
  async listSocialPosts(options?: {
    projectId?: string;
    platform?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    posts: SocialPost[];
    pagination: { total: number; limit: number; skip: number; hasMore: boolean };
  }> {
    const params: Record<string, string> = {};
    if (options?.projectId) params.projectId = options.projectId;
    if (options?.platform) params.platform = options.platform;
    if (options?.status) params.status = options.status;
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.skip) params.skip = options.skip.toString();
    
    return this.request('GET', '/social/posts', undefined, params);
  }
  
  async generateSocialPosts(data: {
    contentId: string;
    platforms: string[];
    tone?: string;
    includeHashtags?: boolean;
    includeLink?: boolean;
  }): Promise<{
    success: boolean;
    posts?: Array<{
      _id: string;
      platform: string;
      text: string;
      hashtags?: string[];
      status: string;
    }>;
    error?: string;
  }> {
    return this.request('POST', '/social/generate', data);
  }
  
  async publishSocialPost(postId: string): Promise<{
    success: boolean;
    platform?: string;
    platformUrl?: string;
    error?: string;
  }> {
    return this.request('POST', '/social/publish', { postId });
  }
  
  async scheduleSocialPost(postId: string, scheduledFor: string): Promise<{
    success: boolean;
    platform?: string;
    error?: string;
  }> {
    return this.request('POST', '/social/schedule', { postId, scheduledFor });
  }
  
  // ============ WordPress Publishing ============
  
  async listWordPressConnections(): Promise<{
    connections: Array<{
      id: string;
      siteName: string;
      siteUrl: string;
      isVerified: boolean;
      totalPublished: number;
      totalDrafts: number;
      lastPublishedAt?: string;
    }>;
  }> {
    return this.request('GET', '/wordpress/connections');
  }
  
  async publishToWordPress(data: {
    contentId: string;
    connectionId: string;
    status?: 'draft' | 'publish';
    categories?: string[];
    tags?: string[];
  }): Promise<{
    success: boolean;
    post?: {
      id: string;
      wordpressPostId: number;
      wordpressUrl: string;
      title: string;
      status: string;
      publishedAt?: string;
    };
    error?: string;
  }> {
    return this.request('POST', '/wordpress/publish', data);
  }
  
  // ============ React/Webhook Publishing ============
  
  async listReactConnections(): Promise<{
    connections: Array<{
      id: string;
      siteName: string;
      siteUrl: string;
      isActive: boolean;
      webhookUrl?: string;
      contentSections?: Array<{ id: string; name: string; route: string }>;
    }>;
  }> {
    return this.request('GET', '/react/connections');
  }
  
  async publishToReact(data: {
    contentId: string;
    connectionId: string;
    section?: string;
  }): Promise<{
    success: boolean;
    contentId?: string;
    slug?: string;
    section?: string;
    webhookSent?: boolean;
    error?: string;
  }> {
    return this.request('POST', '/react/publish', data);
  }
  
  // ============ Utilities ============
  
  async generateLlmsTxt(projectId: string): Promise<{
    success: boolean;
    content?: string;
    metadata?: {
      generatedAt: string;
      model: string;
      hasKnowledgeBase: boolean;
    };
    error?: string;
  }> {
    return this.request('POST', '/llms-txt/generate', { projectId });
  }
  
  async translateContent(contentId: string, targetLanguage: string): Promise<{
    success: boolean;
    originalLanguage?: string;
    content?: {
      id: string;
      title: string;
      metaTitle: string;
      metaDescription: string;
      excerpt: string;
      slug: string;
      wordCount: number;
    };
    error?: string;
  }> {
    return this.request('POST', '/content/translate', { contentId, targetLanguage });
  }
  
  // ============ Prompt Tracking ============
  
  async listPromptTopics(projectId: string): Promise<{
    topics: Array<{
      id: string;
      name: string;
      description?: string;
      promptCount: number;
      prompts: Array<{ _id: string; text: string; trackedToday?: boolean }>;
      language?: string;
      region?: string;
      schedule?: string;
      enabled: boolean;
      lastExecutedAt?: string;
    }>;
  }> {
    return this.request('GET', '/prompts', undefined, { projectId });
  }
  
  async createPromptTopic(data: {
    projectId: string;
    name: string;
    description?: string;
    prompts: string[];
    language?: string;
    region?: string;
  }): Promise<{
    success: boolean;
    topic?: {
      id: string;
      name: string;
      promptCount: number;
    };
    error?: string;
  }> {
    return this.request('POST', '/prompts', data);
  }
  
  async addPromptsToTopic(topicId: string, prompts: string[]): Promise<{
    success: boolean;
    totalPrompts?: number;
    error?: string;
  }> {
    return this.request('PATCH', `/prompts/${topicId}`, { prompts });
  }
  
  async trackPrompt(data: {
    projectId: string;
    promptText: string;
    promptId?: string;
    engines?: string[];
  }): Promise<{
    success: boolean;
    queryId?: string;
    status?: string;
    estimatedTimeSeconds?: number;
    error?: string;
  }> {
    return this.request('POST', '/prompts/track', data);
  }
  
  async getPromptAnalytics(projectId: string, days?: number): Promise<{
    success: boolean;
    summary?: {
      totalPrompts: number;
      totalQueries: number;
      brandMentions: number;
      avgSentiment: number;
      visibilityRate: number;
    };
    platformBreakdown?: Array<{
      platform: string;
      mentions: number;
      sentiment: number;
    }>;
    topPrompts?: Array<{
      text: string;
      mentions: number;
      sentiment: number;
    }>;
    recentQueries?: Array<{
      query: string;
      status: string;
      brandMentioned?: boolean;
    }>;
    error?: string;
  }> {
    const params: Record<string, string> = { projectId };
    if (days) params.days = days.toString();
    return this.request('GET', '/prompts/analytics', undefined, params);
  }
  
  async generatePromptSuggestions(data: {
    projectId: string;
    topic?: string;
    count?: number;
  }): Promise<{
    success: boolean;
    suggestions?: Array<{
      text: string;
      searchIntent?: string;
    }>;
    error?: string;
  }> {
    return this.request('POST', '/prompts/suggestions', data);
  }
  
  // ============ Analytics Query Engine ============
  
  async queryAnalytics(params: {
    projectId: string;
    metrics: string[];
    dimensions?: string[];
    timeGrain?: string;
    days?: number;
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<any> {
    return this.request('POST', '/analytics/query', params);
  }
  
  // ============ Saved Reports ============
  
  async listReports(projectId?: string, pinned?: boolean, limit?: number): Promise<any> {
    const params: Record<string, string> = {};
    if (projectId) params.projectId = projectId;
    if (pinned) params.pinned = 'true';
    if (limit) params.limit = limit.toString();
    
    return this.request('GET', '/reports', undefined, params);
  }
  
  async createReport(data: {
    projectId: string;
    name: string;
    description?: string;
    query: any;
    visualization?: any;
    schedule?: string;
    tags?: string[];
    pinned?: boolean;
  }): Promise<any> {
    return this.request('POST', '/reports', data);
  }
  
  async getReport(id: string): Promise<any> {
    return this.request('GET', `/reports/${id}`);
  }
  
  async updateReport(id: string, data: Record<string, any>): Promise<any> {
    return this.request('PUT', `/reports/${id}`, data);
  }
  
  async deleteReport(id: string): Promise<any> {
    return this.request('DELETE', `/reports/${id}`);
  }
  
  // ============ Action Grids ============
  
  async listActionGrids(projectId?: string, limit?: number): Promise<any> {
    const params: Record<string, string> = {};
    if (projectId) params.projectId = projectId;
    if (limit) params.limit = limit.toString();
    
    return this.request('GET', '/action-grids', undefined, params);
  }
  
  async createActionGrid(data: {
    projectId: string;
    name: string;
    description?: string;
    items?: any[];
    categories?: string[];
    source?: string;
    tags?: string[];
  }): Promise<any> {
    return this.request('POST', '/action-grids', data);
  }
  
  async getActionGrid(id: string): Promise<any> {
    return this.request('GET', `/action-grids/${id}`);
  }
  
  async updateActionGrid(id: string, data: Record<string, any>): Promise<any> {
    return this.request('PUT', `/action-grids/${id}`, data);
  }
  
  async deleteActionGrid(id: string): Promise<any> {
    return this.request('DELETE', `/action-grids/${id}`);
  }
  
  async addActionGridItems(gridId: string, items: any[]): Promise<any> {
    return this.request('POST', `/action-grids/${gridId}/items`, { items });
  }
  
  async updateActionGridItem(gridId: string, itemId: string, data: Record<string, any>): Promise<any> {
    return this.request('PUT', `/action-grids/${gridId}/items`, { itemId, ...data });
  }
  
  // ============ Auth ============
  
  isAuthenticated(): boolean {
    return this.oauthClient.isAuthenticated();
  }
  
  async logout(): Promise<void> {
    await this.oauthClient.logout();
  }
}
