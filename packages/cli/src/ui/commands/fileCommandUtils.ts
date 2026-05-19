/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import type { Config } from '@perplexity-cli/perplexity-cli-core';

export function parseCommandArgs(args: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(args)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? '');
  }

  return tokens;
}

export function resolveWorkspacePath(
  config: Config,
  rawPath: string | undefined,
): string {
  const targetDir = config.getTargetDir();
  const inputPath = rawPath?.trim() || '.';
  return path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(targetDir, inputPath);
}

export function validateWithinWorkspace(
  config: Config,
  absolutePath: string,
): string | null {
  const workspaceContext = config.getWorkspaceContext();
  if (workspaceContext.isPathWithinWorkspace(absolutePath)) {
    return null;
  }

  return `Path is outside the workspace. Allowed directories:\n${workspaceContext
    .getDirectories()
    .map((dir) => `- ${dir}`)
    .join('\n')}`;
}

export function makeWorkspaceRelative(
  config: Config,
  absolutePath: string,
): string {
  const workspaceDirs = config.getWorkspaceContext().getDirectories();
  for (const dir of workspaceDirs) {
    const relative = path.relative(dir, absolutePath);
    if (
      relative &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    ) {
      return relative;
    }
    if (!relative) {
      return '.';
    }
  }

  return path.relative(config.getTargetDir(), absolutePath);
}
