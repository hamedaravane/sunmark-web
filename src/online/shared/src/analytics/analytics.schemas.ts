import { offlineProfileSchema } from '../online/offlineProgression.js';
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
  'online_flow',
  'ui_interaction',
  'app_visibility',
]);
export const interactionSchema = z.enum([
  'open',
  'hub',
  'account',
  'account-login',
  'online',
  'ranked',
  'play',
  'tutorial',
  'resume-match',
  'restart-match',
  'confirm-new-match',
  'confirm-player-name',
  'enter-match',
  'close-sheet',
  'resume-game',
  'new-game',
  'primary',
  'roll-dice',
  'build',
  'construction-focus',
  'cancel-placement',
  'preview-target',
  'inspect',
  'player',
  'port',
  'trade',
  'trade-rate',
  'trade-port',
  'trade-for',
  'confirm-trade',
  'confirm-end-turn',
  'buy-development',
  'development-select',
  'development-resource',
  'play-development',
  'declare-victory',
  'discard-adjust',
  'confirm-discard',
  'steal',
  'deal-adjust',
  'deal-target',
  'deal-send',
  'deal-new',
  'deal-counter',
  'deal-accept',
  'deal-reject',
  'deal-review',
  'deal-withdraw',
  'deal-finish',
  'pin-build',
  'experience',
  'rival-next',
  'rival-reply',
  'rival-mute',
  'rival-toggle',
  'rival-replay',
  'tutorial-next',
  'tutorial-pause',
  'tutorial-resume',
  'lesson',
  'bot-pause',
  'bot-step',
  'hub-edit-name',
  'hub-save-name',
  'hub-equip',
  'hub-online',
  'online-refresh',
  'online-retry',
  'online-seal',
  'apply-referral',
  'copy-referral',
  'open-app',
  'app-install',
  'app-retry',
  'app-update',
  'account-submit',
  'account-close',
  'board-target',
  'analytics-settings',
  'room-account',
  'room-quick',
  'room-ranked',
  'room-cancel-search',
  'room-exit',
  'room-screen',
  'room-create',
  'room-join',
  'room-open',
  'room-back',
  'room-ready',
  'room-bot',
  'room-start',
  'room-invite',
  'account-register',
  'account-recover',
  'account-done',
  'account-logout',
  'account-previous',
  'account-copy',
  'account-analytics',
]);
export const eventContextSchema = z.strictObject({
  interaction: interactionSchema.optional(),
  visible: z.boolean().optional(),
  matchId: z.uuid().optional(),
  building: z.enum(['road', 'settlement', 'city']).optional(),
  won: z.boolean().optional(),
  turn: z.number().int().min(0).max(1000000).optional(),
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
      'profile',
      'achievements',
      'cosmetics',
      'settings',
      'characters',
      'account',
    ])
    .optional(),
  lesson: z.number().int().min(0).max(100).optional(),
  activeMs: z.number().int().min(0).max(30000).optional(),
  connected: z.boolean().optional(),
  runId: z.uuid().optional(),
  onlineStep: z
    .enum([
      'opened',
      'searching',
      'room_created',
      'room_joined',
      'ready',
      'started',
    ])
    .optional(),
  outcome: z.enum(['success', 'failure']).optional(),
});
export const analyticsEventSchema = z
  .strictObject({
    occurredAt: z.iso.datetime().optional(),
    id: z.uuid(),
    sessionId: z.uuid(),
    name: eventNameSchema,
    build: z.string().regex(/^(?:[a-f0-9]{40}|development)$/),
    data: eventContextSchema,
  })
  .superRefine((event, ctx) => {
    if (
      event.name === 'online_flow' &&
      (!event.data.onlineStep ||
        !event.data.outcome ||
        event.data.mode !== 'online')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Online flow requires online mode, step and outcome',
        path: ['data'],
      });
    if (
      event.name !== 'online_flow' &&
      (event.data.onlineStep !== undefined || event.data.outcome !== undefined)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Online step requires online flow',
        path: ['data'],
      });
    if (
      (event.data.interaction !== undefined) !==
      (event.name === 'ui_interaction')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Interaction requires UI event',
        path: ['data', 'interaction'],
      });
    if (
      (event.data.visible !== undefined) !==
      (event.name === 'app_visibility')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Visibility requires lifecycle event',
        path: ['data', 'visible'],
      });
    if (event.name !== 'heartbeat' && event.data.activeMs !== undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'Active time requires heartbeat',
        path: ['data', 'activeMs'],
      });
  });
export const deviceSchema = z.strictObject({
  installationId: z.uuid(),
  userAgent: z.string().max(512),
  platform: z.string().max(80),
  language: z.string().max(35),
  mobile: z.boolean().optional(),
  model: z.string().max(80).optional(),
  screenWidth: z.number().int().min(0).max(32768),
  screenHeight: z.number().int().min(0).max(32768),
  viewportWidth: z.number().int().min(0).max(32768),
  viewportHeight: z.number().int().min(0).max(32768),
  pixelRatio: z.number().min(0.1).max(16),
  cpuThreads: z.number().int().min(1).max(512).optional(),
  memoryGiB: z.number().min(0.1).max(1024).optional(),
  touchPoints: z.number().int().min(0).max(100),
});
export const deviceRecordSchema = z.strictObject({
  device: deviceSchema,
  networkPeer: z.string().max(64),
  lastSeen: z.iso.datetime(),
});
export const analyticsBatchSchema = z.strictObject({
  accountId: z.uuid(),
  device: deviceSchema.optional(),
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
  offlineProgression: z
    .strictObject({
      profile: offlineProfileSchema,
      revision: z.number().int(),
      updatedAt: z.iso.datetime(),
    })
    .nullable()
    .optional(),
  devices: z.array(deviceRecordSchema).optional(),
  events: z.array(
    z.object({
      occurredAt: z.iso.datetime().optional(),
      name: eventNameSchema,
      build: z.string(),
      receivedAt: z.iso.datetime(),
      data: eventContextSchema,
    }),
  ),
});
