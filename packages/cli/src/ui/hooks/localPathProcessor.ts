/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PartListUnion, PartUnion } from '@google/genai';
import type { Config } from '@perplexity-cli/perplexity-cli-core';
import { getErrorMessage } from '@perplexity-cli/perplexity-cli-core';
import type { HistoryItem, IndividualToolCallDisplay } from '../types.js';
import { ToolCallStatus } from '../types.js';
import type { UseHistoryManagerReturn } from './useHistoryManager.js';

interface HandleLocalPathMentionsParams {
  query: string;
  config: Config;
  addItem: UseHistoryManagerReturn['addItem'];
  onDebugMessage: (message: string) => void;
  onInfoMessage?: (message: string) => void;
  messageId: number;
}

interface HandleLocalPathMentionsResult {
  processedQuery: PartListUnion | null;
  shouldProceed: boolean;
}

interface LocalPathMention {
  path: string;
}

interface DirectoryReadSummary {
  kind: 'directory';
  path: string;
  itemCount: number;
  textFileCount: number;
  binaryFileCount: number;
  omittedCount: number;
}

interface FileReadSummary {
  kind: 'file';
  path: string;
  fileType: LocalFileKind;
  size: number;
}

type LocalReadSummary = DirectoryReadSummary | FileReadSummary;

type LocalFileKind = 'text' | 'binary';

const MAX_DIRECTORY_FILES = 200;
const MAX_TEXT_FILES_PER_DIRECTORY = 12;
const MAX_TEXT_CHARS_PER_FILE = 4000;

const WINDOWS_PATH_START = /[A-Za-z]:[\\/]/;
const TRAILING_PATH_PUNCTUATION = /[，。；：！？、,;!?()[\]{}'"`<>]+$/u;
const TEXT_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.conf',
  '.cpp',
  '.cs',
  '.css',
  '.csv',
  '.do',
  '.env',
  '.go',
  '.h',
  '.hpp',
  '.html',
  '.ini',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.log',
  '.md',
  '.mjs',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.smcl',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avif',
  '.bin',
  '.bmp',
  '.dmg',
  '.doc',
  '.docx',
  '.dta',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.ppt',
  '.pptx',
  '.rar',
  '.sqlite',
  '.tar',
  '.webp',
  '.xls',
  '.xlsx',
  '.zip',
]);

function isLikelyPathTerminator(char: string): boolean {
  return /[\r\n\t，。；：！？、,;!?()[\]{}'"`<>]/u.test(char);
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await fs.stat(candidate);
    return true;
  } catch {
    return false;
  }
}

function trimCandidate(candidate: string): string {
  return candidate.trim().replace(TRAILING_PATH_PUNCTUATION, '');
}

async function resolveLongestExistingPath(
  rawCandidate: string,
): Promise<string | null> {
  let candidate = trimCandidate(rawCandidate);

  while (candidate.length >= 3) {
    if (await pathExists(candidate)) {
      return path.resolve(candidate);
    }

    const descriptorTrimmed = trimCandidate(
      candidate.replace(
        /(?:文件夹|目录|文件|folder|directory|dir|file)$/iu,
        '',
      ),
    );
    if (descriptorTrimmed !== candidate) {
      candidate = descriptorTrimmed;
      continue;
    }

    const lastSpace = candidate.lastIndexOf(' ');
    if (lastSpace < 3) {
      break;
    }

    candidate = trimCandidate(candidate.slice(0, lastSpace));
  }

  return null;
}

export async function extractExistingWindowsPaths(
  query: string,
): Promise<LocalPathMention[]> {
  const mentions: LocalPathMention[] = [];
  const seen = new Set<string>();

  const matcher = /[A-Za-z]:[\\/]/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(query)) !== null) {
    const start = match.index;
    let end = start;

    while (end < query.length && !isLikelyPathTerminator(query[end])) {
      end++;
    }

    const resolvedPath = await resolveLongestExistingPath(
      query.slice(start, end),
    );

    if (resolvedPath && !seen.has(resolvedPath.toLowerCase())) {
      seen.add(resolvedPath.toLowerCase());
      mentions.push({ path: resolvedPath });
    }
  }

  return mentions;
}

function hasWindowsPathMention(query: string): boolean {
  return WINDOWS_PATH_START.test(query);
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function detectLocalFileKind(filePath: string): LocalFileKind {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return 'binary';
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return 'text';
  }
  return 'text';
}

