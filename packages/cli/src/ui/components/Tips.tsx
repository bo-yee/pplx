/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { type Config } from '@perplexity-cli/perplexity-cli-core';
import os from 'node:os';

interface TipsProps {
  config: Config;
  version: string;
}

const shortenPath = (value: string, maxLength = 58) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `...${value.slice(value.length - maxLength + 3)}`;
};

export const Tips: React.FC<TipsProps> = ({ config, version }) => {
  const username = os.userInfo().username || 'user';
  const hostname = os.hostname() || 'thinkpad';
  const workspace = shortenPath(config.getTargetDir());

  return (
    <Box flexDirection="column">
      <Text color={theme.text.primary}>
        Welcome to Perplexity CLI v{version}
      </Text>
      <Text color={theme.text.primary}>
        Session: {username}@{hostname} ~ <Text color={theme.text.link}>$</Text>
      </Text>
      <Text> </Text>
      <Text color={theme.text.link}>{'> status'}</Text>
      <Text color={theme.text.primary}>System: Operational</Text>
      <Text color={theme.text.primary}>Web session: Connected</Text>
      <Text color={theme.text.primary}>Workspace: {workspace}</Text>
      <Text color={theme.text.primary}>Local path context: ready</Text>
    </Box>
  );
};
