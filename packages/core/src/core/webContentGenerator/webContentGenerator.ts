/**
 * Web Content Generator - Uses Perplexity's web interface SSE API
 * instead of the official API. Authenticated via session cookie.
 *
 * Ported from: D:\perplexity-ai\perplexity\client.py
 */

import { randomUUID } from 'node:crypto';
import type {
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
} from '@google/genai';
import { GenerateContentResponse, FinishReason } from '@google/genai';
import type {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../contentGenerator.js';
import type { Config } from '../../config/config.js';

// ---------------------------------------------------------------------------
// Constants (ported from perplexity/config.py)
// ---------------------------------------------------------------------------

const API_BASE_URL = 'https://www.perplexity.ai';
const ENDPOINT_SSE_ASK = `${API_BASE_URL}/rest/sse/perplexity_ask`;
const API_VERSION = '2.18';

const DEFAULT_HEADERS: Record<string, string> = {
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'max-age=0',
  dnt: '1',
  priority: 'u=0, i',
  'sec-ch-ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
  'sec-ch-ua-arch': '"x86"',
  'sec-ch-ua-bitness': '"64"',
  'sec-ch-ua-full-version': '"128.0.6613.120"',
  'sec-ch-ua-full-version-list':
    '"Not;A=Brand";v="24.0.0.0", "Chromium";v="128.0.6613.120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-model': '""',
  'sec-ch-ua-platform': '"Windows"',
  'sec-ch-ua-platform-version': '"19.0.0"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

// ---------------------------------------------------------------------------
// Model mapping: CLI model name → web API mode + model_preference
// Ported from D:\perplexity-ai\perplexity\config.py MODEL_MAPPINGS
// ---------------------------------------------------------------------------

interface WebModelConfig {
  mode: 'auto' | 'pro' | 'reasoning' | 'deep research';
  modelPreference: string;
}

const WEB_MODEL_MAP: Record<string, WebModelConfig> = {
  // Default / auto
  sonar: { mode: 'auto', modelPreference: 'turbo' },
  auto: { mode: 'auto', modelPreference: 'turbo' },

  // Pro models
  'sonar-pro': { mode: 'pro', modelPreference: 'pplx_pro' },
  'gpt-5.4': { mode: 'pro', modelPreference: 'gpt54' },
  'gpt-5.2': { mode: 'pro', modelPreference: 'gpt52' },
  'claude-4.6-sonnet': { mode: 'pro', modelPreference: 'claude46sonnet' },
  'claude-4.5-sonnet': { mode: 'pro', modelPreference: 'claude45sonnet' },
  'gemini-3.1-pro': { mode: 'pro', modelPreference: 'gemini31pro' },
  'gemini-3.0-pro': { mode: 'pro', modelPreference: 'gemini30pro' },
  'kimi-k2.6': { mode: 'pro', modelPreference: 'kimik26' },
  'kimi-k2': { mode: 'pro', modelPreference: 'kimik2' },
  'grok-4.1': { mode: 'pro', modelPreference: 'grok41nonreasoning' },

  // Reasoning models
  'sonar-reasoning-pro': {
    mode: 'reasoning',
    modelPreference: 'pplx_reasoning',
  },
  'sonar-reasoning': { mode: 'reasoning', modelPreference: 'pplx_reasoning' },
  'gpt-5.4-thinking': { mode: 'reasoning', modelPreference: 'gpt54_thinking' },
  'gpt-5.2-thinking': { mode: 'reasoning', modelPreference: 'gpt52_thinking' },
  'claude-4.6-sonnet-thinking': {
    mode: 'reasoning',
    modelPreference: 'claude46sonnetthinking',
  },
  'claude-4.5-sonnet-thinking': {
    mode: 'reasoning',
    modelPreference: 'claude45sonnetthinking',
  },
  'kimi-k2.6-thinking': {
    mode: 'reasoning',
    modelPreference: 'kimik26thinking',
  },
  'kimi-k2-thinking': { mode: 'reasoning', modelPreference: 'kimik2thinking' },
  'grok-4.1-reasoning': {
    mode: 'reasoning',
    modelPreference: 'grok41reasoning',
  },

  // Deep research
  'sonar-deep-research': {
    mode: 'deep research',
    modelPreference: 'pplx_alpha',
  },
};

function resolveWebModel(modelName: string): WebModelConfig {
  return WEB_MODEL_MAP[modelName] || WEB_MODEL_MAP['sonar'];
}

// ---------------------------------------------------------------------------
// SSE response types (ported from Python client parsing)
// ---------------------------------------------------------------------------

interface WebSSEChunk {
  answer?: string;
  text?: unknown;
  chunks?: Array<Record<string, unknown>>;
  attachments?: unknown[];
  backend_uuid?: string;
  uuid?: string;
}

// ---------------------------------------------------------------------------
// WebContentGenerator
// ---------------------------------------------------------------------------

export class WebContentGenerator implements ContentGenerator {
  private sessionToken: string;
  private modelConfig: WebModelConfig;
  private lastBackendUuid: string | null = null;

  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    _cliConfig: Config,
  ) {
    // Token can come from config or env — strip whitespace/newlines
    this.sessionToken = (
      contentGeneratorConfig.apiKey ||
      process.env['PERPLEXITY_SESSION_TOKEN'] ||
      ''
    ).replace(/[\s\r\n]+/g, '');
    if (!this.sessionToken) {
      throw new Error(
        'Perplexity session token is required. Set PERPLEXITY_SESSION_TOKEN or configure in settings.json.',
      );
    }
    this.modelConfig = resolveWebModel(contentGeneratorConfig.model);
  }

  // -------------------------------------------------------------------------
  // ContentGenerator interface
  // -------------------------------------------------------------------------

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const query = this.extractQuery(request);
    const toolInstructions = this.buildToolInstructions(request);
    const fullQuery = toolInstructions
      ? `${toolInstructions}\n\n${query}`
      : query;
    const webResponse = await this.callWebAPI(
      fullQuery,
      request.config?.abortSignal,
    );
    return this.convertToGenerateContentResponse(webResponse);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const query = this.extractQuery(request);
    const toolInstructions = this.buildToolInstructions(request);
    const fullQuery = toolInstructions
      ? `${toolInstructions}\n\n${query}`
      : query;
    const self = this;

    return (async function* () {
      const stream = self.callWebAPIStream(
        fullQuery,
        request.config?.abortSignal,
      );

      let lastAnswer = '';
      for await (const chunk of stream) {
        const answer = chunk.answer || '';
        if (answer && answer !== lastAnswer) {
          const delta = answer.startsWith(lastAnswer)
            ? answer.slice(lastAnswer.length)
            : answer;
          lastAnswer = answer;

          if (delta) {
            yield self.makeTextResponse(delta, false);
          }
        }

        // Track backend_uuid for follow-up queries
        if (chunk.backend_uuid || chunk.uuid) {
          self.lastBackendUuid = chunk.backend_uuid || chunk.uuid || null;
        }
      }

      // Final response with finish reason
      yield self.makeTextResponse('', true);
    })();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const content = JSON.stringify(request.contents);
    return { totalTokens: Math.ceil(content.length / 4) };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error(
      'Embedding is not supported with web session authentication.',
    );
  }

  // -------------------------------------------------------------------------
  // Query extraction
  // -------------------------------------------------------------------------

  private extractQuery(request: GenerateContentParameters): string {
    const contents = request.contents;
    if (!contents) return '';

    // contents can be a ContentListUnion - handle array of Content objects
    if (Array.isArray(contents)) {
      const parts: string[] = [];
      for (const content of contents) {
        if (typeof content === 'string') {
          parts.push(content);
        } else if ('parts' in content && content.parts) {
          for (const part of content.parts) {
            if (typeof part === 'string') {
              parts.push(part);
            } else if ('text' in part && part.text) {
              parts.push(part.text);
            }
          }
        }
      }
      return parts.join('\n').trim();
    }

    if (typeof contents === 'string') return contents;

    if ('parts' in contents && contents.parts) {
      return contents.parts
        .map((p) =>
          typeof p === 'string' ? p : 'text' in p ? p.text || '' : '',
        )
        .join('\n')
        .trim();
    }

    return '';
  }

  private buildToolInstructions(_request: GenerateContentParameters): string {
    // The web session endpoint does not support the Gemini/OpenAI function
    // calling protocols used by the core tool registry. Local context is still
    // injected before this generator runs, for example through @file handling
    // and slash commands.
    return '';
  }

  // -------------------------------------------------------------------------
  // Web API calls
  // -------------------------------------------------------------------------

  private buildCookieHeader(): string {
    return `__Secure-next-auth.session-token=${this.sessionToken}`;
  }

  private buildWebHeaders(): Record<string, string> {
    return {
      ...DEFAULT_HEADERS,
      cookie: this.buildCookieHeader(),
      'content-type': 'application/json',
      referer: 'https://www.perplexity.ai/',
      origin: 'https://www.perplexity.ai',
    };
  }

  private buildRequestBody(query: string): Record<string, unknown> {
    return {
      query_str: query,
      params: {
        frontend_context_uuid: randomUUID(),
        frontend_uuid: randomUUID(),
        is_incognito: false,
        language: 'en-US',
        last_backend_uuid: this.lastBackendUuid,
        mode: this.modelConfig.mode === 'auto' ? 'concise' : 'copilot',
        model_preference: this.modelConfig.modelPreference,
        source: 'default',
        sources: ['web'],
        version: API_VERSION,
      },
    };
  }

  /**
   * Non-streaming web API call - collects all SSE chunks and returns final result.
   */
  private async callWebAPI(
    query: string,
    abortSignal?: AbortSignal,
  ): Promise<WebSSEChunk> {
    const resp = await fetch(ENDPOINT_SSE_ASK, {
      method: 'POST',
      headers: this.buildWebHeaders(),
      body: JSON.stringify(this.buildRequestBody(query)),
      signal: abortSignal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Perplexity web API error: ${resp.status} ${resp.statusText} - ${text}`,
      );
    }

    const chunks = await this.parseSSEResponse(resp);
    return chunks.length > 0 ? chunks[chunks.length - 1] : {};
  }

  /**
   * Streaming web API call - yields SSE chunks as they arrive.
   */
  private async *callWebAPIStream(
    query: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<WebSSEChunk> {
    const resp = await fetch(ENDPOINT_SSE_ASK, {
      method: 'POST',
      headers: this.buildWebHeaders(),
      body: JSON.stringify(this.buildRequestBody(query)),
      signal: abortSignal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Perplexity web API error: ${resp.status} ${resp.statusText} - ${text}`,
      );
    }

    if (!resp.body) {
      throw new Error('No response body from Perplexity web API');
    }

    // Parse SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by double newline (SSE event delimiter)
        const events = buffer.split('\r\n\r\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const parsed = this.parseSSEEvent(event);
          if (parsed) {
            yield parsed;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const parsed = this.parseSSEEvent(buffer);
        if (parsed) {
          yield parsed;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // -------------------------------------------------------------------------
  // SSE parsing (ported from Python client)
  // -------------------------------------------------------------------------

  /**
   * Parse all SSE events from a non-streaming response.
   */
  private async parseSSEResponse(resp: Response): Promise<WebSSEChunk[]> {
    const text = await resp.text();
    const events = text.split('\r\n\r\n');
    const chunks: WebSSEChunk[] = [];

    for (const event of events) {
      const parsed = this.parseSSEEvent(event);
      if (parsed) {
        chunks.push(parsed);
      }
    }

    return chunks;
  }

  /**
   * Parse a single SSE event block.
   * Format: "event: message\r\ndata: {json}"
   */
  private parseSSEEvent(eventBlock: string): WebSSEChunk | null {
    const trimmed = eventBlock.trim();
    if (!trimmed) return null;

    // Check for end_of_stream
    if (trimmed.startsWith('event: end_of_stream')) {
      return null;
    }

    // Extract data from "event: message\r\ndata: {json}"
    if (!trimmed.startsWith('event: message')) return null;

    const dataPrefix = 'data: ';
    const dataIndex = trimmed.indexOf(dataPrefix);
    if (dataIndex === -1) return null;

    const jsonStr = trimmed.slice(dataIndex + dataPrefix.length).trim();
    if (!jsonStr) return null;

    try {
      const chunk: WebSSEChunk = JSON.parse(jsonStr);

      // Parse nested 'text' field if it contains a JSON string
      if (chunk.text && typeof chunk.text === 'string') {
        try {
          const parsed = JSON.parse(chunk.text as string);
          if (Array.isArray(parsed)) {
            chunk.text = parsed;
            // Try to extract answer from FINAL step
            for (const step of parsed) {
              if (step?.step_type === 'FINAL' && step?.content?.answer) {
                try {
                  const answerData = JSON.parse(step.content.answer);
                  chunk.answer = answerData.answer || '';
                  chunk.chunks = answerData.chunks || [];
                } catch {
                  // ignore parse errors
                }
                break;
              }
            }
          }
        } catch {
          // text is not JSON, keep as-is
        }
      }

      return chunk;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Response conversion
  // -------------------------------------------------------------------------

  private convertToGenerateContentResponse(
    chunk: WebSSEChunk,
  ): GenerateContentResponse {
    const response = new GenerateContentResponse();
    const text = chunk.answer || '';

    response.candidates = [
      {
        content: {
          parts: [{ text }],
          role: 'model',
        },
        index: 0,
        finishReason: FinishReason.STOP,
        safetyRatings: [],
      },
    ];

    return response;
  }

  private makeTextResponse(
    text: string,
    isFinal: boolean,
  ): GenerateContentResponse {
    const response = new GenerateContentResponse();
    response.candidates = [
      {
        content: {
          parts: text ? [{ text }] : [],
          role: 'model',
        },
        index: 0,
        finishReason: isFinal ? FinishReason.STOP : undefined,
        safetyRatings: [],
      },
    ];
    return response;
  }
}
