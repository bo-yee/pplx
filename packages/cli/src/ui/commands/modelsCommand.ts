import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { AuthType } from '@perplexity-cli/perplexity-cli-core';
import {
  AVAILABLE_MODELS_PERPLEXITY,
  AVAILABLE_MODELS_WEB_SESSION,
} from '../models/availableModels.js';

export const modelsCommand: SlashCommand = {
  name: 'models',
  altNames: ['model-list'],
  description: 'List all available models',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext): Promise<MessageActionReturn> => {
    const { services } = context;
    const { config } = services;

    const authType = config?.getContentGeneratorConfig()?.authType;
    const models =
      authType === AuthType.WEB_SESSION
        ? AVAILABLE_MODELS_WEB_SESSION
        : AVAILABLE_MODELS_PERPLEXITY;

    const currentModel = config?.getContentGeneratorConfig()?.model || '';

    const lines = models.map((m) => {
      const marker = m.id === currentModel ? ' * ' : '   ';
      const desc = m.description ? ` - ${m.description}` : '';
      return `${marker}${m.label.padEnd(30)} ${m.id}${desc}`;
    });

    return {
      type: 'message',
      messageType: 'info',
      content: `Available models (* = current):\n${lines.join('\n')}`,
    };
  },
};
