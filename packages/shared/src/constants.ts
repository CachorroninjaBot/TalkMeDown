export const GAME_ID = 'talk-me-down';
export const GAME_NAME = 'Talk Me Down';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const BRIEFING_SECONDS = 8;
export const BOMB_SECONDS = 300;
export const MAX_STRIKES = 3;
export const HOLD_MIN_MS = 250;

export const MAX_NAME_LENGTH = 24;
export const MAX_ROOM_ID_LENGTH = 64;
export const ROOM_ID_MIN_LENGTH = 3;

export const DEFAULT_LOCALE = 'en-US';
export const FALLBACK_LOCALE = 'en-US';

export const DISCORD_LOCALES = [
  'id',
  'da',
  'de',
  'en-GB',
  'en-US',
  'es-ES',
  'es-419',
  'fr',
  'hr',
  'it',
  'lt',
  'hu',
  'nl',
  'no',
  'pl',
  'pt-BR',
  'ro',
  'fi',
  'sv-SE',
  'vi',
  'tr',
  'cs',
  'el',
  'bg',
  'ru',
  'uk',
  'hi',
  'th',
  'zh-CN',
  'ja',
  'zh-TW',
  'ko',
] as const;

export const RTL_LOCALES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'] as const;

export const PLAYER_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
] as const;

export const WIRE_COLORS = ['red', 'blue', 'yellow', 'black', 'white'] as const;
export const BUTTON_COLORS = ['blue', 'white', 'yellow', 'red'] as const;
export const BUTTON_LABELS = ['abort', 'detonate', 'hold', 'press'] as const;
export const STRIP_COLORS = ['blue', 'white', 'yellow', 'red'] as const;

/**
 * Six fixed symbol columns. The keypad shows the four symbols of one column in
 * a shuffled order; the matching column gives the order to press them.
 */
export const KEYPAD_COLUMNS = [
  ['▲', '▼', '◆', '●'],
  ['■', '□', '○', '◇'],
  ['★', '☆', '✦', '✧'],
  ['♪', '♫', '♩', '♬'],
  ['✚', '✖', '✱', '✳'],
  ['⬟', '⬢', '⬣', '⬤'],
] as const;
