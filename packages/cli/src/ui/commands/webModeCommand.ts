import type {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

const VALID_MODES = ['auto', 'pro', 'reasoning', 'deep research'] as const;
type WebMode = (typeof VALID_MODES)[number];

const MODE_TO_MODEL: Record<WebMode, string> = {
  auto: 'sonar',
  pro: 'sonar-pro',
  reasoning: 'sonar-reasoning-pro',
  'deep research': 'sonar-deep-research',
};

export const webModeCommand: SlashCommand = {
  name: 'mode',
  description: 'Set Perplexity search mode (auto, pro, reasoning, deep research)',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    args: string,
  ): Promise<MessageActionReturn> => {
    const { services } = context;
    const { config } = services;

    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }

    const trimmedArgs = args.trim();

    // Show current mode if no args
    if (!trimmedArgs) {
      const contentGeneratorConfig = config.getContentGeneratorConfig();
      const currentModel = contentGeneratorConfig?.model || 'sonar';
      const currentMode =
        Object.entries(MODE_TO_MODEL).find(([, m]) => m === currentModel)?.[0] ||
        'auto';
      return {
        type: 'message',
        messageType: 'info',
        content: `Current mode: ${currentMode}\nAvailable modes: ${VALID_MODES.join(', ')}`,
      };
    }

    const requestedMode = trimmedArgs.toLowerCase() as WebMode;
    if (!VALID_MODES.includes(requestedMode)) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Invalid mode: ${trimmedArgs}. Valid options: ${VALID_MODES.join(', ')}`,
      };
    }

    // Switch model to match the mode
    const targetModel = MODE_TO_MODEL[requestedMode];
    try {
      await config.setModel?.(targetModel);
    } catch {
      // setModel may not exist, update config directly
      const contentGeneratorConfig = config.getContentGeneratorConfig();
      if (contentGeneratorConfig) {
        (contentGeneratorConfig as { model: string }).model = targetModel;
      }
    }

    return {
      type: 'message',
      messageType: 'info',
      content: `Mode set to: ${requestedMode} (model: ${targetModel})`,
    };
  },
  completion: async (
    _context: CommandContext,
    partialArg: string,
  ): Promise<string[]> => {
    const partial = partialArg.toLowerCase();
    return VALID_MODES.filter((mode) => mode.startsWith(partial));
  },
};
