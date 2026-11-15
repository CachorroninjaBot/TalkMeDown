import { z } from 'zod';
import { MAX_NAME_LENGTH, MAX_ROOM_ID_LENGTH, ROOM_ID_MIN_LENGTH } from './constants.js';
import { isHttpUrl } from './text.js';

export const localeCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'invalid locale code');

export const roomIdSchema = z
  .string()
  .trim()
  .min(ROOM_ID_MIN_LENGTH)
  .max(MAX_ROOM_ID_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/, 'room id may only contain letters, numbers, _ and -');

export const displayNameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH * 2);

export const joinRoomSchema = z
  .object({
    roomId: roomIdSchema,
    mustExist: z.boolean().optional(),
  })
  .strict();

export const setContentLocaleSchema = z
  .object({
    locale: localeCodeSchema,
  })
  .strict();

export const setDefuserSchema = z
  .object({
    playerId: z.string().min(1).max(64),
  })
  .strict();

export const cutWireSchema = z
  .object({
    wireId: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[a-z0-9]+$/, 'invalid wire id'),
  })
  .strict();

export const keypadPressSchema = z
  .object({
    symbol: z.string().min(1).max(8),
  })
  .strict();

export const latencyPingSchema = z
  .object({
    t: z.number().finite(),
  })
  .strict();

export const activityContextSchema = z
  .object({
    instanceId: z.string().max(64).optional(),
    channelId: z.string().max(64).optional(),
    guildId: z.string().max(64).optional(),
    locale: localeCodeSchema.optional(),
  })
  .strict();

export const devAuthSchema = z
  .object({
    id: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    name: displayNameSchema,
    avatarUrl: z
      .url()
      .max(512)
      .refine(isHttpUrl, 'avatar must use http or https')
      .nullable()
      .optional(),
  })
  .strict();

export const tokenExchangeSchema = z
  .object({
    code: z.string().min(1).max(4096),
    instanceId: z.string().max(64).optional(),
  })
  .strict();
