export const RULES_VERSION = '3ef03a7fd848e16137e06445c4927cec5f89d3c2';
import { z } from 'zod';
import { gameStateSchema, seatSchema, tradeMemorySchema } from './schemas.js';
import { intentSchema, resourceBundleSchema } from '../game/protocol.js';
export const guestResponseSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
});
const id = z.string();
const count = z.number().int().nonnegative();
export const gameViewSchema = z.strictObject({
  protocolVersion: z.literal(1),
  availableIntents: z.array(intentSchema),
  board: gameStateSchema.shape.board,
  phase: gameStateSchema.shape.phase,
  turn: count,
  actorId: id,
  activePlayerId: id,
  lastRoll: gameStateSchema.shape.lastRoll,
  winnerId: id.nullable(),
  victoryTarget: z.literal(10),
  setup: gameStateSchema.shape.setup,
  awards: gameStateSchema.shape.awards.nullable(),
  discardObligations: z.record(id, count),
  eligibleVictims: z.array(id),
  developmentDeckCount: count,
  playedDevelopment: z.array(
    z.strictObject({
      kind: z.enum([
        'knight',
        'victory-point',
        'road-building',
        'monopoly',
        'year-of-plenty',
      ]),
      playedBy: id.optional(),
    }),
  ),
  players: z
    .array(
      z.strictObject({
        id,
        name: z.string(),
        color: count,
        resourceCount: count,
        developmentCount: count,
        playedKnights: count,
        publicScore: count,
      }),
    )
    .length(4),
  self: z.strictObject({
    id,
    resources: resourceBundleSchema,
    developmentCards: z.array(
      z.strictObject({
        id,
        kind: z.enum([
          'knight',
          'victory-point',
          'road-building',
          'monopoly',
          'year-of-plenty',
        ]),
        boughtOnRound: count,
      }),
    ),
    score: count,
  }),
});
export const matchSnapshotSchema = z.strictObject({
  rulesVersion: z.literal(RULES_VERSION),
  protocolVersion: z.literal(1),
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  status: z.enum(['lobby', 'playing', 'finished']),
  revision: count,
  host: z.boolean(),
  seats: z
    .array(
      seatSchema
        .omit({ sessionId: true })
        .extend({ occupied: z.boolean(), isYou: z.boolean() }),
    )
    .length(4),
  game: gameViewSchema.nullable(),
  offers: tradeMemorySchema.shape.offers,
});
export type MatchSnapshot = z.infer<typeof matchSnapshotSchema>;
export type GameView = z.infer<typeof gameViewSchema>;
export const commandResponseSchema = z.strictObject({
  commandId: z.uuid(),
  revision: count,
  snapshot: matchSnapshotSchema,
});
export const matchListSchema = z.array(
  z.strictObject({
    id: z.uuid(),
    name: z.string(),
    status: z.enum(['lobby', 'playing', 'finished']),
  }),
);
