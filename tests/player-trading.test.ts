import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner } from '../src/game/ui/botTurns';
import { completeSessionSetup } from './helpers/setup';
import { emptyBundle, type ResourceBundle } from '../src/game/core/domesticTrade';
import { MatchStore, decodeSave } from '../src/game/persistence/matchStore';
import { sheetContent } from '../src/game/ui/sheets';
import { applyUpdate } from '../src/pwa/updateFlow';
import { AppPlatform } from '../src/pwa/app';
import { proposeBotTrade } from '../src/game/core/botTrading';

const bundle = (parts: Partial<ResourceBundle>) => ({ ...emptyBundle(), ...parts });
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
function fixture(persist = false) {
    let raw: string | null = null;
    const storage = {
        getItem: () => raw,
        setItem: (_k: string, value: string) => {
            raw = value;
        },
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession(persist ? new MatchStore(storage) : undefined);
    session.start(4, false);
    completeSessionSetup(session);
    session.state!.phase = 'actions';
    session.state!.lastRoll = [3, 3];
    session.state!.players[0].resources = bundle({ wheat: 4, wool: 2 });
    session.state!.players[1].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    session.state!.players[2].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    session.state!.players[3].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    session.openSheet({ kind: 'domestic' });
    return {
        session,
        storage,
        raw: () => raw,
        reload: () => new GameSession(new MatchStore(storage)),
    };
}
function offer(session: GameSession, all = false) {
    if (!all) session.trading.selectTarget('player-2');
    session.trading.adjust('give', 'wheat', 1);
    session.trading.adjust('want', 'wood', 1);
    session.trading.send();
}

test('the personal hand stays visible without building controls in compose, offers, and review', () => {
    const { session } = fixture();
    const checkHand = () => {
        const content = sheetContent(session);
        expect(content.context).toContain('دارایی تو');
        expect(content.context?.match(/deal-hand-item/g)).toHaveLength(5);
        expect(content.body).not.toContain('deal-goal:');
        expect(content.body).not.toContain('deal-plan');
        expect(content.context).not.toContain('هدف:');
        return content;
    };
    checkHand();
    const incoming = session.trading.table.propose(session.state!, {
        from: 'player-2',
        to: 'player-1',
        give: bundle({ stone: 3 }),
        want: bundle({ wheat: 1 }),
    })!;
    session.trading.composing = false;
    const incomingContent = checkHand();
    expect(incomingContent.body).toContain(`data-action="deal-reject:${incoming.id}"`);
    expect(incomingContent.body).not.toContain(`data-action="deal-withdraw:${incoming.id}"`);
    session.trading.respond(incoming.id, true);
    expect(checkHand().key).toBe(`trade-review-${incoming.id}`);
});

test('unaffordable counters explain exact shortages and remain counterable without moving cards', () => {
    const { session } = fixture();
    const before = structuredClone(session.state);
    const incoming = session.trading.table.propose(session.state!, {
        from: 'player-2',
        to: 'player-1',
        give: bundle({ wood: 1 }),
        want: bundle({ wheat: 6 }),
    })!;
    session.trading.composing = false;
    const content = sheetContent(session);
    expect(content.body).toContain('برای پرداخت این پیشنهاد کم داری: ۲ گندم');
    expect(content.body).toContain(`data-action="deal-counter:${incoming.id}"`);
    expect(content.body).toMatch(
        new RegExp(`data-action="deal-accept:${incoming.id}"[^>]* disabled`),
    );
    session.trading.respond(incoming.id, true);
    expect(session.trading.table.find(incoming.id)?.status).toBe('open');
    session.trading.edit(incoming.id);
    session.trading.adjust('give', 'wheat', -1);
    session.trading.adjust('give', 'wheat', -1);
    expect(session.trading.draftError).toBeNull();
    expect(session.state).toEqual(before);
});

test('local unsolicited-offer filtering avoids impossible interruptions without informing bot planning', () => {
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 0;
    session.trading.sync();
    const proposal = proposeBotTrade(session.state!, 'player-2', 'player-1');
    expect(proposal).not.toBeNull();
    expect(session.trading.canPitchHuman).toBe(true);
    session.state!.players[0].resources = emptyBundle();
    expect(proposeBotTrade(session.state!, 'player-2', 'player-1')).toEqual(proposal);
    expect(session.trading.canPitchHuman).toBe(false);
    session.trading.pitchHuman();
    expect(session.sheet).toBeNull();
    expect(session.trading.waitingForHuman).toBe(false);
    session.state!.activePlayerIndex = 1;
    session.trading.sync();
    session.trading.initiateBot();
    expect(session.trading.table.pendingFor('player-1')).toHaveLength(0);
    expect(session.sheet).toBeNull();
});

test('human announcement gets paced bot responses; resources move only after final human confirmation', () => {
    vi.useFakeTimers();
    const { session } = fixture();
    const before = structuredClone(session.state);
    const runner = new BotTurnRunner(session, () => true, 10);
    offer(session, true);
    expect(session.trading.table.offers).toHaveLength(3);
    expect(session.state).toEqual(before);
    expect(session.trading.table.offers.every((o) => o.status === 'open')).toBe(true);
    vi.advanceTimersByTime(30);
    expect(session.trading.table.offers.every((o) => o.status === 'accepted')).toBe(true);
    expect(session.state).toEqual(before);
    const id = session.trading.table.offers[0].id;
    session.trading.review(id);
    const content = sheetContent(session);
    expect(content.title).toBe('تأیید نهایی معامله');
    expect(content.key).toBe(`trade-review-${id}`);
    expect(content.focusAction).toBe(`deal-finish:${id}`);
    expect(content.body).toContain('تو می‌دی');
    expect(content.body).toContain('تو می‌گیری');
    session.trading.finish(id);
    expect(session.state!.players[0].resources.wheat).toBe(3);
    expect(session.state!.players[0].resources.wood).toBe(1);
    expect(session.state!.players[1].resources.wheat).toBe(2);
    expect(session.transition?.action.kind).toBe('domestic-trade');
    expect(session.history[session.history.length - 1]?.text).toContain('گندم');
    expect(session.trading.table.offers.filter((o) => o.status === 'withdrawn')).toHaveLength(2);
    const after = session.state;
    session.trading.finish(id);
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(after);
    expect(sheetContent(session).body).toContain('معامله انجام شد');
    runner.destroy();
});

test('a bot initiates on its turn and waits for human reject/counter/accept without a timeout', () => {
    vi.useFakeTimers();
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 1;
    session.state!.players[1].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    const runner = new BotTurnRunner(session, () => true, 10);
    vi.advanceTimersByTime(10);
    expect(session.sheet?.kind).toBe('domestic');
    const incoming = session.trading.table.offers.find((o) => o.to === 'player-1')!;
    expect(incoming).toBeDefined();
    const state = session.state;
    vi.advanceTimersByTime(1000);
    expect(session.state).toBe(state);
    session.trading.respond(incoming.id, true);
    expect(session.state).toBe(state);
    session.trading.finish(incoming.id);
    expect(session.state).not.toBe(state);
    expect(session.state!.activePlayerIndex).toBe(1);
    expect(session.state!.players[0].resources.wood).toBe(1);
    session.closeSheet();
    vi.advanceTimersByTime(10);
    expect(session.transition?.action.kind).toBe('build');
    runner.destroy();
});

test('the human can propose to the acting bot off-turn, but cannot target two inactive bots', () => {
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 1;
    session.openSheet({ kind: 'domestic' });
    expect(session.trading.targets).toEqual(['player-2']);
    session.trading.selectTarget('player-3');
    expect(session.trading.target).toBeNull();
    offer(session);
    session.advanceBot();
    const accepted = session.trading.table.offers[0];
    expect(accepted.status).toBe('accepted');
    session.trading.review(accepted.id);
    session.trading.finish(accepted.id);
    expect(session.state!.activePlayerIndex).toBe(1);
    expect(session.state!.players[0].resources.wood).toBe(1);
});

test('bot counteroffers preserve the human give/receive orientation and require renewed consent', () => {
    const { session } = fixture();
    session.state!.players[0].resources.wool = 4;
    session.trading.selectTarget('player-2');
    session.trading.adjust('give', 'wool', 1);
    for (let i = 0; i < 3; i++) session.trading.adjust('want', 'wood', 1);
    const before = session.state;
    session.trading.send();
    session.advanceBot();
    const parent = session.trading.table.offers[0];
    const counter = session.trading.table.offers[1];
    expect(parent.status).toBe('countered');
    expect(counter.from).toBe('player-2');
    expect(sheetContent(session).body).toContain('پیشنهاد متقابل');
    expect(session.state).toBe(before);
    session.trading.edit(counter.id);
    expect(session.trading.give).toEqual(counter.want);
    expect(session.trading.want).toEqual(counter.give);
    session.trading.send();
    expect(counter.status).toBe('countered');
    session.advanceBot();
    expect(session.trading.table.offers.at(-1)?.status).toBe('accepted');
    expect(session.state).toBe(before);
});

test('withdrawal, rejection, tab change, and composing a replacement never move cards', () => {
    const { session } = fixture();
    const before = session.state;
    offer(session);
    session.advanceBot();
    session.trading.edit();
    expect(session.trading.table.offers[0].status).toBe('withdrawn');
    expect(session.state).toBe(before);
    session.trading.send();
    session.advanceBot();
    session.openSheet({ kind: 'trade' });
    expect(session.trading.waitingForHuman).toBe(false);
    expect(session.trading.table.offers.at(-1)?.status).toBe('withdrawn');
    session.closeSheet();
    session.openSheet({ kind: 'domestic' });
    session.trading.edit();
    session.trading.send();
    session.advanceBot();
    session.closeSheet();
    expect(session.trading.waitingForHuman).toBe(false);
    expect(session.state).toBe(before);
});

test('trade drafts respect inventory and overlap, and cannot be submitted under another modal', () => {
    const { session } = fixture();
    session.trading.adjust('give', 'wood', 1);
    expect(session.trading.give.wood).toBe(0);
    session.trading.adjust('give', 'wheat', 1);
    session.trading.adjust('want', 'wheat', 1);
    expect(session.trading.want.wheat).toBe(0);
    session.trading.adjust('want', 'wood', 1);
    session.openSheet({ kind: 'help' });
    session.trading.send();
    expect(session.trading.table.offers).toHaveLength(0);
});

test('pending offers and accepted-but-unconfirmed consent survive reload and PWA updating without transfers', async () => {
    const { session, reload } = fixture(true);
    offer(session);
    session.advanceBot();
    const expected = structuredClone(session.state);
    const id = session.trading.table.offers[0].id;
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {});
    expect(await applyUpdate(app, session)).toBe(true);
    const restored = reload();
    restored.resumeSaved();
    expect(restored.state).toEqual(expected);
    expect(restored.sheet?.kind).toBe('domestic');
    expect(restored.trading.table.find(id)?.status).toBe('accepted');
    restored.trading.review(id);
    restored.trading.finish(id);
    const finished = reload();
    finished.resumeSaved();
    expect(finished.state).toEqual(restored.state);
    expect(finished.trading.table.find(id)?.status).toBe('completed');
    expect(finished.trading.waitingForHuman).toBe(false);
});

