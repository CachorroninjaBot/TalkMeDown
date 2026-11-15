import { describe, expect, it } from 'vitest';
import type { WireColor } from '@talk-me-down/shared';
import {
  allModulesSolved,
  buttonAction,
  cutWire,
  generateBomb,
  pressButton,
  pressKeypad,
  releaseButton,
  releaseDigit,
  serialHasVowel,
  serialLastDigitOdd,
  toPublicBomb,
  wireRuleIndex,
} from './bomb.js';

const colors = (values: string) => values.split(' ') as WireColor[];

describe('wire rules', () => {
  it('handles four-wire branches', () => {
    expect(wireRuleIndex(colors('red blue red white'), true)).toBe(2);
    expect(wireRuleIndex(colors('blue black white yellow'), false)).toBe(0);
    expect(wireRuleIndex(colors('blue black white red'), false)).toBe(0);
    expect(wireRuleIndex(colors('yellow black yellow white'), false)).toBe(3);
    expect(wireRuleIndex(colors('black white red white'), false)).toBe(1);
  });

  it('handles five-wire branches', () => {
    expect(wireRuleIndex(colors('red blue white yellow black'), true)).toBe(3);
    expect(wireRuleIndex(colors('red yellow yellow white blue'), false)).toBe(0);
    expect(wireRuleIndex(colors('red yellow white blue white'), false)).toBe(1);
    expect(wireRuleIndex(colors('black red white blue white'), false)).toBe(0);
  });

  it('handles six-wire branches', () => {
    expect(wireRuleIndex(colors('red blue white black white red'), true)).toBe(2);
    expect(wireRuleIndex(colors('red yellow white white blue black'), false)).toBe(3);
    expect(wireRuleIndex(colors('black blue white black blue black'), false)).toBe(5);
    expect(wireRuleIndex(colors('red yellow yellow black white black'), false)).toBe(1);
  });
});

describe('button rules', () => {
  it('decides press or hold', () => {
    expect(buttonAction('blue', 'abort', 0, false)).toBe('hold');
    expect(buttonAction('red', 'detonate', 2, false)).toBe('press');
    expect(buttonAction('white', 'press', 0, true)).toBe('hold');
    expect(buttonAction('blue', 'press', 3, false)).toBe('press');
    expect(buttonAction('yellow', 'press', 0, false)).toBe('hold');
    expect(buttonAction('red', 'hold', 0, false)).toBe('press');
    expect(buttonAction('white', 'press', 0, false)).toBe('hold');
  });

  it('maps strip colors to release digits', () => {
    expect(releaseDigit('blue')).toBe('4');
    expect(releaseDigit('white')).toBe('1');
    expect(releaseDigit('yellow')).toBe('5');
    expect(releaseDigit('red')).toBe('7');
  });

  it('holds, strikes on a quick release and solves on the right digit', () => {
    const bomb = generateBomb(7);
    bomb.button = {
      color: 'yellow',
      label: 'press',
      strip: 'blue',
      solved: false,
      holding: false,
      holdStartedAt: null,
    };

    expect(pressButton(bomb, 1_000).status).toBe('holding');
    expect(releaseButton(bomb, 1_100, 40).status).toBe('strike');

    expect(pressButton(bomb, 2_000).status).toBe('holding');
    expect(releaseButton(bomb, 2_400, 40).status).toBe('solved');
    expect(bomb.button.solved).toBe(true);
  });

  it('strikes when the timer does not contain the digit', () => {
    const bomb = generateBomb(9);
    bomb.button = {
      color: 'yellow',
      label: 'press',
      strip: 'white',
      solved: false,
      holding: false,
      holdStartedAt: null,
    };

    pressButton(bomb, 0);
    expect(releaseButton(bomb, 500, 42).status).toBe('strike');
  });
});

describe('keypad', () => {
  it('accepts the column order and rejects a wrong symbol', () => {
    const bomb = generateBomb(13);
    const order = bomb.keypad.correctOrder;

    expect(pressKeypad(bomb, order[0]!).status).toBe('progress');
    expect(pressKeypad(bomb, order[0]!).status).toBe('strike');
    expect(bomb.keypad.entered).toEqual([]);

    expect(pressKeypad(bomb, order[0]!).status).toBe('progress');
    expect(pressKeypad(bomb, order[1]!).status).toBe('progress');
    expect(pressKeypad(bomb, order[2]!).status).toBe('progress');
    expect(pressKeypad(bomb, order[3]!).status).toBe('solved');
    expect(bomb.keypad.solved).toBe(true);
  });
});

describe('wires module', () => {
  it('solves only on the correct wire', () => {
    const bomb = generateBomb(21);
    const wrong = bomb.wires.findIndex((_, index) => index !== bomb.wireCorrectIndex);
    expect(cutWire(bomb, bomb.wires[wrong]!.id).status).toBe('strike');
    expect(bomb.wiresSolved).toBe(false);
    expect(cutWire(bomb, bomb.wires[bomb.wireCorrectIndex]!.id).status).toBe('solved');
    expect(bomb.wiresSolved).toBe(true);
  });

  it('ignores an already cut wire', () => {
    const bomb = generateBomb(22);
    cutWire(bomb, bomb.wires[0]!.id);
    expect(cutWire(bomb, bomb.wires[0]!.id).status).toBe('ignored');
  });
});

describe('generation and public state', () => {
  it('is deterministic for the same seed', () => {
    expect(generateBomb(42)).toEqual(generateBomb(42));
    expect(generateBomb(42)).not.toEqual(generateBomb(43));
  });

  it('generates a valid serial and keypad', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const bomb = generateBomb(seed);
      expect(bomb.serial).toMatch(/^[A-Z][A-Z2-9]{4}\d$/);
      expect(bomb.serial).toHaveLength(6);
      expect(bomb.wires.length).toBeGreaterThanOrEqual(4);
      expect(bomb.wires.length).toBeLessThanOrEqual(6);
      expect(new Set(bomb.keypad.symbols).size).toBe(4);
      expect([...bomb.keypad.symbols].sort()).toEqual([...bomb.keypad.correctOrder].sort());
    }
  });

  it('never exposes the answers', () => {
    const bomb = generateBomb(5);
    const view = toPublicBomb(bomb, true);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('correctOrder');
    expect(serialized).not.toContain('wireCorrectIndex');
    expect(view.button?.strip).toBeNull();
    expect(Object.keys(view.keypad!).sort()).toEqual(['entered', 'solved', 'symbols']);
    expect(allModulesSolved(bomb)).toBe(false);
  });

  it('detects vowels and the last serial digit', () => {
    expect(serialHasVowel('AB3T9K')).toBe(true);
    expect(serialHasVowel('BC3T9K')).toBe(false);
    expect(serialLastDigitOdd('A3T9K1')).toBe(true);
    expect(serialLastDigitOdd('A3T9K2')).toBe(false);
  });
});
