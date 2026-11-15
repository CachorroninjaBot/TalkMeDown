import {
  BUTTON_COLORS,
  BUTTON_LABELS,
  HOLD_MIN_MS,
  KEYPAD_COLUMNS,
  STRIP_COLORS,
  WIRE_COLORS,
} from '@talk-me-down/shared';
import type {
  BombContext,
  ButtonColor,
  ButtonLabel,
  ModuleStatus,
  PublicBomb,
  StripColor,
  WireColor,
} from '@talk-me-down/shared';

export class GameError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'INVALID_PHASE'
      | 'NOT_HOST'
      | 'NOT_DEFUSER'
      | 'ROOM_NOT_FOUND'
      | 'ROOM_FULL'
      | 'ROOM_IN_PROGRESS'
      | 'ROOM_LIMIT'
      | 'NOT_ENOUGH_PLAYERS'
      | 'PLAYER_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export type ModuleActionStatus = 'solved' | 'strike' | 'progress' | 'holding' | 'ignored';

export interface ModuleAction {
  status: ModuleActionStatus;
}

export interface Wire {
  id: string;
  color: WireColor;
  cut: boolean;
}

export interface BombButton {
  color: ButtonColor;
  label: ButtonLabel;
  strip: StripColor;
  solved: boolean;
  holding: boolean;
  holdStartedAt: number | null;
}

export interface BombKeypad {
  symbols: string[];
  correctOrder: string[];
  entered: string[];
  solved: boolean;
}

export interface Bomb {
  serial: string;
  batteries: number;
  wires: Wire[];
  wireCorrectIndex: number;
  wiresSolved: boolean;
  button: BombButton;
  keypad: BombKeypad;
}

const SERIAL_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const SERIAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[pickInt(rng, 0, values.length - 1)]!;
}

