import {
  type SlashCommand,
  type CommandContext,
  CommandKind,
} from './types.js';
import { MessageType } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  makeWorkspaceRelative,
  parseCommandArgs,
  resolveWorkspacePath,
  validateWithinWorkspace,
} from './fileCommandUtils.js';

export const lsCommand: SlashCommand = {
  name: 'ls',
  altNames: ['dir'],
  description: 'List files in a directory. Usage: /ls [path]',
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

    const [targetPath] = parseCommandArgs(args);
    const resolved = resolveWorkspacePath(config, targetPath);
    const workspaceError = validateWithinWorkspace(config, resolved);
    if (workspaceError) {
      context.ui.addItem(
        { type: MessageType.ERROR, text: workspaceError },
        Date.now(),
      );
      return;
    }

    try {
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: makeWorkspaceRelative(config, resolved),
          },
          Date.now(),
        );
        return;
      }

      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      const fileService = config.getFileService();
      const visibleEntries = entries.filter((entry) => {
        const entryPath = path.join(resolved, entry.name);
        return !fileService.shouldPerplexityIgnoreFile(entryPath);
      });
      const lines = visibleEntries
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) {
            return a.isDirectory() ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, 100)
        .map((e) => `  ${e.name}${e.isDirectory() ? '/' : ''}`);

      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `# ${makeWorkspaceRelative(config, resolved)}\n${lines.join('\n') || '(empty)'}`,
        },
        Date.now(),
      );
    } catch (err) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Cannot list ${resolved}: ${err instanceof Error ? err.message : String(err)}`,
        },
        Date.now(),
      );
    }
  },
};