async function collectFiles(
  directory: string,
  relativePrefix = '',
  files: string[] = [],
): Promise<string[]> {
  if (files.length >= MAX_DIRECTORY_FILES) {
    return files;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (files.length >= MAX_DIRECTORY_FILES) {
      break;
    }

    const absolutePath = path.join(directory, entry.name);
    const relativePath = relativePrefix
      ? path.join(relativePrefix, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      await collectFiles(absolutePath, relativePath, files);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function readTextSnippet(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  if (content.length <= MAX_TEXT_CHARS_PER_FILE) {
    return content.trimEnd();
  }
  return `${content.slice(0, MAX_TEXT_CHARS_PER_FILE).trimEnd()}\n... [truncated]`;
}

async function buildFileContext(filePath: string): Promise<{
  part: PartUnion;
  summary: FileReadSummary;
}> {
  const stats = await fs.stat(filePath);
  const fileType = detectLocalFileKind(filePath);
  const summary: FileReadSummary = {
    kind: 'file',
    path: filePath,
    fileType,
    size: stats.size,
  };

  if (fileType === 'binary') {
    return {
      summary,
      part: {
        text:
          `--- Local binary file: ${filePath} ---\n` +
          `Size: ${formatBytes(stats.size)}\n` +
          `Content is binary and was summarized, not embedded.`,
      },
    };
  }

  const content = await readTextSnippet(filePath);
  return {
    summary,
    part: {
      text:
        `--- Local text file: ${filePath} ---\n` +
        `Size: ${formatBytes(stats.size)}\n\n` +
        content,
    },
  };
}

async function buildDirectoryContext(directoryPath: string): Promise<{
  parts: PartUnion[];
  summary: DirectoryReadSummary;
}> {
  const files = await collectFiles(directoryPath);
  let textFileCount = 0;
  let binaryFileCount = 0;
  let embeddedTextFiles = 0;
  const inventory: string[] = [];
  const parts: PartUnion[] = [];

  for (const relativeFile of files) {
    const absoluteFile = path.join(directoryPath, relativeFile);
    const stats = await fs.stat(absoluteFile);
    const fileType = detectLocalFileKind(absoluteFile);
    const displayPath = relativeFile.replace(/\\/g, '/');

    if (fileType === 'binary') {
      binaryFileCount++;
    } else {
      textFileCount++;
    }

    inventory.push(
      `- ${displayPath} (${fileType}, ${formatBytes(stats.size)})`,
    );

    if (
      fileType === 'text' &&
      embeddedTextFiles < MAX_TEXT_FILES_PER_DIRECTORY
    ) {
      embeddedTextFiles++;
      parts.push({
        text:
          `\n--- Local text file: ${displayPath} ---\n` +
          (await readTextSnippet(absoluteFile)),
      });
    }
  }

  const summary: DirectoryReadSummary = {
    kind: 'directory',
    path: directoryPath,
    itemCount: files.length,
    textFileCount,
    binaryFileCount,
    omittedCount: Math.max(0, files.length - MAX_DIRECTORY_FILES),
  };

  const header =
    `--- Local directory inventory: ${directoryPath} ---\n` +
    `Files listed: ${files.length}` +
    (summary.omittedCount > 0
      ? ` (${summary.omittedCount} additional files omitted)`
      : '') +
    `\nText files: ${textFileCount}\nBinary files summarized: ${binaryFileCount}\n\n` +
    inventory.join('\n');

  return {
    summary,
    parts: [{ text: header }, ...parts],
  };
}

function summarizeRead(summary: LocalReadSummary): string {
  if (summary.kind === 'directory') {
    return `Included local folder: ${summary.path} (${summary.itemCount} files, ${summary.textFileCount} text files, ${summary.binaryFileCount} binary files summarized)`;
  }

  return `Included local file: ${summary.path} (${summary.fileType}, ${formatBytes(summary.size)})`;
}

export async function handleLocalPathMentions({
  query,
  addItem,
  onDebugMessage,
  onInfoMessage,
  messageId,
}: HandleLocalPathMentionsParams): Promise<HandleLocalPathMentionsResult> {
  const mentions = await extractExistingWindowsPaths(query);

  if (mentions.length === 0) {
    if (hasWindowsPathMention(query)) {
      const message =
        'Local path was mentioned, but it does not exist or cannot be read.';
      addItem({ type: 'error', text: message }, messageId);
      onDebugMessage(message);
      onInfoMessage?.(message);
      return { processedQuery: null, shouldProceed: false };
    }

    return { processedQuery: query, shouldProceed: true };
  }

  const processedQueryParts: PartUnion[] = [
    { text: query },
    { text: '\n--- Local file context injected by Perplexity CLI ---' },
  ];
  const summaries: LocalReadSummary[] = [];

  try {
    for (const mention of mentions) {
      const stats = await fs.stat(mention.path);
      if (stats.isDirectory()) {
        const directoryContext = await buildDirectoryContext(mention.path);
        summaries.push(directoryContext.summary);
        processedQueryParts.push(...directoryContext.parts);
      } else {
        const fileContext = await buildFileContext(mention.path);
        summaries.push(fileContext.summary);
        processedQueryParts.push(fileContext.part);
      }
    }
  } catch (error) {
    const message = `Error reading local path: ${getErrorMessage(error)}`;
    addItem({ type: 'error', text: message }, messageId);
    return { processedQuery: null, shouldProceed: false };
  }

  processedQueryParts.push({
    text: '--- End local file context injected by Perplexity CLI ---',
  });

  const resultDisplay = summaries.map(summarizeRead).join('\n');
  const toolCallDisplay: IndividualToolCallDisplay = {
    callId: `client-local-path-${messageId}`,
    name: 'Local path context',
    description: `Read explicit local path mention${summaries.length === 1 ? '' : 's'} from the prompt.`,
    status: ToolCallStatus.Success,
    resultDisplay,
    confirmationDetails: undefined,
  };

  addItem(
    { type: 'tool_group', tools: [toolCallDisplay] } as Omit<HistoryItem, 'id'>,
    messageId,
  );
  onDebugMessage(resultDisplay);
  onInfoMessage?.(resultDisplay);

  return { processedQuery: processedQueryParts, shouldProceed: true };
}
