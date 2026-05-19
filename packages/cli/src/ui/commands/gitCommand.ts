import { type SlashCommand, type CommandContext, CommandKind } from './types.js';
import { MessageType } from '../types.js';
import { execSync } from 'node:child_process';

export const gitCommand: SlashCommand = {
  name: 'git',
  description: 'Show git status. Usage: /git [status|log|diff]',
  kind: CommandKind.BUILT_IN,
  action: (context: CommandContext, args: string): void => {
    const sub = args.trim() || 'status';

    const commands: Record<string, string> = {
      status: 'git status --short',
      log: 'git log --oneline -15',
      diff: 'git diff --stat',
    };

    const cmd = commands[sub];
    if (!cmd) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Unknown git subcommand: ${sub}. Available: ${Object.keys(commands).join(', ')}`,
        },
        Date.now(),
      );
      return;
    }

    try {
      const output = execSync(cmd, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 8000,
      }).trim();

      context.ui.addItem(
        { type: MessageType.INFO, text: output || '(clean)' },
        Date.now(),
      );
    } catch (err) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `git error: ${err instanceof Error ? err.message : String(err)}`,
        },
        Date.now(),
      );
    }
  },
};
