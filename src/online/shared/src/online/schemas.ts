import { z } from 'zod';
import { resourceBundleSchema, intentSchema } from '../game/protocol.js';
const id = z.string().min(1).max(128);
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const resource = z.enum(['wood', 'brick', 'wheat', 'wool', 'stone']);
const dice = z.tuple([
  z.number().int().min(1).max(6),
  z.number().int().min(1).max(6),
]);
const card = z.strictObject({
  id,
  kind: z.enum([
    'knight',
    'victory-point',
    'road-building',
    'monopoly',
    'year-of-plenty',
  ]),
  boughtOnRound: uint,
  playedBy: id.optional(),
});
const building = z.strictObject({
  type: z.enum(['settlement', 'city']),
  ownerId: id,
});
export const gameStateSchema = z.strictObject({
  board: z.strictObject({
    tiles: z
      .array(
        z.strictObject({
          id,
          q: z.number().int(),
          r: z.number().int(),
          x: z.number(),
          y: z.number(),
          terrain: z.enum([
            'forest',
            'mesa',
            'wheat',
            'pasture',
            'mountain',
            'desert',
          ]),
          resource: resource.nullable(),
          number: z.number().int().min(2).max(12).nullable(),
          robber: z.boolean(),
          vertexIds: z.array(id),
          edgeIds: z.array(id),
        }),
      )
      .length(19),
    vertices: z.record(
      id,
      z.strictObject({
        id,
        x: z.number(),
        y: z.number(),
        tileIds: z.array(id),
        edgeIds: z.array(id),
        neighborIds: z.array(id),
        building: building.nullable(),
      }),
    ),
    edges: z.record(
      id,
      z.strictObject({
        id,
        vertexIds: z.tuple([id, id]),
        tileIds: z.array(id),
        road: z.strictObject({ ownerId: id }).nullable(),
      }),
    ),
    ports: z
      .array(z.strictObject({ id, edgeId: id, resource: resource.nullable() }))
      .length(9),
  }),
  players: z
    .array(
      z.strictObject({
        id,
        name: z.string().min(1).max(80),
        color: uint,
        resources: resourceBundleSchema,
      }),
    )
    .length(4),
  activePlayerIndex: z.number().int().min(0).max(3),
  turn: uint.min(1),
  phase: z.enum([
    'setup-roll',
    'setup-settlement',
    'setup-road',
    'roll',
    'discard',
    'robber',
    'steal',
    'road-building',
    'actions',
    'finished',
  ]),
  lastRoll: dice.nullable(),
  winnerId: id.nullable(),
  victoryTarget: z.literal(10),
  startingPlayerIndex: z.number().int().min(0).max(3).optional(),
  setup: z
    .discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('starter'),
        contenders: z.array(z.number().int().min(0).max(3)),
        rolls: z.record(id, dice),
        lastRoll: z.strictObject({ playerId: id, dice }).nullable(),
      }),
      z.strictObject({
        kind: z.literal('placement'),
        settlements: z.array(id),
        settlementId: id.nullable(),
        lastRoll: z.strictObject({ playerId: id, dice }),
      }),
    ])
    .nullable()
    .optional(),
  development: z
    .strictObject({
      deck: z.array(card),
      discard: z.array(card),
      hands: z.record(id, z.array(card)),
      knights: z.record(id, uint),
      playedThisTurn: z.boolean(),
    })
    .optional(),
  awards: z
    .strictObject({ longestRoad: id.nullable(), largestArmy: id.nullable() })
    .optional(),
  robberResolution: z
    .strictObject({
      source: z.enum(['seven', 'knight']),
      returnPhase: z.enum(['roll', 'actions']),
      discards: z.record(id, uint),
      victims: z.array(id),
    })
    .nullable()
    .optional(),
  roadBuilding: z
    .strictObject({ remaining: uint, returnPhase: z.enum(['roll', 'actions']) })
    .nullable()
    .optional(),
});
export const seatSchema = z.strictObject({
  playerId: id,
  sessionId: z.uuid().nullable(),
  name: z.string().max(80),
  bot: z.boolean(),
  ready: z.boolean(),
});
export const seatsSchema = z.array(seatSchema).length(4);
export type Seat = z.infer<typeof seatSchema>;
const terms = {
  to: id,
  give: resourceBundleSchema,
  want: resourceBundleSchema,
  parentId: uint.min(1).optional(),
};
export const tradeIntentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('offer'), ...terms }),
  z.strictObject({
    kind: z.literal('respond'),
    offerId: uint.min(1),
    accept: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('confirm'), offerId: uint.min(1) }),
  z.strictObject({ kind: z.literal('withdraw'), offerId: uint.min(1) }),
]);
export const onlineCommandSchema = z.strictObject({
  protocolVersion: z.literal(1),
  matchId: z.uuid(),
  commandId: z.uuid(),
  expectedRevision: uint.max(Number.MAX_SAFE_INTEGER - 1),
  intent: z.union([intentSchema, tradeIntentSchema]),
});
const offerSchema = z.strictObject({
  id: uint.min(1),
  from: id,
  to: id,
  give: resourceBundleSchema,
  want: resourceBundleSchema,
  parentId: uint.min(1).optional(),
  status: z.enum([
    'open',
    'accepted',
    'rejected',
    'countered',
    'withdrawn',
    'completed',
    'expired',
  ]),
  reason: z
    .enum([
      'useful',
      'protecting-plan',
      'better-price',
      'leader',
      'unavailable',
    ])
    .optional(),
});
export const tradeMemorySchema = z.strictObject({
  turn: uint,
  activeId: z.string(),
  nextId: uint.min(1),
  offers: z.array(offerSchema),
  attempted: z.array(z.string()),
});
export const guestSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
});
export const lobbyCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(80).optional(),
});
export const joinSchema = z.strictObject({
  code: z.string().regex(/^(?:[0-9]{5}|[a-f0-9]{12})$/i),
});
export const lobbyActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ready'), ready: z.boolean() }),
  z.strictObject({
    kind: z.literal('bot'),
    seat: z.number().int().min(1).max(3),
    enabled: z.boolean(),
  }),
  z.strictObject({ kind: z.literal('start') }),
]);

export const matchmakingActionSchema = z.strictObject({
  kind: z.enum(['join', 'poll', 'cancel']),
});
