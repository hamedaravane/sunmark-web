import { z } from 'zod';

export const resourceSchema = z.enum([
  'wood',
  'brick',
  'wheat',
  'wool',
  'stone',
]);
const identifier = z.string().min(1).max(128);
const quantity = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const resourceBundleSchema = z.strictObject({
  wood: quantity,
  brick: quantity,
  wheat: quantity,
  wool: quantity,
  stone: quantity,
});
const simple = <T extends string>(kind: T) =>
  z.strictObject({ kind: z.literal(kind) });
// Identity and randomness are deliberately absent. Domestic trade must go through
// the durable offer/consent ledger, never the core's direct exchange command.
export const intentSchema = z.discriminatedUnion('kind', [
  simple('setup-roll'),
  simple('roll'),
  simple('end-turn'),
  simple('buy-development'),
  simple('declare-victory'),
  z.strictObject({
    kind: z.literal('setup'),
    type: z.enum(['settlement', 'road']),
    targetId: identifier,
  }),
  z.strictObject({
    kind: z.literal('build'),
    type: z.enum(['settlement', 'road', 'city']),
    targetId: identifier,
  }),
  z.strictObject({ kind: z.literal('robber'), targetId: identifier }),
  z.strictObject({ kind: z.literal('steal'), victimId: identifier }),
  z.strictObject({
    kind: z.literal('discard'),
    resources: resourceBundleSchema,
  }),
  z.strictObject({
    kind: z.literal('trade'),
    give: resourceSchema,
    receive: resourceSchema,
    ratio: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  }),
  z.strictObject({
    kind: z.literal('play-development'),
    cardId: identifier,
    choice: z
      .strictObject({
        resource: resourceSchema.optional(),
        resources: z.tuple([resourceSchema, resourceSchema]).optional(),
      })
      .optional(),
  }),
]);
export const commandEnvelopeSchema = z.strictObject({
  protocolVersion: z.literal(1),
  matchId: identifier,
  commandId: z.uuid(),
  expectedRevision: quantity.max(Number.MAX_SAFE_INTEGER - 1),
  intent: intentSchema,
});
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
