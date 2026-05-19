import {
  type SlashCommand,
  type CommandContext,
  CommandKind,
} from './types.js';
import { MessageType } from '../types.js';
import * as fs from 'node:fs';
import {
  makeWorkspaceRelative,
  parseCommandArgs,
  resolveWorkspacePath,
  validateWithinWorkspace,
} from './fileCommandUtils.js';

export const readCommand: SlashCommand = {
  name: 'read',
  altNames: ['cat'],
  description: 'Read a file. Usage: /read <path> [start_line] [num_lines]',
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
        {
          type: MessageType.ERROR,
          text: 'Usage: /read <path> [start_line] [num_lines]',
        },
        Date.now(),
      );
      return;
    }

    const filePath = resolveWorkspacePath(config, parts[0]);
    const workspaceError = validateWithinWorkspace(config, filePath);
    if (workspaceError) {
      context.ui.addItem(
        { type: MessageType.ERROR, text: workspaceError },
        Date.now(),
      );
      return;
    }

    const startLine = Math.max(1, parseInt(parts[1] || '1', 10));
    const numLines = Math.min(200, Math.max(1, parseInt(parts[2] || '80', 10)));

    try {
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        context.ui.addItem(
          { type: MessageType.ERROR, text: `Not a file: ${filePath}` },
          Date.now(),
        );
        return;
      }

      if (config.getFileService().shouldPerplexityIgnoreFile(filePath)) {
        context.ui.addItem(
          {
            type: MessageType.ERROR,
            text: `File is ignored by .perplexityignore: ${makeWorkspaceRelative(config, filePath)}`,
          },
          Date.now(),
        );
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const allLines = content.split('\n');
      const selected = allLines
        .slice(startLine - 1, startLine - 1 + numLines)
        .map((line, i) => `${String(startLine + i).padStart(5)}  ${line}`)
        .join('\n');

      const truncated =
        startLine - 1 + numLines < allLines.length
          ? `\n... (${allLines.length - startLine - numLines + 1} more lines)`
          : '';

      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `# ${makeWorkspaceRelative(config, filePath)}\n${selected}${truncated}`,
        },
        Date.now(),
      );
    } catch (err) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Cannot read ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        },
        Date.now(),
      );
    }
  },
};
