/**
 * Project Settings Tools
 * 
 * MCP tools for reading and updating project settings.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';
import { getActiveProjectId } from './projects.js';

// Tool schemas
export const getProjectSettingsSchema = z.object({
  projectId: z.string().optional().describe('The ID of the project (uses active project if not specified)'),
});

export const updateProjectSettingsSchema = z.object({
  projectId: z.string().optional().describe('The ID of the project (uses active project if not specified)'),
  name: z.string().optional().describe('Update the project name'),
  description: z.string().optional().describe('Update the project description'),
  settings: z.object({
    brandName: z.string().optional().describe('Brand name'),
    brandAliases: z.array(z.string()).optional().describe('Alternative brand names'),
    products: z.array(z.string()).optional().describe('Product names to track'),
    trademarks: z.array(z.string()).optional().describe('Trademark names to track'),
    brandBlocklist: z.array(z.string()).optional().describe('Brand names to hide from rankings'),
    website: z.string().optional().describe('Brand website URL'),
    brandDescription: z.string().optional().describe('High-level brand description'),
    idealCustomerProfile: z.string().optional().describe('Ideal customer profile description'),
    brandPointOfView: z.string().optional().describe('Brand mission and core values'),
    mainKeyword: z.string().optional().describe('Main keyword for the brand'),
    alternativeKeywords: z.array(z.string()).optional().describe('Secondary keywords to track and optimize for'),
    mainAiPrompt: z.string().optional().describe('Main AI prompt for tracking'),
    targetMarket: z.string().optional().describe('Target market description'),
    marketingObjectives: z.string().optional().describe('Marketing objectives'),
    sitemap: z.string().optional().describe('Sitemap URL'),
    country: z.string().optional().describe('Primary country'),
    regions: z.array(z.string()).optional().describe('Target regions'),
    industry: z.string().optional().describe('Industry/sector'),
    language: z.string().optional().describe('Primary language code (e.g., en, es, fr)'),
    timezone: z.string().optional().describe('Timezone (e.g., UTC, America/New_York)'),
    defaultLocation: z.string().optional().describe('Default location code'),
    writingStyle: z.object({
      authorPersona: z.string().optional().describe('AI ghostwriter qualifications and expertise'),
      enhancedToneOfVoice: z.string().optional().describe('Detailed tone of voice description'),
    }).optional().describe('Writing style settings for content generation'),
    logo: z.string().optional().describe('Logo URL'),
    socialMedia: z.object({
      facebook: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
      pinterest: z.string().optional(),
      github: z.string().optional(),
    }).optional().describe('Social media profile URLs'),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    }).optional().describe('Business address'),
    phone: z.string().optional().describe('Contact phone number'),
    email: z.string().optional().describe('Contact email address'),
    competitors: z.array(z.union([
      z.string(),
      z.object({
        name: z.string(),
        aliases: z.array(z.string()).optional(),
        products: z.array(z.string()).optional(),
        trademarks: z.array(z.string()).optional(),
        website: z.string().optional(),
      }),
    ])).optional().describe('Competitor list (names or structured objects)'),
    authorCard: z.object({
      enabled: z.boolean().optional(),
      name: z.string().optional(),
      title: z.string().optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
      socialLinks: z.array(z.object({
        platform: z.string(),
        url: z.string(),
        label: z.string().optional(),
      })).optional(),
    }).optional().describe('Author card settings for content generation'),
  }).optional().describe('Settings fields to update'),
});

/**
 * Resolve project ID from args or active project
 */
function resolveProjectId(args: { projectId?: string }): string | null {
  return args.projectId || getActiveProjectId();
}

/**
 * Get project settings tool handler
 */
