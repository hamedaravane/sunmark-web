import { z } from 'zod';
export const sealIdSchema = z.enum(['sun', 'turquoise', 'amethyst']);
export const badgeIdSchema = z.enum([
  'first-match',
  'first-win',
  'explorer',
  'champion',
  'ambassador',
]);
export const tierSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
]);
const count = z.number().int().nonnegative();
export const purchaseSchema = z.strictObject({ seal: sealIdSchema });
export const referralSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{2,23}$/),
});
export const rewardSchema = z.strictObject({
  source: z.string(),
  kind: z.enum(['match', 'referral', 'cosmetic']),
  xp: count,
  coins: z.number().int(),
  ratingChange: z.number().int(),
  createdAt: z.iso.datetime(),
});
export const progressionProfileSchema = z.strictObject({
  version: z.literal(1),
  playerId: z.uuid(),
  xp: count,
  coins: count,
  level: count,
  levelXP: count,
  nextLevelXP: count,
  matches: count,
  wins: count,
  rankedMatches: count,
  rankedWins: count,
  rating: z.number().int().nullable(),
  tier: tierSchema.nullable(),
  placementGamesRemaining: count,
  lastRatingChange: z.number().int().nullable(),
  badges: z.array(badgeIdSchema),
  ownedSeals: z.array(sealIdSchema),
  equippedSeal: sealIdSchema,
  catalog: z.array(
    z.strictObject({ id: sealIdSchema, name: z.string(), cost: count }),
  ),
  referral: z.strictObject({
    code: z.string(),
    status: z.enum(['none', 'pending', 'rewarded', 'capped']),
    qualifiedGames: count,
    requiredGames: z.literal(3),
    rewardedInvites: count,
    limit: z.literal(10),
  }),
  rewards: z.array(rewardSchema),
});
export type ProgressionProfile = z.infer<typeof progressionProfileSchema>;
