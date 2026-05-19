import type {
  SlashCommand,
  CommandContext,
} from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';

export const historyCommand: SlashCommand = {
  name: 'history',
  altNames: ['h'],
  description: 'Show conversation history',
  kind: CommandKind.BUILT_IN,
  action: (context: CommandContext, _args: string): void => {
    const { ui, session } = context;

    // The history is managed by the UI - just trigger a display
    // In the Perplexity CLI, history items are already visible in the UI
    // This command serves as a quick way to review
    ui.addItem(
      {
        type: MessageType.INFO,
        text: `Session has been running since ${session.stats.sessionStartTime?.toLocaleString() || 'unknown'}. Scroll up to review conversation history.`,
      },
      Date.now(),
    );
  },
};
