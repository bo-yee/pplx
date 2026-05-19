/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@perplexity-cli/perplexity-cli-core';
import { loadEnvironment, loadSettings } from './settings.js';

export function validateAuthMethod(authMethod: string): string | null {
  const settings = loadSettings();
  loadEnvironment(settings.merged);

  // Web session token authentication (cookie-based, no API key needed)
  if (authMethod === AuthType.WEB_SESSION) {
    const hasSessionToken =
      process.env['PERPLEXITY_SESSION_TOKEN'] ||
      settings.merged.security?.auth?.sessionToken;
    if (!hasSessionToken) {
      return 'No Perplexity session token found. Set PERPLEXITY_SESSION_TOKEN env var or add sessionToken to settings.json security.auth.sessionToken.';
    }
    return null;
  }

  // Perplexity CLI supports API key authentication
  if (
    authMethod === AuthType.PERPLEXITY_API_KEY ||
    authMethod === AuthType.USE_PERPLEXITY ||
    authMethod === AuthType.USE_OPENAI
  ) {
    const hasApiKey =
      process.env['PERPLEXITY_API_KEY'] ||
      settings.merged.security?.auth?.apiKey;
    if (!hasApiKey) {
      return 'PERPLEXITY_API_KEY environment variable not found. You can enter it interactively or add it to your .env file.';
    }
    return null;
  }

  return 'Invalid auth method selected. Perplexity CLI only supports API key or web session authentication.';
}
