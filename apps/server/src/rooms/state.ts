import type { GameEvent, GameResult, Phase } from '@talk-me-down/shared';
import type { Bomb } from '@talk-me-down/game-core';

export interface EnginePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  connected: boolean;
  socketIds: string[];
  joinedAt: number;
}

export interface EngineState {
  /** Internal key (channel id or code); never sent to clients. */
  roomId: string;
  joinCode: string;
  phase: Phase;
  hostId: string;
  defuserId: string | null;
  players: EnginePlayer[];
  contentLocale: string;
  seed: number;
  bomb: Bomb | null;
  strikes: number;
  briefingEndsAt: number | null;
  deadlineAt: number | null;
  result: GameResult | null;
  resultSeconds: number | null;
  lastEvent: GameEvent | null;
  seq: number;
  createdAt: number;
  updatedAt: number;
}