test('malformed/stale consent snapshots are rejected; legacy snapshots without trading still load', () => {
    const { session, raw } = fixture(true);
    offer(session);
    const saved = JSON.parse(raw()!);
    expect(decodeSave(JSON.stringify(saved))).not.toBeNull();
    for (const mutate of [
        (s: typeof saved) => {
            s.trading.turn += 1;
        },
        (s: typeof saved) => {
            s.trading.offers[0].to = 'missing';
        },
        (s: typeof saved) => {
            s.trading.offers[0].give.wood = -1;
        },
        (s: typeof saved) => {
            s.trading.offers[0].want.wheat = 1;
        },
        (s: typeof saved) => {
            s.trading.offers[0].status = 'bogus';
        },
        (s: typeof saved) => {
            s.trading.offers.push(s.trading.offers[0]);
        },
    ]) {
        const invalid = structuredClone(saved);
        mutate(invalid);
        expect(decodeSave(JSON.stringify(invalid))).toBeNull();
    }
    delete saved.trading;
    expect(decodeSave(JSON.stringify(saved))).not.toBeNull();
});

test('help, hidden pages and unavailable application state pause negotiation timers', () => {
    vi.useFakeTimers();
    const { session } = fixture();
    let available = true;
    const runner = new BotTurnRunner(session, () => available, 10);
    offer(session);
    available = false;
    runner.refresh();
    vi.advanceTimersByTime(100);
    expect(session.trading.table.offers[0].status).toBe('open');
    available = true;
    runner.refresh();
    vi.advanceTimersByTime(10);
    expect(session.trading.table.offers[0].status).toBe('accepted');
    runner.destroy();
    expect(vi.getTimerCount()).toBe(0);
});

