/**
 * Strategy Step Tools
 * 
 * MCP tools for running GTM strategy step-by-step, reading step outputs,
 * regenerating with additional context, and editing step content.
 */

import { z } from 'zod';
import { ReauditAPIClient } from '../lib/api-client.js';

// ============ Step reference info for documentation ============

/**
 * Complete map of all GTM strategy modules and steps
 */
const MODULE_MAP: Record<number, { name: string; steps: Record<number, string> }> = {
  1: {
    name: 'Research Layer',
    steps: {
      1: 'ICP Deep Dive',
      2: 'Competitive Intelligence',
      3: 'Market Trends',
    },
  },
  2: {
    name: 'Strategy Layer',
    steps: {
      1: 'Positioning Strategy',
      2: 'GTM Motion Selection',
      3: 'Messaging Framework',
    },
  },
  3: {
    name: 'Content Strategy Layer',
    steps: {
      1: 'Content Pillar Development',
      2: '90-Day Content Calendar',
      3: 'Content Hook & CTA Generator',
    },
  },
  4: {
    name: 'Funnel Architecture Layer',
    steps: {
      1: 'Lead Magnet Strategy',
      2: 'Paid Ads Strategy',
      3: 'Nurture Sequence',
      4: 'Complete Funnel Blueprint',
    },
  },
  5: {
    name: 'Execution Plan Layer',
    steps: {
      1: '90-Day GTM Roadmap',
      2: 'KPI Dashboard',
      3: 'Resource Plan & Budget',
    },
  },
  6: {
    name: 'Offer Conversion System',
    steps: {
      1: 'Offer Foundation & Promise',
      2: 'Value Stack Architecture',
      3: 'Risk Reversal Framework',
      4: 'Pricing Strategy & Tiers',
      5: 'Conversion Copy Blocks',
    },
  },
};

// ============ Schemas ============

export const generateStrategyStepSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy'),
  moduleNumber: z.number().min(1).max(6).describe(
    'Module number (1-6). ' +
    '1=Research, 2=Strategy, 3=Content Strategy, 4=Funnel, 5=Execution, 6=Offer'
  ),
  stepNumber: z.number().min(1).max(5).describe(
    'Step number within the module. ' +
    'Modules 1-3 have 3 steps each, Module 4 has 4 steps, Module 5 has 3 steps, Module 6 has 5 steps.'
  ),
  additionalContext: z.string().optional().describe(
    'Additional context or instructions to guide the AI generation. ' +
    'For example: "Focus more on enterprise customers" or "Include pricing comparisons".'
  ),
});

export const getStrategyStepOutputSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy'),
  moduleNumber: z.number().min(1).max(6).describe('Module number (1-6)'),
  stepNumber: z.number().min(1).max(5).describe('Step number within the module'),
});

export const editStrategyStepSchema = z.object({
  strategyId: z.string().describe('The ID of the strategy'),
  moduleNumber: z.number().min(1).max(6).describe('Module number (1-6)'),
  stepNumber: z.number().min(1).max(5).describe('Step number within the module'),
  content: z.string().describe('The new or updated content for this step'),
});

export const getStrategyStepMapSchema = z.object({});

// ============ Tool Handlers ============

/**
 * Generate (or regenerate) a strategy step with AI
 */
export async function generateStrategyStep(
  client: ReauditAPIClient,
  args: z.infer<typeof generateStrategyStepSchema>
): Promise<string> {
  const moduleName = MODULE_MAP[args.moduleNumber]?.name || `Module ${args.moduleNumber}`;
  const stepName = MODULE_MAP[args.moduleNumber]?.steps[args.stepNumber] || `Step ${args.stepNumber}`;

  const result = await client.generateStrategyStep(args.strategyId, {
    moduleNumber: args.moduleNumber,
    stepNumber: args.stepNumber,
    additionalContext: args.additionalContext,
  });

  let response = `## Step Generated: ${moduleName} > ${stepName}\n\n`;
  response += `- **Status:** ${result.step.status}\n`;
  response += `- **Credits Used:** ${result.creditsUsed}\n`;
  response += `- **Tokens Used:** ${result.tokensUsed}\n`;

  if (result.citations && result.citations.length > 0) {
    response += `- **Citations:** ${result.citations.length} sources\n`;
  }

  if (args.additionalContext) {
    response += `- **Additional Context:** "${args.additionalContext}"\n`;
  }

  response += `\n### Generated Content\n\n${result.content}\n`;

  if (result.citations && result.citations.length > 0) {
    response += `\n### Sources\n\n`;
    for (const citation of result.citations) {
      response += `- [${citation.title}](${citation.url})`;
      if (citation.snippet) {
        response += ` - ${citation.snippet.substring(0, 100)}...`;
      }
      response += '\n';
    }
  }

  // Add guidance about next steps
  const nextStep = getNextStep(args.moduleNumber, args.stepNumber);
  if (nextStep) {
    response += `\n### Next Step\n`;
    response += `The next step is **${nextStep.moduleName} > ${nextStep.stepName}** `;
    response += `(module ${nextStep.moduleNumber}, step ${nextStep.stepNumber}). `;
    response += `Use \`generate_strategy_step\` to generate it.`;
  } else {
    response += `\n### Completed!\n`;
    response += `All GTM strategy modules are now complete.`;
  }

  return response;
}

