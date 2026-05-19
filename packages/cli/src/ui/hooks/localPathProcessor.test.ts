/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '@perplexity-cli/perplexity-cli-core';
import {
  extractExistingWindowsPaths,
  handleLocalPathMentions,
} from './localPathProcessor.js';
import { ToolCallStatus } from '../types.js';

describe('localPathProcessor', () => {
  let testRootDir: string;
  const mockAddItem = vi.fn();
  const mockOnDebugMessage = vi.fn();
  const mockOnInfoMessage = vi.fn();
  const mockConfig = {} as Config;

  beforeEach(async () => {
    vi.resetAllMocks();
    testRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-path-test-'));
  });

  afterEach(async () => {
    await fs.rm(testRootDir, { recursive: true, force: true });
  });

  async function createFile(relativePath: string, content: string | Buffer) {
    const fullPath = path.join(testRootDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return fullPath;
  }

  it('extracts an existing Windows path from Chinese natural language', async () => {
    const dataDir = path.join(testRootDir, '城市拥挤效应破解的数字化方案数据');
    await fs.mkdir(dataDir, { recursive: true });

    const mentions = await extractExistingWindowsPaths(
      `读取 ${dataDir} 文件夹，告诉我有哪些内容`,
    );

    expect(mentions).toEqual([{ path: path.resolve(dataDir) }]);
  });

  it('extracts a Chinese path when the user appends 文件夹 without a separator', async () => {
    const dataDir = path.join(testRootDir, '城市拥挤效应破解的数字化方案数据');
    await fs.mkdir(dataDir, { recursive: true });

    const mentions = await extractExistingWindowsPaths(
      `读取 ${dataDir}文件夹，告诉我有哪些内容`,
    );

    expect(mentions).toEqual([{ path: path.resolve(dataDir) }]);
  });

  it('extracts a quoted path with spaces', async () => {
    const dataDir = path.join(testRootDir, '城市 拥挤 数据');
    await fs.mkdir(dataDir, { recursive: true });

    const mentions = await extractExistingWindowsPaths(
      `读取 "${dataDir}" 这个文件夹`,
    );

    expect(mentions).toEqual([{ path: path.resolve(dataDir) }]);
  });

  it('ignores URLs, email addresses, and model ids', async () => {
    const mentions = await extractExistingWindowsPaths(
      '打开 https://example.com，联系 a@b.com，模型 gpt-5.2',
    );

    expect(mentions).toEqual([]);
  });

  it('injects directory inventory and text snippets while summarizing .dta files', async () => {
    const dataDir = path.join(testRootDir, '城市拥挤效应破解的数字化方案数据');
    await createFile(
      path.join('城市拥挤效应破解的数字化方案数据', 'appendix.do'),
      'use congestion_day.dta\nsummarize congestion',
    );
    await createFile(
      path.join('城市拥挤效应破解的数字化方案数据', 'congestion_day.dta'),
      Buffer.from([0, 1, 2, 3]),
    );
    await createFile(
      path.join('城市拥挤效应破解的数字化方案数据', '数据清洗.smcl'),
      'Stata log output',
    );

    const result = await handleLocalPathMentions({
      query: `读取 ${dataDir} 文件夹，告诉我有哪些内容`,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      onInfoMessage: mockOnInfoMessage,
      messageId: 123,
    });

    const text = JSON.stringify(result.processedQuery);
    expect(result.shouldProceed).toBe(true);
    expect(text).toContain('Local directory inventory');
    expect(text).toContain('appendix.do (text');
    expect(text).toContain('congestion_day.dta (binary');
    expect(text).toContain('数据清洗.smcl (text');
    expect(text).toContain('use congestion_day.dta');
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool_group',
        tools: [expect.objectContaining({ status: ToolCallStatus.Success })],
      }),
      123,
    );
    expect(mockOnInfoMessage).toHaveBeenCalledWith(
      expect.stringContaining('Included local folder:'),
    );
  });

  it('injects a single text file', async () => {
    const filePath = await createFile('notes.md', '# Notes');

    const result = await handleLocalPathMentions({
      query: `总结 ${filePath}`,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 456,
    });

    expect(result.shouldProceed).toBe(true);
    expect(JSON.stringify(result.processedQuery)).toContain('# Notes');
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      expect.stringContaining('Included local file:'),
    );
  });

  it('returns a local error for a nonexistent explicit path', async () => {
    const missingPath = path.join(testRootDir, 'missing-folder');

    const result = await handleLocalPathMentions({
      query: `读取 ${missingPath}`,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 789,
    });

    expect(result).toEqual({ processedQuery: null, shouldProceed: false });
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text: expect.stringContaining('Local path was mentioned'),
      }),
      789,
    );
  });
});
