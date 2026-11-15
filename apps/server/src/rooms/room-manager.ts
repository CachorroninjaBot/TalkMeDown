import { randomInt } from 'node:crypto';
import type { Logger } from 'pino';
import {
  BRIEFING_SECONDS,
  BOMB_SECONDS,
  DEFAULT_LOCALE,
  GAME_ID,
  MAX_PLAYERS,
  MAX_STRIKES,
  MIN_PLAYERS,
  PLAYER_COLORS,
  resolveLocale,
} from '@talk-me-down/shared';
import type {
  GameEventKind,
  ManualPageId,
  PublicRoomState,
  Role,
  RoomErrorPayload,
  ServerToClientEvents,
  SessionUser,
} from '@talk-me-down/shared';
import {
  GameError,
  allModulesSolved,
  bombContext,
  cutWire as cutWireAction,
  generateBomb,
  moduleStatus,
  pressButton as pressButtonAction,
  pressKeypad as pressKeypadAction,
  releaseButton as releaseButtonAction,
  toPublicBomb as toPublicBombView,
} from '@talk-me-down/game-core';
import type { ModuleAction } from '@talk-me-down/game-core';
import type { AppConfig } from '../config.js';
import type { RoomStore } from './room-store.js';
import type { EnginePlayer, EngineState } from './state.js';

const MODULE_IDS: readonly ManualPageId[] = ['wires', 'button', 'keypad'];
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const SNAPSHOT_INTERVAL_MS = 5_000;

interface RuntimeRoom {
  state: EngineState;
  emptySince: number | null;
  lastSavedAt: number;
}

export interface RoomManagerDeps {
  store: RoomStore;
  config: AppConfig;
  logger: Logger;
  availableLocales: readonly string[];
  emitToSocket: (
    socketId: string,
    event: keyof ServerToClientEvents,
    payload: unknown,
  ) => void;
}

export interface RoomManagerOptions {
  now?: () => number;
  autoTick?: boolean;
}

export interface JoinRoomParams {
  roomId: string;
  user: SessionUser;
  socketId: string;
  preferredLocale?: string;
  mustExist?: boolean;
}

export interface JoinRoomResult {
  internalId: string;
  joinCode: string;
}