function shuffle<T>(rng: () => number, values: readonly T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = pickInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function generateSerial(rng: () => number): string {
  let serial = pick(rng, SERIAL_LETTERS.split(''));
  for (let i = 0; i < 4; i += 1) {
    serial += pick(rng, SERIAL_CHARS.split(''));
  }
  serial += String(pickInt(rng, 0, 9));
  return serial;
}

export function serialHasVowel(serial: string): boolean {
  return [...serial.toUpperCase()].some((char) => VOWELS.has(char));
}

export function serialLastDigit(serial: string): number {
  const digits = serial.match(/\d/g);
  return digits && digits.length > 0 ? Number(digits[digits.length - 1]) : 0;
}

export function serialLastDigitOdd(serial: string): boolean {
  return serialLastDigit(serial) % 2 === 1;
}

function countColor(colors: readonly WireColor[], color: WireColor): number {
  return colors.filter((value) => value === color).length;
}

function lastColorIndex(colors: readonly WireColor[], color: WireColor): number {
  for (let i = colors.length - 1; i >= 0; i -= 1) {
    if (colors[i] === color) return i;
  }
  return -1;
}

/** Index of the one wire that may be cut, following the manual rules. */
export function wireRuleIndex(colors: readonly WireColor[], lastDigitOdd: boolean): number {
  const red = countColor(colors, 'red');
  const blue = countColor(colors, 'blue');
  const yellow = countColor(colors, 'yellow');
  const black = countColor(colors, 'black');
  const white = countColor(colors, 'white');

  if (colors.length === 4) {
    if (red > 1 && lastDigitOdd) return lastColorIndex(colors, 'red');
    if (colors[3] === 'yellow' && red === 0) return 0;
    if (blue === 1) return 0;
    if (yellow > 1) return 3;
    return 1;
  }

  if (colors.length === 5) {
    if (colors[4] === 'black' && lastDigitOdd) return 3;
    if (red === 1 && yellow > 1) return 0;
    if (black === 0) return 1;
    return 0;
  }

  if (colors.length === 6) {
    if (yellow === 0 && lastDigitOdd) return 2;
    if (yellow === 1 && white > 1) return 3;
    if (red === 0) return colors.length - 1;
    return 1;
  }

  throw new Error(`unsupported wire count: ${colors.length}`);
}

export function buttonAction(
  color: ButtonColor,
  label: ButtonLabel,
  batteries: number,
  hasVowel: boolean,
): 'press' | 'hold' {
  if (color === 'blue' && label === 'abort') return 'hold';
  if (batteries > 1 && label === 'detonate') return 'press';
  if (color === 'white' && hasVowel) return 'hold';
  if (batteries > 2 && !hasVowel) return 'press';
  if (color === 'yellow') return 'hold';
  if (color === 'red' && label === 'hold') return 'press';
  return 'hold';
}

export function releaseDigit(strip: StripColor): string {
  if (strip === 'blue') return '4';
  if (strip === 'white') return '1';
  if (strip === 'yellow') return '5';
  return '7';
}

export function generateBomb(seed: number): Bomb {
  const rng = createRng(seed);
  const serial = generateSerial(rng);
  const batteries = pickInt(rng, 0, 4);
  const wireCount = pickInt(rng, 4, 6);
  const wires: Wire[] = Array.from({ length: wireCount }, (_, index) => ({
    id: `w${index + 1}`,
    color: pick(rng, WIRE_COLORS),
    cut: false,
  }));
  const wireCorrectIndex = wireRuleIndex(
    wires.map((wire) => wire.color),
    serialLastDigitOdd(serial),
  );

  const column = KEYPAD_COLUMNS[pickInt(rng, 0, KEYPAD_COLUMNS.length - 1)]!;
  const keypad: BombKeypad = {
    symbols: shuffle(rng, column),
    correctOrder: [...column],
    entered: [],
    solved: false,
  };

  return {
    serial,
    batteries,
    wires,
    wireCorrectIndex,
    wiresSolved: false,
    button: {
      color: pick(rng, BUTTON_COLORS),
      label: pick(rng, BUTTON_LABELS),
      strip: pick(rng, STRIP_COLORS),
      solved: false,
      holding: false,
      holdStartedAt: null,
    },
    keypad,
  };
}

export function cutWire(bomb: Bomb, wireId: string): ModuleAction {
  if (bomb.wiresSolved) return { status: 'ignored' };
  const index = bomb.wires.findIndex((wire) => wire.id === wireId);
  const wire = bomb.wires[index];
  if (!wire || wire.cut) return { status: 'ignored' };

  wire.cut = true;
  if (index === bomb.wireCorrectIndex) {
    bomb.wiresSolved = true;
    return { status: 'solved' };
  }
  return { status: 'strike' };
}

export function pressButton(bomb: Bomb, now: number): ModuleAction {
  const button = bomb.button;
  if (button.solved || button.holding) return { status: 'ignored' };

  const action = buttonAction(
    button.color,
    button.label,
    bomb.batteries,
    serialHasVowel(bomb.serial),
  );
  if (action === 'press') {
    button.solved = true;
    return { status: 'solved' };
  }

  button.holding = true;
  button.holdStartedAt = now;
  return { status: 'holding' };
}

export function releaseButton(
  bomb: Bomb,
  now: number,
  remainingSeconds: number,
): ModuleAction {
  const button = bomb.button;
  if (button.solved || !button.holding) return { status: 'ignored' };

  const startedAt = button.holdStartedAt ?? now;
  button.holding = false;
  button.holdStartedAt = null;

  if (now - startedAt < HOLD_MIN_MS) return { status: 'strike' };

  const digit = releaseDigit(button.strip);
  const seconds = Math.max(0, Math.ceil(remainingSeconds));
  if (String(seconds).includes(digit)) {
    button.solved = true;
    return { status: 'solved' };
  }
  return { status: 'strike' };
}

export function pressKeypad(bomb: Bomb, symbol: string): ModuleAction {
  const keypad = bomb.keypad;
  if (keypad.solved) return { status: 'ignored' };
  if (!keypad.symbols.includes(symbol)) return { status: 'ignored' };

  const expected = keypad.correctOrder[keypad.entered.length];
  if (symbol !== expected) {
    keypad.entered = [];
    return { status: 'strike' };
  }

  keypad.entered.push(symbol);
  if (keypad.entered.length === keypad.correctOrder.length) {
    keypad.solved = true;
    return { status: 'solved' };
  }
  return { status: 'progress' };
}

export function moduleStatus(bomb: Bomb): ModuleStatus[] {
  return [
    { id: 'wires', solved: bomb.wiresSolved },
    { id: 'button', solved: bomb.button.solved },
    { id: 'keypad', solved: bomb.keypad.solved },
  ];
}

export function allModulesSolved(bomb: Bomb): boolean {
  return moduleStatus(bomb).every((module) => module.solved);
}

export function bombContext(bomb: Bomb): BombContext {
  return { serial: bomb.serial, batteries: bomb.batteries };
}

export function toPublicBomb(bomb: Bomb, reveal: boolean): PublicBomb {
  if (!reveal) {
    return { wires: null, button: null, keypad: null };
  }

  return {
    wires: bomb.wires.map((wire) => ({ id: wire.id, color: wire.color, cut: wire.cut })),
    button: {
      color: bomb.button.color,
      label: bomb.button.label,
      solved: bomb.button.solved,
      holding: bomb.button.holding,
      strip: bomb.button.holding ? bomb.button.strip : null,
    },
    keypad: {
      symbols: [...bomb.keypad.symbols],
      entered: [...bomb.keypad.entered],
      solved: bomb.keypad.solved,
    },
  };
}
