import { Server } from 'socket.io';
import type { Logger } from 'pino';
import type { ZodType } from 'zod';
import {
  activityContextSchema,
  cutWireSchema,
  joinRoomSchema,
  keypadPressSchema,
  latencyPingSchema,
  setContentLocaleSchema,
  setDefuserSchema,
} from '@talk-me-down/shared';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@talk-me-down/shared';
import { GameError } from '@talk-me-down/game-core';
import { verifySession } from '../auth/jwt.js';
import type { AppConfig } from '../config.js';
import type { AppFastifyInstance } from '../types.js';
import { toRoomErrorPayload, type RoomManager } from './room-manager.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

class EventGate {
  private timestamps: number[] = [];

  allow(limit = 240, windowMs = 1_000): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < windowMs);
    if (this.timestamps.length >= limit) return false;
    this.timestamps.push(now);
    return true;
  }
}

function parseOrThrow<T>(schema: ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new GameError('INVALID_INPUT', 'invalid payload');
  }
  return result.data;
}

export function createSocketServer(app: AppFastifyInstance, config: AppConfig): IO {
  const io: IO = new Server(app.server, {
    path: '/ws',
    serveClient: false,
    maxHttpBufferSize: 128 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    void (async () => {
      try {
        const auth = (socket.handshake.auth ?? {}) as Record<string, unknown>;
        const token = typeof auth.token === 'string' ? auth.token : null;
        if (!token) throw new Error('missing token');

        const user = await verifySession(token, config.sessionSecret);
        const context = activityContextSchema.safeParse(auth.context ?? {});
        if (!context.success) throw new Error('invalid context');

        socket.data.user = user;
        socket.data.context = context.data;
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    })();
  });

  return io;
}

export function registerSocketHandlers(io: IO, rooms: RoomManager, logger: Logger): void {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    const gate = new EventGate();

    const run = (label: string, action: () => void | Promise<void>): void => {
      if (!gate.allow()) {
        socket.emit('room:error', { code: 'RATE_LIMITED', message: 'slow down a little' });
        return;
      }
      void Promise.resolve()
        .then(action)
        .catch((error: unknown) => {
          if (!(error instanceof GameError)) {
            logger.warn({ err: error, event: label, userId: user.id }, 'socket action failed');
          }
          socket.emit('room:error', toRoomErrorPayload(error));
        });
    };

    const joinedRoom = (): string => {
      if (!socket.data.roomId) throw new GameError('ROOM_NOT_FOUND', 'join a room first');
      return socket.data.roomId;
    };

    socket.on('room:join', (payload) => {
      run('room:join', async () => {
        const { roomId, mustExist } = parseOrThrow(joinRoomSchema, payload);
        const targetId = rooms.resolveRoomId(roomId) ?? roomId.trim();

        if (socket.data.roomId && socket.data.roomId !== targetId) {
          // Validate before detaching so a wrong code keeps the player in the current room.
          rooms.assertJoinable(targetId, user.id, mustExist ?? false);
          const previous = socket.data.roomId;
          await rooms.detach(previous, user.id, socket.id, true);
          socket.data.roomId = undefined;
        }

        const result = await rooms.join({
          roomId: targetId,
          user,
          socketId: socket.id,
          preferredLocale: socket.data.context.locale,
          mustExist: mustExist ?? false,
        });
        socket.data.roomId = result.internalId;
      });
    });

    socket.on('room:leave', () => {
      run('room:leave', async () => {
        const roomId = socket.data.roomId;
        if (!roomId) return;
        socket.data.roomId = undefined;
        await rooms.detach(roomId, user.id, socket.id, true);
      });
    });

    socket.on('lobby:set-locale', (payload) => {
      run('lobby:set-locale', async () => {
        const { locale } = parseOrThrow(setContentLocaleSchema, payload);
        await rooms.setContentLocale(joinedRoom(), user.id, locale);
      });
    });

    socket.on('lobby:set-defuser', (payload) => {
      run('lobby:set-defuser', async () => {
        const { playerId } = parseOrThrow(setDefuserSchema, payload);
        await rooms.setDefuser(joinedRoom(), user.id, playerId);
      });
    });

    socket.on('lobby:start', () => {
      run('lobby:start', async () => {
        await rooms.start(joinedRoom(), user.id);
      });
    });

    socket.on('game:cut-wire', (payload) => {
      run('game:cut-wire', async () => {
        const { wireId } = parseOrThrow(cutWireSchema, payload);
        await rooms.cutWire(joinedRoom(), user.id, wireId);
      });
    });

    socket.on('game:press-button', () => {
      run('game:press-button', async () => {
        await rooms.pressButton(joinedRoom(), user.id);
      });
    });

    socket.on('game:release-button', () => {
      run('game:release-button', async () => {
        await rooms.releaseButton(joinedRoom(), user.id);
      });
    });

    socket.on('game:press-keypad', (payload) => {
      run('game:press-keypad', async () => {
        const { symbol } = parseOrThrow(keypadPressSchema, payload);
        await rooms.pressKeypad(joinedRoom(), user.id, symbol);
      });
    });

    socket.on('game:rematch', () => {
      run('game:rematch', async () => {
        await rooms.rematch(joinedRoom(), user.id);
      });
    });

    socket.on('latency:ping', (payload) => {
      run('latency:ping', () => {
        const { t } = parseOrThrow(latencyPingSchema, payload);
        socket.emit('latency:pong', { t, serverTime: Date.now() });
      });
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      socket.data.roomId = undefined;
      void rooms
        .detach(roomId, user.id, socket.id, false)
        .catch((error: unknown) => {
          logger.warn({ err: error, roomId, userId: user.id }, 'socket detach failed');
        });
    });
  });
}