/**
 * Get the full output of a completed strategy step
 */
export async function getStrategyStepOutput(
  client: ReauditAPIClient,
  args: z.infer<typeof getStrategyStepOutputSchema>
): Promise<string> {
  const result = await client.getStrategyStepOutput(
    args.strategyId,
    args.moduleNumber,
    args.stepNumber
  );

  const moduleName = MODULE_MAP[args.moduleNumber]?.name || `Module ${args.moduleNumber}`;
  const stepName = MODULE_MAP[args.moduleNumber]?.steps[args.stepNumber] || `Step ${args.stepNumber}`;

  let response = `## ${moduleName} > ${stepName}\n\n`;
  response += `- **Status:** ${result.status}\n`;
  response += `- **Step ID:** ${result.stepId}\n`;

  if (result.generatedAt) {
    response += `- **Generated:** ${new Date(result.generatedAt).toLocaleString()}\n`;
  }
  if (result.hasBeenEdited && result.editedAt) {
    response += `- **Edited:** ${new Date(result.editedAt).toLocaleString()}\n`;
  }

  if (result.content) {
    response += `\n### Content\n\n${result.content}\n`;
  } else {
    response += `\nThis step has not been generated yet. Use \`generate_strategy_step\` to generate it.\n`;
  }

  if (result.citations && result.citations.length > 0) {
    response += `\n### Sources (${result.citations.length})\n\n`;
    for (const citation of result.citations) {
      response += `- [${citation.title}](${citation.url})\n`;
    }
  }

  return response;
}

/**
 * Edit the content of a strategy step
 */
export async function editStrategyStep(
  client: ReauditAPIClient,
  args: z.infer<typeof editStrategyStepSchema>
): Promise<string> {
  const moduleName = MODULE_MAP[args.moduleNumber]?.name || `Module ${args.moduleNumber}`;
  const stepName = MODULE_MAP[args.moduleNumber]?.steps[args.stepNumber] || `Step ${args.stepNumber}`;

  await client.editStrategyStep(args.strategyId, {
    moduleNumber: args.moduleNumber,
    stepNumber: args.stepNumber,
    content: args.content,
  });

  let response = `## Step Edited: ${moduleName} > ${stepName}\n\n`;
  response += `The content has been updated successfully.\n\n`;
  response += `- **Strategy:** ${args.strategyId}\n`;
  response += `- **Module:** ${args.moduleNumber} (${moduleName})\n`;
  response += `- **Step:** ${args.stepNumber} (${stepName})\n\n`;
  response += `Use \`get_strategy_step_output\` to view the updated content.`;

  return response;
}

/**
 * Get a map of all strategy modules and steps
 * Useful as a reference to know which modules/steps are available
 */
export async function getStrategyStepMap(): Promise<string> {
  let response = `## GTM Strategy Module & Step Reference\n\n`;
  response += `The strategy consists of 6 modules with 21 total steps.\n`;
  response += `Each step builds on previous outputs for progressive context.\n\n`;

  for (const [modNum, mod] of Object.entries(MODULE_MAP)) {
    response += `### Module ${modNum}: ${mod.name}\n`;
    for (const [stepNum, stepName] of Object.entries(mod.steps)) {
      response += `- Step ${stepNum}: ${stepName}\n`;
    }
    response += '\n';
  }

  response += `### Dependencies\n`;
  response += `- **Module 6** (Offer Conversion) requires Modules 1 & 2 to be completed first.\n`;
  response += `- All other modules can be run in order (1 through 5) sequentially.\n`;
  response += `- Each step within a module uses outputs from all previous steps as context.\n\n`;

  response += `### Recommended Workflow\n`;
  response += `1. Create a strategy with \`create_strategy\`\n`;
  response += `2. Generate steps sequentially with \`generate_strategy_step\`\n`;
  response += `3. Review output with \`get_strategy_step_output\`\n`;
  response += `4. Optionally edit with \`edit_strategy_step\` or regenerate with additional context\n`;
  response += `5. Repeat for each step until all modules are complete\n`;

  return response;
}

