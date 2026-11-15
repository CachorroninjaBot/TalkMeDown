export type LocaleCode = string;
export type Phase = 'lobby' | 'briefing' | 'game' | 'result';
export type TextDirection = 'ltr' | 'rtl';
export type ModuleId = 'wires' | 'button' | 'keypad';
export type ManualPageId = ModuleId;
export type Role = 'defuser' | 'support';
export type GameResult = 'defused' | 'exploded' | 'aborted';

export type WireColor = 'red' | 'blue' | 'yellow' | 'black' | 'white';
export type ButtonColor = 'blue' | 'white' | 'yellow' | 'red';
export type ButtonLabel = 'abort' | 'detonate' | 'hold' | 'press';
export type StripColor = 'blue' | 'white' | 'yellow' | 'red';

export interface PlayerProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  isHost: boolean;
  isDefuser: boolean;
  connected: boolean;
}

export interface BombContext {
  serial: string;
  batteries: number;
}

export interface PublicWire {
  id: string;
  color: WireColor;
  cut: boolean;
}

export interface PublicButton {
  color: ButtonColor;
  label: ButtonLabel;
  solved: boolean;
  holding: boolean;
  /** The strip is only visible while the button is held. */
  strip: StripColor | null;
}

export interface PublicKeypad {
  symbols: string[];
  entered: string[];
  solved: boolean;
}

export interface PublicBomb {
  wires: PublicWire[] | null;
  button: PublicButton | null;
  keypad: PublicKeypad | null;
}

export interface ModuleStatus {
  id: ModuleId;
  solved: boolean;
}

export type GameEventKind =
  | 'strike'
  | 'moduleSolved'
  | 'cut'
  | 'armed'
  | 'defused'
  | 'exploded'
  | 'aborted';

export interface GameEvent {
  kind: GameEventKind;
  module: ModuleId | null;
  at: number;
}

export interface PublicRoomState {
  /** Shareable join code; never the internal room id or channel id. */
  roomId: string;
  gameId: string;
  phase: Phase;
  hostId: string;
  defuserId: string | null;
  contentLocale: string;
  players: PublicPlayer[];
  myRole: Role | null;
  myManualPages: ManualPageId[];
  bomb: PublicBomb | null;
  moduleStatus: ModuleStatus[];
  bombContext: BombContext | null;
  strikes: number;
  maxStrikes: number;
  totalSeconds: number;
  remainingSeconds: number | null;
  deadlineAt: number | null;
  result: GameResult | null;
  resultSeconds: number | null;
  lastEvent: GameEvent | null;
  serverTime: number;
  seq: number;
}

export interface SessionUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  guest: boolean;
}

export interface ActivityContext {
  instanceId?: string;
  channelId?: string;
  guildId?: string;
  locale?: string;
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  dir: TextDirection;
}

export interface LocalesResponse {
  locales: LocaleInfo[];
  defaultLocale: string;
  fallbackLocale: string;
  contentLocales: string[];
}

export interface HealthResponse {
  ok: boolean;
  status: 'ok' | 'degraded';
  version: string;
  uptimeSeconds: number;
  redis: boolean;
  store: 'redis' | 'memory';
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
  expiresAt: number;
}
