import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

export const statusCommand: SlashCommand = {
  name: 'status',
  altNames: ['st'],
  description: 'Show current session status (model, mode, auth)',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext): Promise<MessageActionReturn> => {
    const { services } = context;
    const { config } = services;

    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }

    const contentGeneratorConfig = config.getContentGeneratorConfig();
    const model = contentGeneratorConfig?.model || 'unknown';
    const authType = contentGeneratorConfig?.authType || 'unknown';

    const lines = [
      `Model: ${model}`,
      `Auth: ${authType}`,
      `Session: ${config.getSessionId?.() || 'N/A'}`,
    ];

    return {
      type: 'message',
      messageType: 'info',
      content: lines.join('\n'),
    };
  },
};