test('Anahita explains domestic trade and earns practice for a human party even off-turn', () => {
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 1;
    session.setTutorialEnabled(true);
    const read = () => {
        while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    };
    read();
    session.openSheet({ kind: 'domestic' });
    expect(session.tutorial.current).toBe('domestic');
    const state = session.state;
    session.trading.send();
    expect(session.state).toBe(state);
    read();
    offer(session);
    session.advanceBot();
    const id = session.trading.table.offers[0].id;
    session.trading.review(id);
    session.trading.finish(id);
    expect(session.tutorial.practiced.has('domestic')).toBe(true);
    expect(session.tutorial.current).toBeNull();
    expect(session.sheet).toBeNull();
});

test('bots trade with each other only on a participating bot turn and never earn human practice', () => {
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 1;
    session.state!.players[1].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    session.state!.players[2].resources = bundle({ wheat: 3, stone: 2 });
    session.save();
    const human = structuredClone(session.humanPlayer!.resources);
    const proposal = session.trading.table.propose(session.state!, {
        from: 'player-2',
        to: 'player-3',
        give: bundle({ wood: 1 }),
        want: bundle({ wheat: 1 }),
    })!;
    expect(proposal).toBeDefined();
    for (let i = 0; i < 5 && session.transition?.action.kind !== 'domestic-trade'; i++)
        session.advanceBot();
    expect(session.transition?.action.kind).toBe('domestic-trade');
    expect(session.state!.players[1].resources.wheat).toBe(2);
    expect(session.state!.players[2].resources.wheat).toBe(2);
    expect(session.humanPlayer!.resources).toEqual(human);
    expect(session.tutorial.practiced.has('domestic')).toBe(false);
    expect(session.sheet).toBeNull();
});

