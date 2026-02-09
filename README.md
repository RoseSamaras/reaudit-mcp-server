# Reaudit MCP Server

Access your Reaudit AI Visibility Platform data from AI assistants like Claude Desktop, Cursor, and other MCP-compatible clients.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open protocol that allows AI assistants to securely access external data sources and tools. With the Reaudit MCP server, you can ask your AI assistant questions about your AI visibility, SEO audits, and more.

## Installation

### Prerequisites

- Node.js 18 or later
- An active Reaudit subscription
- Claude Desktop, Cursor, or another MCP-compatible client

### Quick Start

1. **Install the package globally:**

```bash
npm install -g @reaudit/mcp-server
```

2. **Configure your MCP client** (see below for specific instructions)

3. **Authenticate** - On first use, a browser window will open for you to log in to your Reaudit account

## Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reaudit": {
      "command": "npx",
      "args": ["@reaudit/mcp-server"],
      "env": {
        "REAUDIT_BASE_URL": "https://reaudit.io"
      }
    }
  }
}
```

### Cursor

Add the following to your Cursor MCP settings:

**macOS:** `~/.cursor/mcp.json`
**Windows:** `%USERPROFILE%\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "reaudit": {
      "command": "npx",
      "args": ["@reaudit/mcp-server"],
      "env": {
        "REAUDIT_BASE_URL": "https://reaudit.io"
      }
    }
  }
}
```

### Other MCP Clients

Use these settings:
- **Command:** `npx`
- **Arguments:** `["@reaudit/mcp-server"]`
- **Environment:** `REAUDIT_BASE_URL=https://reaudit.io`

## Authentication

The first time you use the MCP server, it will:

1. Open your default browser to the Reaudit login page
2. Ask you to authorize the MCP server to access your account
3. Store the authentication tokens securely on your machine

Tokens are stored in `~/.reaudit/credentials.json` and are automatically refreshed when needed.

### Revoking Access

You can revoke the MCP server's access at any time:

1. Go to [Reaudit Settings](https://reaudit.io/settings)
2. Find "Connected Apps"
3. Click "Revoke" next to "Reaudit MCP Server"

## Available Tools (61 total)

### Project Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects in your Reaudit account |
| `set_active_project` | Set the active project context for subsequent commands |
| `get_active_project` | Get the currently active project |

### Account Tools

| Tool | Description |
|------|-------------|
| `get_usage_summary` | Get your current usage vs limits for prompts, content, images, and audits |

### AI Visibility Tools

| Tool | Description |
|------|-------------|
| `get_visibility_score` | Get the AI visibility score for a project with metrics breakdown |
| `get_brand_mentions` | Get recent brand mentions across AI platforms (ChatGPT, Claude, Perplexity, etc.) |
| `get_competitor_comparison` | Compare your AI visibility with competitors |

### SEO Audit Tools

| Tool | Description |
|------|-------------|
| `list_audits` | List SEO audits with status and scores |
| `get_audit_details` | Get detailed audit results including scores, recommendations, and technical issues |
| `get_audit_recommendations` | Get prioritized SEO recommendations grouped by impact level |

### Content Tools

| Tool | Description |
|------|-------------|
| `search_knowledge_base` | Search your project knowledge base for relevant content |
| `get_content_suggestions` | Get AI-generated content suggestions based on SEO analysis |

### Content Generation Tools

| Tool | Description |
|------|-------------|
| `generate_content` | Generate AI-powered content (blog posts, social media, newsletters, video scripts, etc.) using project knowledge base for context |
| `get_content_history` | Get your content generation history, filterable by project or content type |
| `get_content_details` | Get full details of a generated content piece including complete content and SEO data |

### Analytics Tools

| Tool | Description |
|------|-------------|
| `get_citation_analytics` | Get citation trends, top cited domains, and platform breakdown |
| `get_wordpress_analytics` | Get WordPress AI bot tracking data showing which crawlers visit your site |

### Analytics Query Tools

| Tool | Description |
|------|-------------|
| `query_analytics` | Execute a flexible analytics query with custom metrics, dimensions, filters, and time grains for building custom reports |

### Usage & Budget Tools

| Tool | Description |
|------|-------------|
| `get_token_usage` | Get a summary of your LLM token usage and costs |
| `get_budget_status` | Get your current budget limits and usage status |
| `set_budget_limits` | Set monthly budget limits for token usage and costs |

### Calendar Tools

| Tool | Description |
|------|-------------|
| `get_content_calendar` | Get your content calendar showing scheduled, planned, and published content across all platforms |

### Strategy Tools

| Tool | Description |
|------|-------------|
| `list_strategies` | List all GTM (Go-To-Market) strategies, filterable by project or status |
| `get_strategy_details` | Get detailed information about a strategy including module progress and outputs |
| `create_strategy` | Create a new GTM strategy session with business context |
| `get_strategy_content_items` | Get content items from a strategy's 90-day content calendar |
| `update_content_item_status` | Update a content item's status, notes, topic, platform, or planned date |

### Sources & Outreach Tools

| Tool | Description |
|------|-------------|
| `get_citation_sources` | Get citation sources showing which URLs are cited by AI models and their frequency |
| `extract_author_info` | Extract author information from a URL (name, email, bio, social links) for outreach |
| `list_outreach_opportunities` | List outreach opportunities for link building or content collaboration |
| `create_outreach_opportunity` | Create a new outreach opportunity to track potential contacts |

### Indexing Tools

| Tool | Description |
|------|-------------|
| `list_indexing_connections` | List website indexing connections (IndexNow and Google Search Console) |
| `create_indexing_connection` | Create a new indexing connection for sitemap monitoring and instant indexing |
| `sync_indexing_connection` | Trigger a sitemap sync to submit new/updated URLs to search engines |

### Social Media Tools

| Tool | Description |
|------|-------------|
| `list_social_connections` | List connected social media accounts (X/Twitter, LinkedIn) with publishing stats |
| `list_social_posts` | List social media posts filtered by platform, status, or project |
| `generate_social_posts` | Generate social media posts from existing content for X/Twitter and LinkedIn |
| `publish_social_post` | Publish a draft social media post immediately |
| `schedule_social_post` | Schedule a social media post for later publication |

### Publishing Tools

| Tool | Description |
|------|-------------|
| `list_wordpress_connections` | List connected WordPress sites for publishing |
| `publish_to_wordpress` | Publish content to WordPress with schema markup for AI search visibility |
| `list_react_connections` | List React/webhook connections for headless CMS publishing |
| `publish_to_react` | Publish content via webhook to a React/Next.js site |

### Optimization Tools

| Tool | Description |
|------|-------------|
| `generate_llms_txt` | Generate an AI-optimized llms.txt file to help AI assistants understand your business |
| `translate_content` | Translate generated content to another language, creating a new content entry |

### Prompt Tracking Tools

| Tool | Description |
|------|-------------|
| `list_prompt_topics` | List prompt topics for tracking brand visibility in AI responses |
| `create_prompt_topic` | Create a new prompt topic with initial prompts for organized tracking |
| `add_prompts_to_topic` | Add new prompts to an existing topic |
| `track_prompt` | Submit a prompt for AI tracking across ChatGPT, Perplexity, and Google |
| `get_prompt_analytics` | Get analytics for tracked prompts including mentions, sentiment, and visibility rates |
| `generate_prompt_suggestions` | Use AI to generate prompt suggestions based on your project context |

### Saved Reports Tools

| Tool | Description |
|------|-------------|
| `list_reports` | List saved analytics reports with reusable query configurations |
| `create_report` | Create a saved report with custom metrics, dimensions, filters, and visualizations |
| `get_report` | Get details of a saved analytics report |
| `delete_report` | Delete a saved analytics report |

### Action Grid Tools

| Tool | Description |
|------|-------------|
| `list_action_grids` | List optimization task boards for a project |
| `create_action_grid` | Create a task board with categorized items for SEO, content, or any workflow |
| `get_action_grid` | Get an action grid with all items grouped by category with progress tracking |
| `delete_action_grid` | Delete an action grid |
| `add_grid_items` | Add new items to an existing action grid |
| `update_grid_item` | Update status, priority, assignee, or notes of an action grid item |

## Available Prompts (5 templates)

Pre-built prompt templates for common workflows:

| Prompt | Description |
|--------|-------------|
| `weekly_visibility_report` | Generate a weekly AI visibility report with analysis |
| `seo_action_plan` | Create an actionable SEO improvement plan from audit results |
| `content_strategy` | Develop a content strategy based on knowledge base and SEO data |
| `competitor_analysis` | Analyze competitor visibility with strategic recommendations |
| `bot_activity_summary` | Summarize AI bot crawling activity with insights |

## Available Resources

Read-only data accessible via `reaudit://` URIs:

| URI | Description |
|-----|-------------|
| `reaudit://projects` | List of all your projects |
| `reaudit://account` | Account details and usage summary |
| `reaudit://projects/{id}/visibility` | Visibility metrics for a project |
| `reaudit://projects/{id}/mentions` | Brand mentions for a project |
| `reaudit://audits/{id}` | Detailed audit results |

## Example Conversations

### Set active project and check visibility
> **You:** List my projects and set the main one as active
> 
> **Assistant:** Found 3 projects. Setting "My Brand" as active.
> 
> **You:** What's my visibility score?
> 
> **Assistant:** Your AI Visibility Score is 72/100.
> - Total Mentions: 45 in the last 30 days
> - Citation Rate: 38%
> - Average Sentiment: 78/100

### Get SEO recommendations
> **You:** What are the critical SEO issues I need to fix?
> 
> **Assistant:** Here are the critical recommendations from your latest audit:
> 
> 1. **Missing meta descriptions** (Technical)
>    Impact: High | Effort: Quick
> 
> 2. **Slow page load time** (Performance)
>    Impact: Critical | Effort: Moderate

### Generate content and publish to WordPress
> **You:** Generate a blog post about AI visibility best practices, then publish it to my WordPress site
>
> **Assistant:** I'll generate the content using your knowledge base for context, then publish it.
>
> [Generates content with schema markup, internal linking, and SEO optimization]
>
> Content published to WordPress! Post URL: https://yourblog.com/ai-visibility-best-practices

### Track prompts for brand visibility
> **You:** Create a prompt topic for "product comparison" and add some prompts to track
>
> **Assistant:** Created topic "Product Comparison" with 3 prompts. I can now track these across ChatGPT, Perplexity, and Google to see how your brand is mentioned.
>
> **You:** Show me the analytics for my tracked prompts
>
> **Assistant:** Over the last 30 days:
> - 42 prompts tracked across 3 platforms
> - Brand mentioned in 68% of responses
> - Average sentiment: 82/100
> - Best performing platform: Perplexity (78% mention rate)

### Create a social media campaign
> **You:** Generate social media posts from my latest blog article
>
> **Assistant:** Generated 4 draft posts:
> - 2 for X/Twitter (short-form with hashtags)
> - 2 for LinkedIn (professional long-form)
>
> **You:** Publish the first Twitter post and schedule the LinkedIn one for tomorrow
>
> **Assistant:** Done! Twitter post published. LinkedIn post scheduled for tomorrow at 9:00 AM.

### Build a custom analytics report
> **You:** Create a weekly visibility report showing mentions and sentiment by platform
>
> **Assistant:** Created saved report "Weekly Visibility by Platform" with:
> - Metrics: mentions, sentiment
> - Dimensions: platform, week
> - Visualization: line chart
>
> You can run this report anytime with `get_report`.

### Search your knowledge base
> **You:** What do we say about pricing on our website?
> 
> **Assistant:** Found 3 relevant sections about pricing from your knowledge base...

## Troubleshooting

### "Authentication required" error

The MCP server needs to authenticate with your Reaudit account. Make sure:
1. You have an active Reaudit subscription
2. A browser window opened for authentication
3. You completed the login process

### "Token expired" error

Your authentication token has expired. The server will automatically try to refresh it. If that fails:

1. Delete `~/.reaudit/credentials.json`
2. Restart your MCP client
3. Complete the authentication flow again

### Browser doesn't open

If the browser doesn't open automatically, check the terminal output for a URL you can copy and paste.

### Connection errors

Make sure you can reach `https://reaudit.io` from your network.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REAUDIT_BASE_URL` | `https://reaudit.io` | Reaudit API base URL |

## Security

- OAuth 2.0 with PKCE for secure authentication
- Tokens stored locally with encryption
- Refresh tokens automatically rotated
- You can revoke access at any time from Reaudit settings

## Support

- **Documentation:** https://reaudit.io/docs/mcp
- **Issues:** https://github.com/RoseSamaras/reaudit-mcp-server/issues
- **Email:** support@reaudit.io

## License

Proprietary - see [LICENSE](LICENSE) for details.