export async function getProjectSettings(
  client: ReauditAPIClient,
  args: z.infer<typeof getProjectSettingsSchema>
): Promise<string> {
  const projectId = resolveProjectId(args);

  if (!projectId) {
    return 'No project specified. Use set_active_project first or provide a projectId.';
  }

  const result = await client.getProjectSettings(projectId);

  let response = `## Project Settings: **${result.projectName}**\n\n`;
  response += `**Project ID:** ${result.projectId}\n`;

  if (result.description) {
    response += `**Description:** ${result.description}\n`;
  }

  const s = result.settings;

  // Brand Settings
  response += '\n### Brand\n';
  if (s.brandName) response += `- **Brand Name:** ${s.brandName}\n`;
  if (s.brandAliases?.length) response += `- **Brand Aliases:** ${s.brandAliases.join(', ')}\n`;
  if (s.products?.length) response += `- **Products:** ${s.products.join(', ')}\n`;
  if (s.trademarks?.length) response += `- **Trademarks:** ${s.trademarks.join(', ')}\n`;
  if (s.website) response += `- **Website:** ${s.website}\n`;
  if (s.brandDescription) response += `- **Brand Description:** ${s.brandDescription}\n`;
  if (s.idealCustomerProfile) response += `- **Ideal Customer Profile:** ${s.idealCustomerProfile}\n`;
  if (s.brandPointOfView) response += `- **Brand Point of View:** ${s.brandPointOfView}\n`;
  if (s.mainKeyword) response += `- **Main Keyword:** ${s.mainKeyword}\n`;
  if (s.alternativeKeywords?.length) response += `- **Alternative Keywords:** ${s.alternativeKeywords.join(', ')}\n`;
  if (s.mainAiPrompt) response += `- **Main AI Prompt:** ${s.mainAiPrompt}\n`;
  if (s.targetMarket) response += `- **Target Market:** ${s.targetMarket}\n`;
  if (s.marketingObjectives) response += `- **Marketing Objectives:** ${s.marketingObjectives}\n`;
  if (s.sitemap) response += `- **Sitemap:** ${s.sitemap}\n`;

  // General Settings
  response += '\n### General\n';
  if (s.industry) response += `- **Industry:** ${s.industry}\n`;
  if (s.language) response += `- **Language:** ${s.language}\n`;
  if (s.country) response += `- **Country:** ${s.country}\n`;
  if (s.regions?.length) response += `- **Regions:** ${s.regions.join(', ')}\n`;
  if (s.timezone) response += `- **Timezone:** ${s.timezone}\n`;
  if (s.defaultLocation) response += `- **Default Location:** ${s.defaultLocation}\n`;

  // Writing Style
  if (s.writingStyle) {
    response += '\n### Writing Style\n';
    if (s.writingStyle.authorPersona) response += `- **Author Persona:** ${s.writingStyle.authorPersona}\n`;
    if (s.writingStyle.enhancedToneOfVoice) response += `- **Tone of Voice:** ${s.writingStyle.enhancedToneOfVoice}\n`;
  }

  // Social Media
  if (s.socialMedia) {
    response += '\n### Social Media\n';
    const entries = Object.entries(s.socialMedia).filter(([, v]) => v);
    for (const [platform, url] of entries) {
      response += `- **${platform.charAt(0).toUpperCase() + platform.slice(1)}:** ${url}\n`;
    }
  }

  // Contact
  if (s.phone || s.email || s.address) {
    response += '\n### Contact\n';
    if (s.email) response += `- **Email:** ${s.email}\n`;
    if (s.phone) response += `- **Phone:** ${s.phone}\n`;
    if (s.address) {
      const parts = [s.address.street, s.address.city, s.address.state, s.address.zipCode, s.address.country].filter(Boolean);
      if (parts.length) response += `- **Address:** ${parts.join(', ')}\n`;
    }
  }

  // Competitors
  if (s.competitors?.length) {
    response += '\n### Competitors\n';
    for (const comp of s.competitors) {
      if (typeof comp === 'string') {
        response += `- ${comp}\n`;
      } else {
        response += `- **${comp.name}**`;
        if (comp.website) response += ` (${comp.website})`;
        response += '\n';
      }
    }
  }

  // Author Card
  if (s.authorCard) {
    response += '\n### Author Card\n';
    response += `- **Enabled:** ${s.authorCard.enabled ? 'Yes' : 'No'}\n`;
    if (s.authorCard.name) response += `- **Name:** ${s.authorCard.name}\n`;
    if (s.authorCard.title) response += `- **Title:** ${s.authorCard.title}\n`;
    if (s.authorCard.bio) response += `- **Bio:** ${s.authorCard.bio}\n`;
  }

  // Reporting
  if (s.reporting) {
    response += '\n### Reporting\n';
    response += `- **Enabled:** ${s.reporting.enabled ? 'Yes' : 'No'}\n`;
    response += `- **Frequency:** ${s.reporting.frequency}\n`;
    if (s.reporting.email) response += `- **Report Email:** ${s.reporting.email}\n`;
  }

  // Brand Blocklist
  if (s.brandBlocklist?.length) {
    response += '\n### Brand Blocklist\n';
    response += `- ${s.brandBlocklist.join(', ')}\n`;
  }

  return response;
}

/**
 * Update project settings tool handler
 */
