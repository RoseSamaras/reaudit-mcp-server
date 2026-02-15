/**
 * MCP Tools - Bing Webmaster Tools
 * Search performance, crawl health, URL submission, and backlinks from Bing.
 */

import { z } from 'zod';
import type { ReauditAPIClient } from '../lib/api-client.js';

// ---- Schemas ----

export const getBingSearchPerformanceSchema = z.object({
  projectId: z.string(),
});

export const getBingCrawlHealthSchema = z.object({
  projectId: z.string(),
});

export const submitUrlsToBingSchema = z.object({
  projectId: z.string(),
  urls: z.array(z.string()),
});

export const getBingBacklinksSchema = z.object({
  projectId: z.string(),
});

// ---- Handlers ----

/**
 * Get Bing search performance data
 */
export async function getBingSearchPerformance(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getBingSearchPerformanceSchema>
): Promise<string> {
  const data = await apiClient.getBingSearchPerformance(args.projectId);

  const trafficStats = data.trafficStats || [];
  const queryStats = data.queryStats || [];
  const pageStats = data.pageStats || [];

  const totalClicks = trafficStats.reduce((sum, s) => sum + (s.Clicks || 0), 0);
  const totalImpressions = trafficStats.reduce((sum, s) => sum + (s.Impressions || 0), 0);
  const avgPosition = trafficStats.length > 0
    ? trafficStats.reduce((sum, s) => sum + (s.AvgClickPosition || 0), 0) / trafficStats.length
    : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const lines: string[] = [
    `## Bing Search Performance — ${data.siteUrl}`,
    '',
    '### Overview',
    `- Total Clicks: ${totalClicks.toLocaleString()}`,
    `- Total Impressions: ${totalImpressions.toLocaleString()}`,
    `- Average CTR: ${avgCtr.toFixed(1)}%`,
    `- Average Position: ${avgPosition.toFixed(1)}`,
    '',
  ];

  if (queryStats.length > 0) {
    lines.push('### Top Search Queries');
    queryStats.slice(0, 15).forEach((q, i) => {
      lines.push(`${i + 1}. **${q.Query}** — ${q.Clicks} clicks, ${q.Impressions} impressions (pos ${(q.AvgImpressionPosition || 0).toFixed(1)})`);
    });
    lines.push('');
  }

  if (pageStats.length > 0) {
    lines.push('### Top Pages');
    pageStats.slice(0, 10).forEach((p, i) => {
      lines.push(`${i + 1}. ${p.Query} — ${p.Clicks} clicks, ${p.Impressions} impressions`);
    });
    lines.push('');
  }

  // AI Performance note
  lines.push(
    '---',
    '**AI Performance (Copilot Citations):** Bing now tracks how your content is cited in AI-generated answers.',
    `View your AI Performance data in the Bing Webmaster Tools dashboard: https://www.bing.com/webmasters/aiperformance?siteUrl=${encodeURIComponent(data.siteUrl)}`,
  );

  return lines.join('\n');
}

/**
 * Get Bing crawl health data
 */
export async function getBingCrawlHealth(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getBingCrawlHealthSchema>
): Promise<string> {
  const data = await apiClient.getBingCrawlHealth(args.projectId);

  const crawlStats = data.crawlStats || [];
  const crawlIssues = data.crawlIssues || [];

  const lines: string[] = [
    `## Bing Crawl Health — ${data.siteUrl}`,
    '',
  ];

  if (crawlStats.length > 0) {
    const latest = crawlStats[crawlStats.length - 1];
    const totalCrawled = crawlStats.reduce((sum, s) => sum + (s.CrawledPages || 0), 0);
    const totalErrors = crawlStats.reduce((sum, s) => sum + (s.CrawlErrors || 0), 0);

    lines.push(
      '### Summary',
      `- Latest crawled pages: ${latest.CrawledPages?.toLocaleString() || 0}`,
      `- Latest indexed pages: ${latest.InIndex?.toLocaleString() || 0}`,
      `- Total pages crawled (period): ${totalCrawled.toLocaleString()}`,
      `- Total crawl errors (period): ${totalErrors.toLocaleString()}`,
      '',
    );

    lines.push('### Crawl Activity (Recent)');
    crawlStats.slice(-7).forEach((s) => {
      const date = new Date(s.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      lines.push(`- ${date}: ${s.CrawledPages} crawled, ${s.InIndex} indexed, ${s.CrawlErrors} errors`);
    });
    lines.push('');
  }

  if (crawlIssues.length > 0) {
    lines.push(`### Crawl Issues (${crawlIssues.length} found)`);
    crawlIssues.slice(0, 20).forEach((issue, i) => {
      lines.push(`${i + 1}. **HTTP ${issue.HttpCode}** — ${issue.Issue}`);
      lines.push(`   URL: ${issue.Url}`);
    });
  } else {
    lines.push('### Crawl Issues\nNo crawl issues detected.');
  }

  return lines.join('\n');
}

/**
 * Submit URLs to Bing for indexing
 */
export async function submitUrlsToBing(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof submitUrlsToBingSchema>
): Promise<string> {
  const data = await apiClient.submitUrlsToBing(args.projectId, args.urls);

  return [
    `## URL Submission to Bing — ${data.siteUrl}`,
    '',
    `${data.message}`,
    '',
    `URLs submitted: ${data.submitted}`,
    ...args.urls.map((u) => `- ${u}`),
  ].join('\n');
}

/**
 * Get Bing backlink data
 */
export async function getBingBacklinks(
  apiClient: ReauditAPIClient,
  args: z.infer<typeof getBingBacklinksSchema>
): Promise<string> {
  const data = await apiClient.getBingBacklinks(args.projectId);

  const linkCounts = data.linkCounts || [];

  const lines: string[] = [
    `## Bing Backlinks — ${data.siteUrl}`,
    '',
    `Total sources found: ${linkCounts.length}`,
    '',
  ];

  if (linkCounts.length > 0) {
    const totalLinks = linkCounts.reduce((sum, l) => sum + (l.LinkCount || 0), 0);
    lines.push(`Total inbound links: ${totalLinks.toLocaleString()}\n`);

    lines.push('### Top Linking Sources');
    linkCounts.slice(0, 25).forEach((link, i) => {
      lines.push(`${i + 1}. ${link.Url} — ${link.LinkCount} links`);
    });
  } else {
    lines.push('No backlink data available yet. Bing may take time to report inbound links.');
  }

  return lines.join('\n');
}

// ---- Tool Definitions ----

export const bingWebmasterTools = [
  {
    name: 'get_bing_search_performance',
    description:
      'Get Bing search performance data including clicks, impressions, CTR, average position, top queries, and top pages. ' +
      'Also includes a link to the Bing AI Performance dashboard for Copilot citation data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID with an active Bing Webmaster Tools connection',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_bing_crawl_health',
    description:
      'Get Bing crawl health data including pages crawled, indexed pages, crawl errors, and specific crawl issues with URLs and HTTP codes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID with an active Bing Webmaster Tools connection',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'submit_urls_to_bing',
    description:
      'Submit URLs to Bing for crawling and indexing. Maximum 100 URLs per submission. URLs must start with http/https.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID with an active Bing Webmaster Tools connection',
        },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of URLs to submit to Bing for indexing (max 100)',
        },
      },
      required: ['projectId', 'urls'],
    },
  },
  {
    name: 'get_bing_backlinks',
    description:
      'Get inbound link data from Bing Webmaster Tools showing which external pages link to your site and how many links each source provides.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The project ID with an active Bing Webmaster Tools connection',
        },
      },
      required: ['projectId'],
    },
  },
];
