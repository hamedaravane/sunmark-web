import { z } from 'zod';

export const userQuerySchema = z.strictObject({
  q: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  gender: z.enum(['male', 'female']).optional(),
  profile: z.enum(['all', 'incomplete']).default('all'),
});

export const editableProfileSchema = z.strictObject({
  name: z.string().trim().min(1).max(24),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['male', 'female']),
});
export const adminProfileUpdateSchema = z.strictObject({
  profile: editableProfileSchema,
  expected: z.strictObject({
    name: z.string(),
    age: z.number().int(),
    gender: z.string(),
  }),
});
export const adminProfileResponseSchema = z.strictObject({
  id: z.uuid(),
  profile: editableProfileSchema,
});
export const profileAuditSchema = z.strictObject({
  changes: z.array(
    z.strictObject({
      id: z.number().int(),
      at: z.iso.datetime(),
      actorId: z.uuid().nullable(),
      before: z.strictObject({
        name: z.string(),
        age: z.number().int(),
        gender: z.string(),
      }),
      after: editableProfileSchema,
    }),
  ),
});

export const insightsQuerySchema = z.strictObject({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30)]))
    .default(7),
});
const countSchema = z.number().int().nonnegative();
export const insightsSchema = z.strictObject({
  days: z.number().int(),
  checkedAt: z.iso.datetime(),
  from: z.iso.datetime(),
  excludedAdmins: countSchema,
  accounts: z.strictObject({
    total: countSchema,
    new: countSchema,
    incompleteProfiles: countSchema,
    eligibleForMeasurement: countSchema,
    optedOut: countSchema,
  }),
  activity: z.strictObject({
    players: countSchema,
    sessions: countSchema,
    activeSeconds: countSchema,
    medianActiveSeconds: z.number().nonnegative(),
    repeatPlayers: countSchema,
    rejectedActions: countSchema,
    affectedPlayers: countSchema,
  }),
  daily: z.array(
    z.strictObject({
      date: z.string(),
      registrations: countSchema,
      players: countSchema,
      sessions: countSchema,
      activeSeconds: countSchema,
      rejections: countSchema,
    }),
  ),
  journeys: z.array(
    z.strictObject({
      mode: z.enum(['offline', 'online', 'practice']),
      entrants: countSchema,
      runs: countSchema,
      progressed: countSchema,
      builders: countSchema,
      traders: countSchema,
      finishers: countSchema,
    }),
  ),
  online: z.strictObject({
    visitors: countSchema,
    entrants: countSchema,
    firstActors: countSchema,
    stages: z.array(
      z.strictObject({
        step: z.string(),
        players: countSchema,
        failures: countSchema,
      }),
    ),
  }),
  cohorts: z.array(
    z.strictObject({
      date: z.string(),
      players: countSchema,
      d1: countSchema.nullable(),
      d7: countSchema.nullable(),
    }),
  ),
  genders: z.strictObject({ male: countSchema, female: countSchema }),
  ages: z.array(z.strictObject({ band: z.string(), players: countSchema })),
  builds: z.array(
    z.strictObject({
      build: z.string(),
      players: countSchema,
      events: countSchema,
    }),
  ),
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