test('bot-to-bot negotiation cannot close a human editor or bypass another open workspace', () => {
    const { session } = fixture();
    session.closeSheet();
    session.state!.activePlayerIndex = 1;
    session.save();
    const proposal = session.trading.table.propose(session.state!, {
        from: 'player-2',
        to: 'player-3',
        give: bundle({ wood: 1 }),
        want: bundle({ wheat: 1 }),
    })!;
    session.openSheet({ kind: 'domestic' });
    const state = session.state;
    session.advanceBot();
    expect(session.state).toBe(state);
    expect(session.sheet?.kind).toBe('domestic');
    expect(proposal.status).toBe('open');
    session.openSheet({ kind: 'help' });
    session.advanceBot();
    expect(proposal.status).toBe('open');
});

test('an inactive bot can initiate a useful offer to the human active player without repeated unsolicited prompts', () => {
    vi.useFakeTimers();
    const { session } = fixture();
    session.closeSheet();
    const runner = new BotTurnRunner(session, () => true, 10);
    vi.advanceTimersByTime(10);
    expect(session.sheet?.kind).toBe('domestic');
    const offer = session.trading.table.offers.find((o) => o.to === 'player-1')!;
    expect(offer.status).toBe('open');
    expect(session.state!.activePlayerIndex).toBe(0);
    const before = session.state;
    session.trading.respond(offer.id, false);
    session.closeSheet();
    vi.advanceTimersByTime(100);
    expect(session.sheet).toBeNull();
    expect(session.state).toBe(before);
    expect(session.trading.table.offers.filter((o) => o.to === 'player-1')).toHaveLength(1);
    runner.destroy();
});

