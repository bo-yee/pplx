/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@perplexity-cli/perplexity-cli-core';
import { t } from '../../i18n/index.js';

export type AvailableModel = {
  id: string;
  label: string;
  description?: string;
  isVision?: boolean;
};

// Perplexity Models
export const SONAR_PRO = 'sonar-pro';
export const SONAR = 'sonar';
export const SONAR_REASONING_PRO = 'sonar-reasoning-pro';
export const SONAR_DEEP_RESEARCH = 'sonar-deep-research';

export const AVAILABLE_MODELS_PERPLEXITY: AvailableModel[] = [
  {
    id: SONAR_PRO,
    label: 'Sonar Pro',
    get description() {
      return t(
        "Perplexity's most capable model for complex research and coding tasks (200K context)",
      );
    },
  },
  {
    id: SONAR,
    label: 'Sonar',
    get description() {
      return t('Fast and efficient model for everyday tasks (128K context)');
    },
  },
  {
    id: SONAR_REASONING_PRO,
    label: 'Sonar Reasoning Pro',
    get description() {
      return t(
        'Advanced reasoning model for complex problem solving (128K context)',
      );
    },
  },
  {
    id: SONAR_DEEP_RESEARCH,
    label: 'Sonar Deep Research',
    get description() {
      return t(
        'Expert-level research model for comprehensive multi-step analysis (128K context)',
      );
    },
  },
];

// Web session models (available when using session token auth)
export const AVAILABLE_MODELS_WEB_SESSION: AvailableModel[] = [
  {
    id: 'sonar',
    label: 'Sonar (auto)',
    description: 'Default fast model',
  },
  {
    id: 'sonar-pro',
    label: 'Sonar Pro',
    description: 'Pro mode search',
  },
  {
    id: 'claude-4.6-sonnet',
    label: 'Claude Sonnet 4.6',
    description: 'Anthropic Claude via Pro mode',
  },
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'OpenAI GPT-5.4 via Pro mode',
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'OpenAI GPT-5.2 via Pro mode',
  },
  {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    description: 'Google Gemini via Pro mode',
  },
  {
    id: 'kimi-k2.6',
    label: 'Kimi K2.6',
    description: 'Moonshot Kimi via Pro mode',
  },
  {
    id: 'grok-4.1',
    label: 'Grok 4.1',
    description: 'xAI Grok via Pro mode',
  },
  {
    id: 'sonar-reasoning-pro',
    label: 'Sonar Reasoning Pro',
    description: 'Reasoning mode with CoT',
  },
  {
    id: 'claude-4.6-sonnet-thinking',
    label: 'Claude Sonnet 4.6 Thinking',
    description: 'Claude with reasoning',
  },
  {
    id: 'gpt-5.4-thinking',
    label: 'GPT-5.4 Thinking',
    description: 'GPT-5.4 with reasoning',
  },
  {
    id: 'sonar-deep-research',
    label: 'Sonar Deep Research',
    description: 'Deep research mode',
  },
];

// Legacy exports for compatibility
export const MAINLINE_VLM = SONAR_PRO;
export const MAINLINE_CODER = SONAR_PRO;

/**
 * Get available Perplexity models
 */
export function getFilteredPerplexityModels(
  _visionModelPreviewEnabled: boolean,
): AvailableModel[] {
  return AVAILABLE_MODELS_PERPLEXITY;
}

/**
 * Get model from environment variable
 */
export function getOpenAIAvailableModelFromEnv(): AvailableModel | null {
  const id = process.env['PERPLEXITY_MODEL']?.trim();
  return id ? { id, label: id } : null;
}

export function getAvailableModelsForAuthType(
  authType: AuthType,
): AvailableModel[] {
  // Web session auth gets the full model list
  if (authType === AuthType.WEB_SESSION) {
    return AVAILABLE_MODELS_WEB_SESSION;
  }

  // Perplexity CLI always returns Perplexity models
  if (
    authType === AuthType.PERPLEXITY_API_KEY ||
    authType === AuthType.USE_OPENAI
  ) {
    return AVAILABLE_MODELS_PERPLEXITY;
  }

  // Check for custom model from env
  const envModel = getOpenAIAvailableModelFromEnv();
  if (envModel) {
    return [envModel, ...AVAILABLE_MODELS_PERPLEXITY];
  }

  return AVAILABLE_MODELS_PERPLEXITY;
}

/**
 * Get the default model for Perplexity
 */
export function getDefaultVisionModel(): string {
  return SONAR_PRO;
}

export function isVisionModel(_modelId: string): boolean {
  // Perplexity models don't have vision capabilities in the same way
  return false;
}
