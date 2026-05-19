/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';
import type { SemanticColors } from './semantic-tokens.js';

const perplexityDarkColors: ColorsTheme = {
  type: 'dark',
  Background: '#062E5F',
  Foreground: '#EAF7FF',
  LightBlue: '#20E0D2',
  AccentBlue: '#20E0D2',
  AccentPurple: '#7FB8CC',
  AccentCyan: '#20E0D2',
  AccentGreen: '#2FFFD0',
  AccentYellow: '#20E0D2',
  AccentRed: '#FF6B6B',
  DiffAdded: '#2FFFD0',
  DiffRemoved: '#FF6B6B',
  Comment: '#7FB8CC',
  Gray: '#155B74',
  GradientColors: ['#20E0D2', '#2FFFD0'],
};

const perplexityDarkSemanticColors: SemanticColors = {
  text: {
    primary: '#EAF7FF',
    secondary: '#7FB8CC',
    link: '#20E0D2',
    accent: '#20E0D2',
  },
  background: {
    primary: '#062E5F',
    diff: {
      added: '#2FFFD0',
      removed: '#FF6B6B',
    },
  },
  border: {
    default: '#155B74',
    focused: '#20E0D2',
  },
  ui: {
    comment: '#7FB8CC',
    symbol: '#155B74',
    gradient: ['#20E0D2', '#2FFFD0'],
  },
  status: {
    error: '#FF6B6B',
    success: '#2FFFD0',
    warning: '#20E0D2',
  },
};

export const PerplexityDark: Theme = new Theme(
  'Perplexity Dark',
  'dark',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: perplexityDarkColors.Background,
      color: perplexityDarkColors.Foreground,
    },
    'hljs-keyword': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-literal': {
      color: perplexityDarkColors.AccentPurple,
    },
    'hljs-symbol': {
      color: perplexityDarkColors.AccentCyan,
    },
    'hljs-name': {
      color: perplexityDarkColors.LightBlue,
    },
    'hljs-link': {
      color: perplexityDarkColors.AccentBlue,
    },
    'hljs-function .hljs-keyword': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-subst': {
      color: perplexityDarkColors.Foreground,
    },
    'hljs-string': {
      color: perplexityDarkColors.AccentGreen,
    },
    'hljs-title': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-type': {
      color: perplexityDarkColors.AccentBlue,
    },
    'hljs-attribute': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-bullet': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-addition': {
      color: perplexityDarkColors.AccentGreen,
    },
    'hljs-variable': {
      color: perplexityDarkColors.Foreground,
    },
    'hljs-template-tag': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-template-variable': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-comment': {
      color: perplexityDarkColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: perplexityDarkColors.AccentCyan,
      fontStyle: 'italic',
    },
    'hljs-deletion': {
      color: perplexityDarkColors.AccentRed,
    },
    'hljs-meta': {
      color: perplexityDarkColors.AccentYellow,
    },
    'hljs-doctag': {
      fontWeight: 'bold',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
  },
  perplexityDarkColors,
  perplexityDarkSemanticColors,
);
