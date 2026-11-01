import { z } from 'zod';
export const eventNameSchema = z.enum([
  'app_open',
  'heartbeat',
  'screen_view',
  'match_entered',
  'match_left',
  'match_finished',
  'phase_changed',
  'tutorial_shown',
  'tutorial_closed',
  'tutorial_acknowledged',
  'action_confirmed',
  'action_rejected',
  'connection_changed',
]);
export const eventContextSchema = z.strictObject({
  mode: z.enum(['hub', 'offline', 'online', 'practice']).optional(),
  phase: z
    .enum([
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
    ])
    .optional(),
  action: z
    .enum([
      'buy-development',
      'declare-victory',
      'play-development',
      'discard',
      'steal',
      'roll',
      'end-turn',
      'setup-roll',
      'setup',
      'build',
      'robber',
      'domestic-trade',
      'trade',
    ])
    .optional(),
  screen: z
    .enum([
      'hub',
      'board',
      'construction',
      'trade',
      'development',
      'tutorial',
      'results',
      'other',
    ])
    .optional(),
  lesson: z.number().int().min(0).max(100).optional(),
  activeMs: z.number().int().min(0).max(30000).optional(),
  connected: z.boolean().optional(),
  runId: z.uuid().optional(),
});
export const analyticsEventSchema = z
  .strictObject({
    id: z.uuid(),
    sessionId: z.uuid(),
    name: eventNameSchema,
    build: z.string().regex(/^(?:[a-f0-9]{40}|development)$/),
    data: eventContextSchema,
  })
  .superRefine((event, ctx) => {
    if (event.name !== 'heartbeat' && event.data.activeMs !== undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'Active time requires heartbeat',
        path: ['data', 'activeMs'],
      });
  });
export const analyticsBatchSchema = z.strictObject({
  accountId: z.uuid(),
  events: z.array(analyticsEventSchema).min(1).max(25),
});
export const analyticsPreferenceInputSchema = z.strictObject({
  accountId: z.uuid(),
  enabled: z.boolean(),
});
export const analyticsPreferenceSchema = z.strictObject({
  accountId: z.uuid(),
  enabled: z.boolean().nullable(),
});
export const analyticsAcceptedSchema = z.strictObject({
  accepted: z.number().int().min(0),
});
const retention = z.object({
  eligible: z.number().int(),
  returned: z.number().int(),
});
export const analyticsSummarySchema = z.strictObject({
  days: z.literal(7),
  players: z.number().int(),
  sessions: z.number().int(),
  events: z.number().int(),
  activeSeconds: z.number().int(),
  optedInAccounts: z.number().int(),
  registeredAccounts: z.number().int(),
  d1: retention,
  d7: retention,
  daily: z.array(
    z.object({
      date: z.string(),
      players: z.number().int(),
      sessions: z.number().int(),
      activeSeconds: z.number().int(),
    }),
  ),
  eventsByName: z.array(
    z.object({
      name: eventNameSchema,
      events: z.number().int(),
      players: z.number().int(),
    }),
  ),
  phases: z.array(z.object({ phase: z.string(), events: z.number().int() })),
  builds: z.array(
    z.object({
      build: z.string(),
      players: z.number().int(),
      events: z.number().int(),
    }),
  ),
  checkedAt: z.iso.datetime(),
});
export const analyticsTimelineSchema = z.strictObject({
  enabled: z.boolean().nullable(),
  firstSeen: z.iso.datetime().nullable(),
  lastSeen: z.iso.datetime().nullable(),
  events: z.array(
    z.object({
      name: eventNameSchema,
      build: z.string(),
      receivedAt: z.iso.datetime(),
      data: eventContextSchema,
    }),
  ),
});
