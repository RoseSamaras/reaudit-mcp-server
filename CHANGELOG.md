# Changelog

All notable changes to the Reaudit MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-02-10

### Added
- **AI Bot Crawl Analytics** - `get_agent_analytics` tool for monitoring which AI bots (GPTBot, ClaudeBot, PerplexityBot) crawl your site, which pages they visit most, and content performance signals
- **Site Tracking Tools** - 4 new tools for cross-platform bot tracking:
  - `get_ai_referral_performance` - WordPress AI referral performance (which articles get traffic from AI engines)
  - `get_page_citations` - Page citations showing LLM bot crawl frequency and bot types
  - `get_webflow_tracking` - Webflow site bot tracking analytics
  - `get_wix_tracking` - Wix site bot tracking analytics
- **Competitor Management Tools** - 3 tools for tracking competitors:
  - `list_competitors` - List with category/search filtering
  - `add_competitor` - Add new competitor by name/URL
  - `delete_competitor` - Soft-delete a competitor
- **Reddit Lead Monitoring Tools** - 3 tools for Reddit lead detection:
  - `list_reddit_monitors` - View monitored subreddits and their stats
  - `get_reddit_leads` - Get identified leads with scoring and filtering
  - `update_reddit_lead` - Update lead status and add notes
- **GA4 Analytics** - `get_ga4_analytics` tool for Google Analytics 4 data (traffic overview, sources, top pages, AI referral traffic)
- **SEO Alerts** - `get_seo_alerts` tool for unread alerts and alert summaries (visibility drops, crawl issues, ranking changes)
- New MCP API endpoints for all above features:
  - `GET /api/mcp/v1/agent-analytics`
  - `GET /api/mcp/v1/tracking/wordpress`
  - `GET /api/mcp/v1/tracking/webflow`
  - `GET /api/mcp/v1/tracking/wix`
  - `GET/POST/DELETE /api/mcp/v1/competitors`
  - `GET/PATCH /api/mcp/v1/reddit`
  - `GET /api/mcp/v1/ga4`
  - `GET /api/mcp/v1/alerts`

### Changed
- Updated tool count from 67 to 80 (13 new tools)
- Updated version to 1.3.0

## [1.2.0] - 2026-02-10

### Added
- **Strategy Step Runner Tools** - Four new tools for running GTM strategies step-by-step via MCP:
  - `generate_strategy_step` - Generate AI content for any strategy module step using Perplexity deep search. Supports additional context for guided regeneration. Each step builds on all previous outputs for progressive context.
  - `get_strategy_step_output` - Read the full generated output of any completed step, including content, citations, and edit history.
  - `edit_strategy_step` - Edit/refine the content of any completed strategy step. Edited content is preserved separately from the original AI output.
  - `get_strategy_step_map` - Get a reference map of all 6 modules and 21 steps with dependencies and recommended workflow.
- New MCP API endpoints:
  - `POST /api/mcp/v1/strategies/[id]/generate` - Generate a strategy step with AI
  - `GET /api/mcp/v1/strategies/[id]/steps` - Read step output
  - `PATCH /api/mcp/v1/strategies/[id]/steps` - Edit step content
- Full support for all 6 GTM modules: Research, Strategy, Content Strategy, Funnel Architecture, Execution Plan, and Offer Conversion System
- Next-step guidance after each generation to help AI assistants run strategies sequentially
- Module 6 prerequisite validation (requires Modules 1 & 2 completion)

### Changed
- Updated tool count from 63 to 67
- Updated version to 1.2.0

## [1.1.0] - 2026-02-10

### Added
- **Project Settings Tools** - Two new tools for reading and editing project settings via MCP:
  - `get_project_settings` - Retrieve all project settings including brand info, writing style, social media, competitors, author card, reporting, and contact details
  - `update_project_settings` - Update any combination of project settings fields with field-level granularity
- **Alternative Keywords field** - New `alternativeKeywords` setting for projects, allowing users to define secondary keywords to track and optimize for (available in both MCP and web app)
- New MCP API endpoints:
  - `GET /api/mcp/v1/projects/[id]/settings` - Read project settings
  - `PATCH /api/mcp/v1/projects/[id]/settings` - Update project settings
- Project settings example added to README documentation
- This CHANGELOG file to track all changes going forward

### Changed
- Updated README to document the new project settings tools (tool count updated from 61 to 63)
- Updated `ProjectSettings` type in API client with `alternativeKeywords` field

## [1.0.0] - 2026-01-15

### Added
- Initial release of the Reaudit MCP Server
- OAuth 2.0 authentication with PKCE flow
- 61 tools across all Reaudit platform features:
  - Project management (list, set active, get active)
  - Account & usage information
  - AI Visibility (score, mentions, competitor comparison)
  - SEO Audits (list, details, recommendations)
  - Content management (knowledge base search, suggestions)
  - Content generation (generate, history, details)
  - Analytics (citations, WordPress bot tracking, custom queries)
  - Usage & budget management
  - Content calendar
  - GTM Strategy tools
  - Sources & outreach
  - Indexing connections (IndexNow, Google Search Console)
  - Social media (connections, posts, generate, publish, schedule)
  - Publishing (WordPress, React/webhook)
  - Optimization (llms.txt generation, content translation)
  - Prompt tracking (topics, prompts, analytics, suggestions)
  - Analytics query engine with custom metrics/dimensions
  - Saved reports with visualizations
  - Action grids for task management
- 5 pre-built prompt templates
- 5 read-only resources via `reaudit://` URIs
- HTTP/SSE transport support for remote deployment
- Stdio transport for local MCP client integration
