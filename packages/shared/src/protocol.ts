import type {
  ActivityContext,
  SessionUser,
} from './types.js';

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'ROOM_LIMIT'
  | 'NOT_HOST'
  | 'INVALID_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'NOT_DEFUSER'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'INTERNAL';

export interface JoinRoomPayload {
  roomId: string;
  mustExist?: boolean;
}

export interface SetContentLocalePayload {
  locale: string;
}

export interface SetDefuserPayload {
  playerId: string;
}

export interface CutWirePayload {
  wireId: string;
}

export interface KeypadPressPayload {
  symbol: string;
}

export interface LatencyPingPayload {
  t: number;
}

export interface LatencyPongPayload {
  t: number;
  serverTime: number;
}

export interface RoomErrorPayload {
  code: RoomErrorCode;
  message?: string;
}

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload) => void;
  'room:leave': () => void;
  'lobby:set-locale': (payload: SetContentLocalePayload) => void;
  'lobby:set-defuser': (payload: SetDefuserPayload) => void;
  'lobby:start': () => void;
  'game:cut-wire': (payload: CutWirePayload) => void;
  'game:press-button': () => void;
  'game:release-button': () => void;
  'game:press-keypad': (payload: KeypadPressPayload) => void;
  'game:rematch': () => void;
  'latency:ping': (payload: LatencyPingPayload) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: import('./types.js').PublicRoomState) => void;
  'room:error': (payload: RoomErrorPayload) => void;
  'latency:pong': (payload: LatencyPongPayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user: SessionUser;
  context: ActivityContext;
  roomId?: string;
}
