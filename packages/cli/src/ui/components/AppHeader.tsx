/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box } from 'ink';
import { Header } from './Header.js';
import { Tips } from './Tips.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useUIState } from '../contexts/UIStateContext.js';

interface AppHeaderProps {
  version: string;
}

export const AppHeader = ({ version }: AppHeaderProps) => {
  const settings = useSettings();
  const config = useConfig();
  const { nightly } = useUIState();

  const showBanner = !(
    settings.merged.ui?.hideBanner || config.getScreenReader()
  );
  const showStatus = !(
    settings.merged.ui?.hideTips || config.getScreenReader()
  );

  return (
    <Box flexDirection="row" alignItems="center" marginBottom={1}>
      {showBanner && (
        <Box width={34} flexShrink={0} marginRight={4}>
          <Header version={version} nightly={nightly} />
        </Box>
      )}
      {showStatus && (
        <Box flexGrow={1}>
          <Tips config={config} version={version} />
        </Box>
      )}
    </Box>
  );
};