export async function updateProjectSettings(
  client: ReauditAPIClient,
  args: z.infer<typeof updateProjectSettingsSchema>
): Promise<string> {
  const projectId = resolveProjectId(args);

  if (!projectId) {
    return 'No project specified. Use set_active_project first or provide a projectId.';
  }

  const updatePayload: {
    name?: string;
    description?: string;
    settings?: Record<string, unknown>;
  } = {};

  if (args.name) updatePayload.name = args.name;
  if (args.description) updatePayload.description = args.description;
  if (args.settings) updatePayload.settings = args.settings;

  if (!updatePayload.name && !updatePayload.description && !updatePayload.settings) {
    return 'No fields to update. Provide at least one of: name, description, or settings fields.';
  }

  const result = await client.updateProjectSettings(projectId, updatePayload);

  let response = `Project settings updated successfully for **${result.projectName}**.\n\n`;
  response += `**Updated fields:** ${result.updatedFields.join(', ')}\n`;

  return response;
}

/**
 * Tool definitions for MCP
 */
export const projectSettingsTools = [
  {
    name: 'get_project_settings',
    description: 'Get all settings for a project including brand info, writing style, social media, competitors, author card, and more. Use this to read the current configuration of a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project (uses active project if not specified)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'update_project_settings',
    description: 'Update project settings including brand name, description, writing style, social media links, competitors, author card, industry, language, and more. Only provide the fields you want to change.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project (uses active project if not specified)',
        },
        name: {
          type: 'string',
          description: 'Update the project name',
        },
        description: {
          type: 'string',
          description: 'Update the project description',
        },
        settings: {
          type: 'object',
          description: 'Settings fields to update. Only provide the fields you want to change.',
          properties: {
            brandName: { type: 'string', description: 'Brand name' },
            brandAliases: { type: 'array', items: { type: 'string' }, description: 'Alternative brand names' },
            products: { type: 'array', items: { type: 'string' }, description: 'Product names to track' },
            trademarks: { type: 'array', items: { type: 'string' }, description: 'Trademark names to track' },
            brandBlocklist: { type: 'array', items: { type: 'string' }, description: 'Brand names to hide from rankings' },
            website: { type: 'string', description: 'Brand website URL' },
            brandDescription: { type: 'string', description: 'High-level brand description' },
            idealCustomerProfile: { type: 'string', description: 'Ideal customer profile description' },
            brandPointOfView: { type: 'string', description: 'Brand mission and core values' },
            mainKeyword: { type: 'string', description: 'Main keyword for the brand' },
            alternativeKeywords: { type: 'array', items: { type: 'string' }, description: 'Secondary keywords to track and optimize for' },
            mainAiPrompt: { type: 'string', description: 'Main AI prompt for tracking' },
            targetMarket: { type: 'string', description: 'Target market description' },
            marketingObjectives: { type: 'string', description: 'Marketing objectives' },
            sitemap: { type: 'string', description: 'Sitemap URL' },
            country: { type: 'string', description: 'Primary country' },
            regions: { type: 'array', items: { type: 'string' }, description: 'Target regions' },
            industry: { type: 'string', description: 'Industry/sector' },
            language: { type: 'string', description: 'Primary language code (e.g., en, es, fr)' },
            timezone: { type: 'string', description: 'Timezone (e.g., UTC, America/New_York)' },
            defaultLocation: { type: 'string', description: 'Default location code' },
            writingStyle: {
              type: 'object',
              description: 'Writing style settings for content generation',
              properties: {
                authorPersona: { type: 'string', description: 'AI ghostwriter qualifications and expertise' },
                enhancedToneOfVoice: { type: 'string', description: 'Detailed tone of voice description' },
              },
            },
            logo: { type: 'string', description: 'Logo URL' },
            socialMedia: {
              type: 'object',
              description: 'Social media profile URLs',
              properties: {
                facebook: { type: 'string' },
                twitter: { type: 'string' },
                linkedin: { type: 'string' },
                instagram: { type: 'string' },
                youtube: { type: 'string' },
                tiktok: { type: 'string' },
                pinterest: { type: 'string' },
                github: { type: 'string' },
              },
            },
            address: {
              type: 'object',
              description: 'Business address',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            phone: { type: 'string', description: 'Contact phone number' },
            email: { type: 'string', description: 'Contact email address' },
            competitors: {
              type: 'array',
              description: 'Competitor list (names or structured objects with name, aliases, products, trademarks, website)',
              items: {},
            },
            authorCard: {
              type: 'object',
              description: 'Author card settings for content generation',
              properties: {
                enabled: { type: 'boolean' },
                name: { type: 'string' },
                title: { type: 'string', description: 'e.g., Founder & CEO at Company' },
                bio: { type: 'string', description: 'Short bio text' },
                avatarUrl: { type: 'string', description: 'Photo/avatar URL' },
                socialLinks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      platform: { type: 'string' },
                      url: { type: 'string' },
                      label: { type: 'string' },
                    },
                    required: ['platform', 'url'],
                  },
                },
              },
            },
          },
        },
      },
      required: [] as string[],
    },
  },
];