// ============ Helpers ============

/**
 * Determine the next step in the strategy sequence
 */
function getNextStep(currentModule: number, currentStep: number): {
  moduleNumber: number;
  stepNumber: number;
  moduleName: string;
  stepName: string;
} | null {
  const currentModuleSteps = MODULE_MAP[currentModule]?.steps;
  if (!currentModuleSteps) return null;

  const maxStep = Math.max(...Object.keys(currentModuleSteps).map(Number));
  
  // Next step in the same module
  if (currentStep < maxStep) {
    const nextStepNum = currentStep + 1;
    return {
      moduleNumber: currentModule,
      stepNumber: nextStepNum,
      moduleName: MODULE_MAP[currentModule].name,
      stepName: MODULE_MAP[currentModule].steps[nextStepNum],
    };
  }

  // First step of the next module
  const nextModule = currentModule + 1;
  if (nextModule <= 6 && MODULE_MAP[nextModule]) {
    return {
      moduleNumber: nextModule,
      stepNumber: 1,
      moduleName: MODULE_MAP[nextModule].name,
      stepName: MODULE_MAP[nextModule].steps[1],
    };
  }

  return null; // All modules complete
}

// ============ Tool Definitions ============

export const strategyStepTools = [
  {
    name: 'generate_strategy_step',
    description:
      'Generate AI content for a specific GTM strategy module step using Perplexity deep search. ' +
      'Each step builds on previous outputs. Run steps sequentially within each module. ' +
      'Supports regeneration with additional context for refining output. ' +
      'Modules: 1=Research, 2=Strategy, 3=Content Strategy, 4=Funnel, 5=Execution, 6=Offer. ' +
      'Costs credits per generation. Use get_strategy_step_map to see all available steps.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy',
        },
        moduleNumber: {
          type: 'number',
          description: 'Module number (1-6): 1=Research, 2=Strategy, 3=Content Strategy, 4=Funnel, 5=Execution, 6=Offer',
        },
        stepNumber: {
          type: 'number',
          description: 'Step number within the module (1-5, varies by module)',
        },
        additionalContext: {
          type: 'string',
          description: 'Additional context/instructions to guide the AI generation (e.g. "Focus on enterprise customers")',
        },
      },
      required: ['strategyId', 'moduleNumber', 'stepNumber'],
    },
  },
  {
    name: 'get_strategy_step_output',
    description:
      'Get the full generated output of a specific strategy step including content, citations, and edit history. ' +
      'Use this to read the complete AI-generated content for any completed step.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy',
        },
        moduleNumber: {
          type: 'number',
          description: 'Module number (1-6)',
        },
        stepNumber: {
          type: 'number',
          description: 'Step number within the module',
        },
      },
      required: ['strategyId', 'moduleNumber', 'stepNumber'],
    },
  },
  {
    name: 'edit_strategy_step',
    description:
      'Edit the content of a strategy step. Use this to modify generated content, add additional information, ' +
      'or refine the output. The edited content is saved separately from the original AI output.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        strategyId: {
          type: 'string',
          description: 'The ID of the strategy',
        },
        moduleNumber: {
          type: 'number',
          description: 'Module number (1-6)',
        },
        stepNumber: {
          type: 'number',
          description: 'Step number within the module',
        },
        content: {
          type: 'string',
          description: 'The new/updated content for this step',
        },
      },
      required: ['strategyId', 'moduleNumber', 'stepNumber', 'content'],
    },
  },
  {
    name: 'get_strategy_step_map',
    description:
      'Get a reference map of all GTM strategy modules and steps. ' +
      'Shows the 6 modules, their steps, dependencies, and recommended workflow. ' +
      'Use this to understand the structure before generating steps.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
];