test.each([17, 91])(
    'seeded session %s progresses through autonomous negotiation without duplicated resources or stalls',
    (seed) => {
        let value = seed;
        vi.spyOn(Math, 'random').mockImplementation(() => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        });
        const session = new GameSession();
        session.start(4, false);
        completeSessionSetup(session);
        let transitions = 0;
        for (let step = 0; step < 1800 && session.state!.phase !== 'finished'; step++) {
            const transition = session.transition;
            if (transition && transition.id !== transitions) {
                transitions = transition.id;
                if (transition.action.kind === 'domestic-trade') {
                    for (const r of ['wood', 'brick', 'wheat', 'wool', 'stone'] as const)
                        expect(
                            transition.after.players.reduce((n, p) => n + p.resources[r], 0),
                        ).toBe(transition.before.players.reduce((n, p) => n + p.resources[r], 0));
                }
            }
            if (session.sheet?.kind === 'domestic') {
                const incoming = session.trading.table.offers.find(
                    (o) =>
                        o.to === session.humanPlayer!.id &&
                        o.status === 'open' &&
                        !session.trading.errorFor(o),
                );
                if (incoming) {
                    session.trading.respond(incoming.id, true);
                    session.trading.finish(incoming.id);
                }
                session.closeSheet();
            } else if (session.sheet?.kind === 'discard') {
                const count = session.state!.robberResolution!.discards[session.humanPlayer!.id];
                let left = count;
                for (const r of ['wood', 'brick', 'wheat', 'wool', 'stone'] as const) {
                    const n = Math.min(left, session.humanPlayer!.resources[r]);
                    for (let i = 0; i < n; i++) session.adjustDiscard(r, 1);
                    left -= n;
                }
                session.confirmDiscard();
            } else if (session.sheet?.kind === 'steal') {
                session.stealFrom(session.state!.robberResolution!.victims[0]);
            } else if (
                session.botReady &&
                ['discard', 'robber', 'steal', 'road-building'].includes(session.state!.phase)
            ) {
                session.advanceBot();
            } else if (session.isHumanTurn) {
                if (session.placement) session.preview(session.targets[0]);
                session.primary();
            } else session.advanceBot();
            for (const player of session.state!.players)
                for (const count of Object.values(player.resources))
                    expect(Number.isSafeInteger(count) && count >= 0).toBe(true);
        }
        expect(session.state!.phase).toBe('finished');
    },
);

test('a successful incoming rejection immediately returns to the board without moving resources', () => {
    const { session } = fixture();
    const proposal = session.trading.table.propose(session.state!, {
        from: 'player-2',
        to: 'player-1',
        give: bundle({ wheat: 1 }),
        want: bundle({ wood: 1 }),
    })!;
    const before = structuredClone(session.state);
    session.trading.respond(proposal.id, false);
    expect(proposal.status).toBe('rejected');
    expect(session.sheet).toBeNull();
    expect(session.state).toEqual(before);
});

test('final confirmation of an accepted offer closes the panel while preserving its receipt in the table', () => {
    const { session } = fixture();
    offer(session);
    session.advanceBot();
    const proposal = session.trading.table.offers[0];
    expect(proposal.status).toBe('accepted');
    session.trading.review(proposal.id);
    expect(session.sheet?.kind).toBe('domestic');
    const before = structuredClone(session.state);
    session.trading.finish(proposal.id);
    expect(proposal.status).toBe('completed');
    expect(session.sheet).toBeNull();
    expect(session.state).not.toEqual(before);
    expect(session.history[session.history.length - 1]?.text).toContain('معامله');
});

test('a final bot rejection of an outgoing offer closes the panel and a stale rejection does not dismiss it', () => {
    const { session } = fixture();
    session.trading.respond(9999, false);
    expect(session.sheet?.kind).toBe('domestic');
    session.state!.players[1].resources.stone = 5;
    const proposal = session.trading.table.propose(session.state!, {
        from: 'player-1',
        to: 'player-2',
        give: bundle({ wheat: 1 }),
        want: bundle({ stone: 5 }),
    })!;
    session.state!.players[1].resources.stone = 0;
    session.advanceBot();
    expect(proposal.status).toBe('rejected');
    expect(session.sheet).toBeNull();
});

test('new editor broadcasts without recipient controls and clears prior partner selection', () => {
    const { session } = fixture();
    session.trading.selectTarget('player-2');
    session.trading.edit();
    expect(session.trading.target).toBeNull();
    expect(sheetContent(session).body).not.toContain('deal-target:');
    expect(sheetContent(session).body).toContain('همهٔ رقیب‌ها');
    session.trading.adjust('give', 'wheat', 1);
    session.trading.adjust('want', 'wood', 1);
    session.trading.send();
    expect(session.trading.table.offers.map((o) => o.to)).toEqual([
        'player-2',
        'player-3',
        'player-4',
    ]);
});
