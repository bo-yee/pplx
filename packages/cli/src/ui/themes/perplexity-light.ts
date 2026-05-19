/**
 * @license
 * Copyright 2025 Perplexity AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from './theme.js';
import type { SemanticColors } from './semantic-tokens.js';

const perplexityLightColors: ColorsTheme = {
  type: 'light',
  Background: '#f0f8f8',
  Foreground: '#1a2a2e',
  LightBlue: '#1a9aaa',
  AccentBlue: '#1a9aaa',
  AccentPurple: '#3aaa7a',
  AccentCyan: '#2aa882',
  AccentGreen: '#2aa882',
  AccentYellow: '#1a9aaa',
  AccentRed: '#d4506a',
  DiffAdded: '#2aa882',
  DiffRemoved: '#d4506a',
  Comment: '#7a9a9e',
  Gray: '#b0d0d4',
  GradientColors: ['#1a9aaa', '#2aa882'],
};

const perplexityLightSemanticColors: SemanticColors = {
  text: {
    primary: '#1a2a2e',
    secondary: '#7a9a9e',
    link: '#1a9aaa',
    accent: '#3aaa7a',
  },
  background: {
    primary: '#f0f8f8',
    diff: {
      added: '#2aa882',
      removed: '#d4506a',
    },
  },
  border: {
    default: '#b0d0d4',
    focused: '#1a9aaa',
  },
  ui: {
    comment: '#7a9a9e',
    symbol: '#b0d0d4',
    gradient: ['#1a9aaa', '#2aa882'],
  },
  status: {
    error: '#d4506a',
    success: '#2aa882',
    warning: '#1a9aaa',
  },
};

export const PerplexityLight: Theme = new Theme(
  'Perplexity Light',
  'light',
  {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: perplexityLightColors.Background,
      color: perplexityLightColors.Foreground,
    },
    'hljs-comment': {
      color: perplexityLightColors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: perplexityLightColors.AccentCyan,
      fontStyle: 'italic',
    },
    'hljs-string': {
      color: perplexityLightColors.AccentGreen,
    },
    'hljs-constant': {
      color: perplexityLightColors.AccentCyan,
    },
    'hljs-number': {
      color: perplexityLightColors.AccentPurple,
    },
    'hljs-keyword': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-selector-tag': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-attribute': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-variable': {
      color: perplexityLightColors.Foreground,
    },
    'hljs-variable.language': {
      color: perplexityLightColors.LightBlue,
      fontStyle: 'italic',
    },
    'hljs-title': {
      color: perplexityLightColors.AccentBlue,
    },
    'hljs-section': {
      color: perplexityLightColors.AccentGreen,
      fontWeight: 'bold',
    },
    'hljs-type': {
      color: perplexityLightColors.LightBlue,
    },
    'hljs-class .hljs-title': {
      color: perplexityLightColors.AccentBlue,
    },
    'hljs-tag': {
      color: perplexityLightColors.LightBlue,
    },
    'hljs-name': {
      color: perplexityLightColors.AccentBlue,
    },
    'hljs-builtin-name': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-meta': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-symbol': {
      color: perplexityLightColors.AccentRed,
    },
    'hljs-bullet': {
      color: perplexityLightColors.AccentYellow,
    },
    'hljs-regexp': {
      color: perplexityLightColors.AccentCyan,
    },
    'hljs-link': {
      color: perplexityLightColors.LightBlue,
    },
    'hljs-deletion': {
      color: perplexityLightColors.AccentRed,
    },
    'hljs-addition': {
      color: perplexityLightColors.AccentGreen,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-literal': {
      color: perplexityLightColors.AccentCyan,
    },
    'hljs-built_in': {
      color: perplexityLightColors.AccentRed,
    },
    'hljs-doctag': {
      color: perplexityLightColors.AccentRed,
    },
    'hljs-template-variable': {
      color: perplexityLightColors.AccentCyan,
    },
    'hljs-selector-id': {
      color: perplexityLightColors.AccentRed,
    },
  },
  perplexityLightColors,
  perplexityLightSemanticColors,
);
