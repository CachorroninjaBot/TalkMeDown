import { create } from 'zustand';
import type {
  ActivityContext,
  AuthResponse,
  LocaleInfo,
  PublicRoomState,
  RoomErrorCode,
  TextDirection,
} from '@talk-me-down/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export type AppStatus = 'boot' | 'loading' | 'ready' | 'error';
export type UiErrorCode = RoomErrorCode | 'CONNECT' | 'AUTH' | 'GENERIC';
export type UiNoticeCode = 'HOST_CHANGED';

export interface UiError {
  code: UiErrorCode;
  message?: string;
  at: number;
}

interface GameStore {
  status: AppStatus;
  bootError: string | null;
  auth: AuthResponse | null;
  context: ActivityContext | null;
  roomId: string | null;
  state: PublicRoomState | null;
  connection: ConnectionStatus;
  error: UiError | null;
  notice: UiNoticeCode | null;
  latency: number | null;
  serverOffset: number;

  locales: LocaleInfo[];
  contentLocales: string[];
  uiLocale: string;
  dir: TextDirection;

  setStatus: (status: AppStatus) => void;
  setBootError: (message: string | null) => void;
  setSession: (auth: AuthResponse, context: ActivityContext, roomId: string) => void;
  setLocales: (locales: LocaleInfo[], contentLocales: string[]) => void;
  setLocaleMeta: (locale: string, dir: TextDirection) => void;
  setConnection: (connection: ConnectionStatus) => void;
  clearRoomState: () => void;
  setError: (code: UiErrorCode, message?: string) => void;
  clearError: () => void;
  setNotice: (code: UiNoticeCode) => void;
  clearNotice: () => void;
  applyState: (state: PublicRoomState) => void;
  setLatency: (latency: number) => void;
  reset: () => void;
}

const initialState = {
  status: 'boot' as AppStatus,
  bootError: null,
  auth: null,
  context: null,
  roomId: null,
  state: null,
  connection: 'connecting' as ConnectionStatus,
  error: null,
  notice: null,
  latency: null,
  serverOffset: 0,
  locales: [] as LocaleInfo[],
  contentLocales: [] as string[],
  uiLocale: 'en-US',
  dir: 'ltr' as TextDirection,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setBootError: (bootError) => set({ bootError }),
  setSession: (auth, context, roomId) => set({ auth, context, roomId }),
  setLocales: (locales, contentLocales) => set({ locales, contentLocales }),
  setLocaleMeta: (uiLocale, dir) => set({ uiLocale, dir }),
  setConnection: (connection) => set({ connection }),
  clearRoomState: () => set({ state: null }),
  setError: (code, message) => set({ error: { code, message, at: Date.now() } }),
  clearError: () => set({ error: null }),
  setNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),

  applyState: (state) => {
    const previous = get().state;
    if (previous && previous.roomId === state.roomId && state.seq < previous.seq) return;

    const roomChanged = !previous || previous.roomId !== state.roomId;
    const becameHost =
      previous !== null &&
      previous.roomId === state.roomId &&
      previous.hostId !== state.hostId &&
      state.hostId === get().auth?.user.id;

    set({
      state,
      roomId: state.roomId,
      notice: becameHost ? 'HOST_CHANGED' : roomChanged ? null : get().notice,
      connection: 'connected',
      serverOffset: state.serverTime - Date.now(),
    });
  },

  setLatency: (latency) => set({ latency }),

  reset: () => set({ ...initialState }),
}));
