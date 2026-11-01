import { z } from 'zod';

export const userQuerySchema = z.strictObject({
  q: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const adminUserSchema = z.strictObject({
  id: z.uuid(),
  username: z.string(),
  name: z.string(),
  phone: z.string(),
  age: z.number().int(),
  gender: z.string(),
  createdAt: z.iso.datetime(),
  isAdmin: z.boolean(),
  xp: z.number(),
  coins: z.number(),
  matches: z.number(),
  wins: z.number(),
  rankedMatches: z.number(),
  rankedWins: z.number(),
  rating: z.number(),
});
export const adminUsersSchema = z.strictObject({
  users: z.array(adminUserSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
export const overviewSchema = z.strictObject({
  registered: z.number().int(),
  registered24h: z.number().int(),
  registered7d: z.number().int(),
  guestIdentities: z.number().int(),
  accountsWithCompletedMatches: z.number().int(),
  games: z.object({
    lobby: z.number().int(),
    playing: z.number().int(),
    finished: z.number().int(),
  }),
  checkedAt: z.iso.datetime(),
});
