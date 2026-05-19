import {
  type SlashCommand,
  type CommandContext,
  CommandKind,
} from './types.js';
import { MessageType } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from '@perplexity-cli/perplexity-cli-core';
import {
  makeWorkspaceRelative,
  parseCommandArgs,
  resolveWorkspacePath,
  validateWithinWorkspace,
} from './fileCommandUtils.js';

const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.sh',
  '.bash',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.md',
  '.txt',
  '.csv',
  '.env',
  '.ini',
  '.cfg',
  '.conf',
  '.log',
]);

function grepDir(
  config: Config,
  dir: string,
  pattern: string,
  limit: number,
): string[] {
  const results: string[] = [];
  const lower = pattern.toLowerCase();

  function searchFile(filePath: string) {
    if (results.length >= limit) return;
    if (config.getFileService().shouldPerplexityIgnoreFile(filePath)) {
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) return;
    try {
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (results.length >= limit) break;
        if (lines[i].toLowerCase().includes(lower)) {
          const rel = makeWorkspaceRelative(config, filePath);
          results.push(`${rel}:${i + 1}: ${lines[i].trimEnd()}`);
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  function walk(current: string) {
    if (results.length >= limit) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) return;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist'
        )
          continue;
        walk(full);
      } else if (entry.isFile()) {
        searchFile(full);
      }
    }
  }

  try {
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
      searchFile(dir);
    } else if (stat.isDirectory()) {
      walk(dir);
    }
  } catch {
    // handled by no matches output
  }
  return results;
}

export const grepCommand: SlashCommand = {
  name: 'grep',
  altNames: ['find-text'],
  description: 'Search for text in files. Usage: /grep <pattern> [path]',
  kind: CommandKind.BUILT_IN,
  action: (context: CommandContext, args: string): void => {
    const config = context.services.config;
    if (!config) {
      context.ui.addItem(
        { type: MessageType.ERROR, text: 'Configuration is not available.' },
        Date.now(),
      );
      return;
    }

    const parts = parseCommandArgs(args);
    if (!parts[0]) {
      context.ui.addItem(
        { type: MessageType.ERROR, text: 'Usage: /grep <pattern> [path]' },
        Date.now(),
      );
      return;
    }

    const pattern = parts[0];
    const searchPath = resolveWorkspacePath(config, parts[1]);
    const workspaceError = validateWithinWorkspace(config, searchPath);
    if (workspaceError) {
      context.ui.addItem(
        { type: MessageType.ERROR, text: workspaceError },
        Date.now(),
      );
      return;
    }

    const matches = grepDir(config, searchPath, pattern, 60);

    context.ui.addItem(
      {
        type: MessageType.INFO,
        text:
          matches.length > 0
            ? matches.join('\n') +
              (matches.length >= 60 ? '\n... (truncated)' : '')
            : '(no matches)',
      },
      Date.now(),
    );
  },
};