export class RoomManager {
  private readonly rooms = new Map<string, RuntimeRoom>();
  private readonly codes = new Map<string, string>();
  private readonly now: () => number;
  private readonly autoTick: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly deps: RoomManagerDeps,
    options: RoomManagerOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.autoTick = options.autoTick ?? true;
  }

  async init(): Promise<void> {
    const loaded = await this.deps.store.loadAll();
    const now = this.now();

    for (const state of loaded) {
      state.players = state.players.map((player) => ({
        ...player,
        connected: false,
        socketIds: [],
      }));
      const room: RuntimeRoom = {
        state,
        emptySince: state.players.length === 0 ? now : null,
        lastSavedAt: 0,
      };
      this.rooms.set(state.roomId, room);
      this.codes.set(state.joinCode.toUpperCase(), state.roomId);

      if (state.phase === 'briefing') {
        if (state.briefingEndsAt !== null && state.briefingEndsAt <= now) {
          this.beginGame(room, now);
          await this.persist(room);
        }
      } else if (state.phase === 'game') {
        if (state.deadlineAt !== null && state.deadlineAt <= now) {
          this.finish(room, 'exploded', now);
          await this.persist(room);
        }
      }
    }

    if (this.autoTick) {
      this.timer = setInterval(() => {
        void this.tick().catch((error: unknown) => {
          this.deps.logger.warn({ err: error }, 'room tick failed');
        });
      }, 1_000);
    }
  }

  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.deps.store.close();
  }

  resolveRoomId(input: string): string | null {
    const trimmed = input.trim();
    const viaCode = this.codes.get(trimmed.toUpperCase());
    if (viaCode) return viaCode;
    if (this.rooms.has(trimmed)) return trimmed;
    return null;
  }

  assertJoinable(roomIdInput: string, userId: string, mustExist: boolean): void {
    const normalized = roomIdInput.trim();
    const existingId = this.resolveRoomId(normalized);
    const room = existingId ? this.rooms.get(existingId) : undefined;

    if (!room) {
      if (mustExist) throw new GameError('ROOM_NOT_FOUND', 'room not found');
      if (this.rooms.size >= this.deps.config.maxRooms) {
        throw new GameError('ROOM_LIMIT', 'too many rooms right now');
      }
      return;
    }

    if (room.state.players.some((player) => player.id === userId)) return;
    if (room.state.phase === 'briefing' || room.state.phase === 'game') {
      throw new GameError('ROOM_IN_PROGRESS', 'this bomb is already ticking');
    }
    if (room.state.players.length >= MAX_PLAYERS) {
      throw new GameError('ROOM_FULL', 'room is full');
    }
  }

  async join(params: JoinRoomParams): Promise<JoinRoomResult> {
    const normalized = normalizeRoomId(params.roomId);
    const existingId = this.resolveRoomId(normalized);
    const internalId = existingId ?? normalized;
    const now = this.now();
    let room = this.rooms.get(internalId);

    if (!room) {
      if (params.mustExist) throw new GameError('ROOM_NOT_FOUND', 'room not found');
      if (this.rooms.size >= this.deps.config.maxRooms) {
        throw new GameError('ROOM_LIMIT', 'too many rooms right now');
      }

      const joinCode = this.claimCode(normalized);
      const player = this.makePlayer(params.user, now, []);
      player.socketIds.push(params.socketId);
      const state: EngineState = {
        roomId: internalId,
        joinCode,
        phase: 'lobby',
        hostId: player.id,
        defuserId: player.id,
        players: [player],
        contentLocale: resolveLocale(
          params.preferredLocale,
          this.deps.availableLocales,
          DEFAULT_LOCALE,
        ),
        seed: 0,
        bomb: null,
        strikes: 0,
        briefingEndsAt: null,
        deadlineAt: null,
        result: null,
        resultSeconds: null,
        lastEvent: null,
        seq: 0,
        createdAt: now,
        updatedAt: now,
      };
      room = { state, emptySince: null, lastSavedAt: 0 };
      this.rooms.set(internalId, room);
      this.codes.set(joinCode.toUpperCase(), internalId);
    } else {
      const existing = room.state.players.find((player) => player.id === params.user.id);
      if (existing) {
        existing.connected = true;
        if (!existing.socketIds.includes(params.socketId)) {
          existing.socketIds.push(params.socketId);
        }
        existing.name = params.user.name;
        existing.avatarUrl = params.user.avatarUrl;
      } else {
        if (room.state.phase === 'briefing' || room.state.phase === 'game') {
          throw new GameError('ROOM_IN_PROGRESS', 'this bomb is already ticking');
        }
        if (room.state.players.length >= MAX_PLAYERS) {
          throw new GameError('ROOM_FULL', 'room is full');
        }
        const player = this.makePlayer(params.user, now, room.state.players);
        player.socketIds.push(params.socketId);
        room.state.players.push(player);
        if (room.state.players.length === 1) {
          room.state.hostId = params.user.id;
          room.state.defuserId = params.user.id;
        }
      }
      room.emptySince = null;
    }

    this.touch(room, now);
    this.ensureHost(room);
    this.ensureDefuser(room);
    await this.commit(room);

    return { internalId, joinCode: room.state.joinCode };
  }

  async detach(
    roomIdInput: string,
    userId: string,
    socketId: string,
    explicit: boolean,
  ): Promise<void> {
    const room = this.findRoom(roomIdInput);
    if (!room) return;
    const player = room.state.players.find((entry) => entry.id === userId);
    if (!player) return;

    const now = this.now();
    player.socketIds = player.socketIds.filter((id) => id !== socketId);
    if (player.socketIds.length === 0) player.connected = false;

    if (explicit) {
      const wasDefuser = room.state.defuserId === userId;
      room.state.players = room.state.players.filter((entry) => entry.id !== userId);
      if (wasDefuser && (room.state.phase === 'briefing' || room.state.phase === 'game')) {
        this.finish(room, 'aborted', now);
      }
      if (room.state.defuserId === userId) room.state.defuserId = null;
    }

    this.ensureHost(room);
    if (room.state.phase === 'lobby') this.ensureDefuser(room);
    this.touch(room, now);
    this.broadcast(room);
    await this.persist(room);

    if (room.state.players.every((entry) => !entry.connected)) {
      room.emptySince = room.emptySince ?? now;
    }
  }

  async setContentLocale(roomIdInput: string, userId: string, locale: string): Promise<void> {
    const room = this.requireRoom(roomIdInput);
    this.requireHost(room, userId);
    if (room.state.phase !== 'lobby') {
      throw new GameError('INVALID_PHASE', 'the bomb language is locked once the bomb is armed');
    }

    const resolved = resolveLocale(locale, this.deps.availableLocales, DEFAULT_LOCALE);
    if (resolved === room.state.contentLocale) return;
    room.state.contentLocale = resolved;
    this.touch(room, this.now());
    await this.commit(room);
  }

  async setDefuser(roomIdInput: string, userId: string, playerId: string): Promise<void> {
    const room = this.requireRoom(roomIdInput);
    this.requireHost(room, userId);
    if (room.state.phase !== 'lobby') {
      throw new GameError('INVALID_PHASE', 'the defuser is locked once the bomb is armed');
    }
    if (!room.state.players.some((player) => player.id === playerId)) {
      throw new GameError('PLAYER_NOT_FOUND', 'player not found');
    }

    room.state.defuserId = playerId;
    this.touch(room, this.now());
    await this.commit(room);
  }

  async start(roomIdInput: string, userId: string): Promise<void> {
    const room = this.requireRoom(roomIdInput);
    this.requireHost(room, userId);
    if (room.state.phase !== 'lobby') {
      throw new GameError('INVALID_PHASE', 'the game already started');
    }
    if (room.state.players.length < MIN_PLAYERS) {
      throw new GameError('NOT_ENOUGH_PLAYERS', `at least ${MIN_PLAYERS} players are needed`);
    }

    this.ensureDefuser(room);
    this.armBomb(room, this.now());
    await this.commit(room);
  }

  async rematch(roomIdInput: string, userId: string): Promise<void> {
    const room = this.requireRoom(roomIdInput);
    this.requireHost(room, userId);
    if (room.state.phase !== 'result') {
      throw new GameError('INVALID_PHASE', 'the round is not over');
    }

    this.ensureDefuser(room);
    this.armBomb(room, this.now());
    await this.commit(room);
  }

  async cutWire(roomIdInput: string, userId: string, wireId: string): Promise<void> {
    const room = this.requireActionRoom(roomIdInput, userId);
    const action = cutWireAction(room.state.bomb!, wireId);
    await this.applyAction(room, action, 'wires');
  }

  async pressButton(roomIdInput: string, userId: string): Promise<void> {
    const room = this.requireActionRoom(roomIdInput, userId);
    const action = pressButtonAction(room.state.bomb!, this.now());
    await this.applyAction(room, action, 'button');
  }

  async releaseButton(roomIdInput: string, userId: string): Promise<void> {
    const room = this.requireActionRoom(roomIdInput, userId);
    const action = releaseButtonAction(
      room.state.bomb!,
      this.now(),
      this.remainingSeconds(room, this.now()) ?? 0,
    );
    await this.applyAction(room, action, 'button');
  }

  async pressKeypad(roomIdInput: string, userId: string, symbol: string): Promise<void> {
    const room = this.requireActionRoom(roomIdInput, userId);
    const action = pressKeypadAction(room.state.bomb!, symbol);
    await this.applyAction(room, action, 'keypad');
  }

  async tick(): Promise<void> {
    const now = this.now();

    for (const [roomId, room] of [...this.rooms]) {
      if (room.state.phase === 'briefing') {
        if (room.state.briefingEndsAt !== null && now >= room.state.briefingEndsAt) {
          this.beginGame(room, now);
          this.broadcast(room);
          await this.persist(room);
        }
      } else if (room.state.phase === 'game') {
        if (room.state.deadlineAt !== null && now >= room.state.deadlineAt) {
          this.finish(room, 'exploded', now);
          await this.persist(room);
        } else {
          this.broadcast(room);
          if (now - room.lastSavedAt >= SNAPSHOT_INTERVAL_MS) {
            await this.persist(room);
          }
        }
      }

      await this.cleanup(roomId, room, now);
    }
  }

  private async applyAction(
    room: RuntimeRoom,
    action: ModuleAction,
    module: ManualPageId,
  ): Promise<void> {
    const now = this.now();

    if (action.status === 'ignored') return;

    if (action.status === 'holding' || action.status === 'progress') {
      this.touch(room, now);
      await this.commit(room);
      return;
    }

    if (action.status === 'solved') {
      room.state.lastEvent = { kind: 'moduleSolved', module, at: now };
      this.touch(room, now);
      if (allModulesSolved(room.state.bomb!)) {
        this.finish(room, 'defused', now);
      }
      await this.commit(room);
      return;
    }

    room.state.strikes += 1;
    room.state.lastEvent = { kind: 'strike', module, at: now };
    this.touch(room, now);
    if (room.state.strikes >= MAX_STRIKES) {
      this.finish(room, 'exploded', now);
    }
    await this.commit(room);
  }

  private armBomb(room: RuntimeRoom, now: number): void {
    room.state.seed = randomInt(1, 0x7fffffff);
    room.state.bomb = generateBomb(room.state.seed);
    room.state.strikes = 0;
    room.state.phase = 'briefing';
    room.state.briefingEndsAt = now + BRIEFING_SECONDS * 1000;
    room.state.deadlineAt = null;
    room.state.result = null;
    room.state.resultSeconds = null;
    room.state.lastEvent = { kind: 'armed', module: null, at: now };
    this.touch(room, now);
  }

  private beginGame(room: RuntimeRoom, now: number): void {
    room.state.phase = 'game';
    room.state.briefingEndsAt = null;
    room.state.deadlineAt = now + BOMB_SECONDS * 1000;
    this.touch(room, now);
  }

  private finish(room: RuntimeRoom, result: 'defused' | 'exploded' | 'aborted', now: number): void {
    if (room.state.phase === 'result') return;

    room.state.resultSeconds = this.remainingSeconds(room, now) ?? 0;
    room.state.phase = 'result';
    room.state.result = result;
    room.state.briefingEndsAt = null;
    room.state.deadlineAt = null;
    if (room.state.bomb) {
      room.state.bomb.button.holding = false;
      room.state.bomb.button.holdStartedAt = null;
    }
    room.state.lastEvent = {
      kind: result as GameEventKind,
      module: null,
      at: now,
    };
    this.touch(room, now);
    this.broadcast(room);
  }

  private remainingSeconds(room: RuntimeRoom, now: number): number | null {
    if (room.state.phase !== 'game' || room.state.deadlineAt === null) return null;
    return Math.max(0, Math.ceil((room.state.deadlineAt - now) / 1000));
  }

  private requireRoom(roomIdInput: string): RuntimeRoom {
    const room = this.findRoom(roomIdInput);
    if (!room) throw new GameError('ROOM_NOT_FOUND', 'room not found');
    return room;
  }

  private findRoom(roomIdInput: string): RuntimeRoom | undefined {
    const normalized = normalizeRoomId(roomIdInput);
    const internalId = this.resolveRoomId(normalized) ?? normalized;
    return this.rooms.get(internalId);
  }

  private requireHost(room: RuntimeRoom, userId: string): void {
    if (room.state.hostId !== userId) {
      throw new GameError('NOT_HOST', 'only the host can do that');
    }
  }

  private requireActionRoom(roomIdInput: string, userId: string): RuntimeRoom {
    const room = this.requireRoom(roomIdInput);
    if (room.state.phase !== 'game') {
      throw new GameError('INVALID_PHASE', 'the bomb is not ticking');
    }
    if (room.state.defuserId !== userId) {
      throw new GameError('NOT_DEFUSER', 'only the defuser can touch the bomb');
    }
    if (!room.state.bomb) {
      throw new GameError('INVALID_PHASE', 'there is no bomb');
    }
    return room;
  }

  private makePlayer(
    user: SessionUser,
    now: number,
    others: readonly EnginePlayer[],
  ): EnginePlayer {
    const used = new Set(others.map((player) => player.color));
    const color =
      PLAYER_COLORS.find((candidate) => !used.has(candidate)) ??
      PLAYER_COLORS[others.length % PLAYER_COLORS.length]!;

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color,
      connected: true,
      socketIds: [],
      joinedAt: now,
    };
  }

  private ensureHost(room: RuntimeRoom): void {
    const players = room.state.players;
    if (players.length === 0) return;
    const host = players.find((player) => player.id === room.state.hostId);
    if (host?.connected) return;
    const next = players.find((player) => player.connected) ?? players[0]!;
    room.state.hostId = next.id;
  }

  private ensureDefuser(room: RuntimeRoom): void {
    const players = room.state.players;
    if (players.length === 0) {
      room.state.defuserId = null;
      return;
    }
    if (!room.state.defuserId || !players.some((player) => player.id === room.state.defuserId)) {
      room.state.defuserId = players[0]!.id;
    }
  }

  private assignManualPages(room: RuntimeRoom, viewerId: string): ManualPageId[] {
    const supports = room.state.players.filter(
      (player) => player.id !== room.state.defuserId,
    );
    if (supports.length <= 1) return [...MODULE_IDS];

    const index = supports.findIndex((player) => player.id === viewerId);
    if (index === -1) return [];

    const pages = MODULE_IDS.filter((_, pageIndex) => pageIndex % supports.length === index);
    if (pages.length > 0) return pages;
    return [MODULE_IDS[index % MODULE_IDS.length]!];
  }

  private buildPublicState(
    room: RuntimeRoom,
    viewer: EnginePlayer,
    now: number,
  ): PublicRoomState {
    const state = room.state;
    const role: Role | null = state.defuserId
      ? viewer.id === state.defuserId
        ? 'defuser'
        : 'support'
      : null;
    const bombVisible =
      (state.phase === 'game' || state.phase === 'result') && state.bomb !== null;

    return {
      roomId: state.joinCode,
      gameId: GAME_ID,
      phase: state.phase,
      hostId: state.hostId,
      defuserId: state.defuserId,
      contentLocale: state.contentLocale,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        avatarUrl: player.avatarUrl,
        color: player.color,
        isHost: player.id === state.hostId,
        isDefuser: player.id === state.defuserId,
        connected: player.connected,
      })),
      myRole: role,
      myManualPages:
        (state.phase === 'briefing' || state.phase === 'game') && role === 'support'
          ? this.assignManualPages(room, viewer.id)
          : [],
      bomb:
        bombVisible && state.bomb
          ? toPublicBombView(state.bomb, state.phase === 'game' && role === 'defuser')
          : null,
      moduleStatus: bombVisible && state.bomb ? moduleStatus(state.bomb) : [],
      bombContext: bombVisible && state.bomb ? bombContext(state.bomb) : null,
      strikes: state.strikes,
      maxStrikes: MAX_STRIKES,
      totalSeconds: BOMB_SECONDS,
      remainingSeconds: this.remainingSeconds(room, now),
      deadlineAt:
        state.phase === 'briefing'
          ? state.briefingEndsAt
          : state.phase === 'game'
            ? state.deadlineAt
            : null,
      result: state.result,
      resultSeconds: state.resultSeconds,
      lastEvent: state.lastEvent,
      serverTime: now,
      seq: state.seq,
    };
  }

  private broadcast(room: RuntimeRoom): void {
    const now = this.now();
    room.state.seq += 1;
    room.state.updatedAt = now;

    for (const player of room.state.players) {
      if (player.socketIds.length === 0) continue;
      const payload = this.buildPublicState(room, player, now);
      for (const socketId of player.socketIds) {
        this.deps.emitToSocket(socketId, 'room:state', payload);
      }
    }
  }

  private touch(room: RuntimeRoom, now: number): void {
    room.state.updatedAt = now;
  }

  private async commit(room: RuntimeRoom): Promise<void> {
    this.broadcast(room);
    await this.persist(room);
  }

  private async persist(room: RuntimeRoom): Promise<void> {
    room.lastSavedAt = this.now();
    try {
      await this.deps.store.save(room.state);
    } catch (error) {
      this.deps.logger.warn(
        { err: error, roomId: room.state.roomId },
        'could not persist room snapshot',
      );
    }
  }

  private async cleanup(roomId: string, room: RuntimeRoom, now: number): Promise<void> {
    const idle = room.state.players.every((player) => !player.connected);
    if (!idle) {
      room.emptySince = null;
      return;
    }

    room.emptySince ??= now;
    const ttl =
      room.state.phase === 'lobby'
        ? this.deps.config.lobbyTtlSeconds
        : this.deps.config.roomTtlSeconds;
    if (now - room.emptySince < ttl * 1000) return;

    this.rooms.delete(roomId);
    this.codes.delete(room.state.joinCode.toUpperCase());
    try {
      await this.deps.store.delete(roomId);
    } catch (error) {
      this.deps.logger.warn({ err: error, roomId }, 'could not delete room snapshot');
    }
  }

  private claimCode(input: string): string {
    const custom = /^[A-Za-z][A-Za-z0-9_-]{1,11}$/.test(input)
      ? input.toUpperCase()
      : null;
    if (custom && !this.codes.has(custom)) return custom;
    return this.randomCode();
  }

  private randomCode(): string {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
        code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length - 1)];
      }
      if (!this.codes.has(code)) return code;
    }
    throw new GameError('ROOM_LIMIT', 'could not allocate a room code');
  }
}

export function normalizeRoomId(roomId: string): string {
  return roomId.trim();
}

export function roomName(roomId: string): string {
  return `room:${roomId}`;
}

export function toRoomErrorPayload(error: unknown): RoomErrorPayload {
  if (error instanceof GameError) {
    return { code: error.code, message: error.message };
  }
  return { code: 'INTERNAL' };
}
