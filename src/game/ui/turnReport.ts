import { BUILD_COSTS } from '../core/building';
import { RESOURCE_TYPES } from '../core/types';
import { getPlayerSummary, remoteState } from './matchState';
import type { PresentedTransition } from './transitions';
import { characterForSeat } from './characters';
import { number } from './components';
import { FA } from './messages.fa';

/** Public receipts only. Never expose a remaining hand, drawn card, or stolen resource. */
export function turnReport(transition: PresentedTransition | null, humanId: string) {
    if (!transition || remoteState(transition.before) || remoteState(transition.after)) return null;
    const { before, after, action } = transition;
    const actor = before.players.find(
        (p) =>
            p.id ===
            (action.kind === 'discard'
                ? action.playerId
                : before.players[before.activePlayerIndex].id),
    )!;
    const bundle = (resources: Partial<Record<(typeof RESOURCE_TYPES)[number], number>>) =>
        RESOURCE_TYPES.filter((r) => resources[r])
            .map((r) => `${number(resources[r]!)} ${FA.resources[r]}`)
            .join('، ');
    const details: string[] = [];
    let headline = `${actor.name} · `;
    switch (action.kind) {
        case 'roll': {
            const dice = after.lastRoll!;
            const total = dice[0] + dice[1];
            headline += `تاس ${number(dice[0])} + ${number(dice[1])} = ${number(total)}`;
            if (total === 7)
                details.push('۷: تولیدی نداریم؛ دورریختن، جابه‌جایی اهریمن و دزدی باید کامل شوند.');
            else {
                for (const player of after.players) {
                    const grants = transition.production.filter(
                        (grant) => grant.playerId === player.id,
                    );
                    const gains = Object.fromEntries(
                        RESOURCE_TYPES.map((r) => [
                            r,
                            grants
                                .filter((g) => g.resource === r)
                                .reduce((n, g) => n + g.amount, 0),
                        ]),
                    );
                    if (grants.length) details.push(`${player.name} گرفت: ${bundle(gains)}`);
                }
                if (!details.length)
                    details.push('هیچ آبادی یا شهرِ بدون اهریمن روی این شماره تولید نکرد.');
                const blocked = before.board.tiles.filter(
                    (tile) => tile.number === total && tile.robber,
                );
                if (blocked.length)
                    details.push('اهریمن، تولید خانهٔ هم‌شمارهٔ خودش را مسدود کرد.');
            }
            break;
        }
        case 'setup-roll': {
            const dice = after.setup?.lastRoll?.dice;
            headline += dice
                ? `تاس آغازین ${number(dice[0])} + ${number(dice[1])}`
                : 'تاس تعیین آغازکننده';
            details.push('این تاس فقط آغازکننده را مشخص می‌کند؛ منبع و اهریمن فعال نمی‌شوند.');
            break;
        }
        case 'build':
        case 'setup': {
            headline += `${{ road: 'راه', settlement: 'آبادی', city: 'شهر' }[action.type]} ساخت`;
            if (action.kind === 'setup' || before.phase === 'road-building')
                details.push('ساخت رایگان؛ منبعی پرداخت نشد.');
            else details.push(`پرداخت: ${bundle(BUILD_COSTS[action.type])}`);
            if (action.kind === 'setup' && action.type === 'settlement') {
                const old = before.players.find((p) => p.id === actor.id)!;
                const next = after.players.find((p) => p.id === actor.id)!;
                const gains = Object.fromEntries(
                    RESOURCE_TYPES.map((r) => [r, next.resources[r] - old.resources[r]]),
                );
                if (RESOURCE_TYPES.some((r) => gains[r]))
                    details.push(`منابع آبادی دوم: ${bundle(gains)}`);
            }
            break;
        }
        case 'trade':
            headline += 'با بانک یا بندر مبادله کرد';
            details.push(
                `داد: ${number(action.ratio)} ${FA.resources[action.give]}؛ گرفت: ۱ ${FA.resources[action.receive]}`,
            );
            break;
        case 'domestic-trade': {
            const from = before.players.find((p) => p.id === action.terms.from)!;
            const to = before.players.find((p) => p.id === action.terms.to)!;
            headline = `معاملهٔ ${from.name} و ${to.name}`;
            details.push(
                `${from.name} داد: ${bundle(action.terms.give)}؛ ${to.name} داد: ${bundle(action.terms.want)}`,
            );
            break;
        }
        case 'buy-development':
            headline += 'کارت توسعه خرید';
            details.push('پرداخت: ۱ گندم، ۱ پشم، ۱ سنگ؛ نوع کارت مخفی است.');
            break;
        case 'play-development': {
            const card = before.development?.hands[actor.id].find((c) => c.id === action.cardId);
            headline += card
                ? `${{ knight: 'سرباز', 'road-building': 'راه‌سازی', monopoly: 'انحصار', 'year-of-plenty': 'فراوانی', 'victory-point': 'امتیاز' }[card.kind]} بازی کرد`
                : 'کارت توسعه بازی کرد';
            break;
        }
        case 'robber':
            headline += 'اهریمن را جابه‌جا کرد';
            details.push('تولید خانهٔ تازه مسدود شد؛ بندر همچنان قابل استفاده است.');
            break;
        case 'steal':
            headline += 'یک منبع تصادفی گرفت';
            details.push(
                `از ${before.players.find((p) => p.id === action.victimId)!.name}؛ نوع منبع عمومی نیست.`,
            );
            break;
        case 'discard':
            headline += 'منابع دور ریخت';
            details.push(
                `${number(RESOURCE_TYPES.reduce((n, r) => n + action.resources[r], 0))} منبع پس از تاس ۷؛ بدون تولید.`,
            );
            break;
        case 'end-turn':
            headline += 'نوبتش را تمام کرد';
            details.push(`نوبت ${after.players[after.activePlayerIndex].name} است.`);
            break;
        case 'declare-victory':
            headline += 'پیروزی را اعلام کرد';
            break;
        case 'synchronize':
            return null;
    }
    for (const player of after.players) {
        const delta =
            getPlayerSummary(after, player.id).score - getPlayerSummary(before, player.id).score;
        if (delta)
            details.push(
                `امتیاز عمومی ${player.name}: ${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`,
            );
    }
    const humanSeat = before.players.findIndex((p) => p.id === humanId);
    const actorSeat = before.players.findIndex((p) => p.id === actor.id);
    const character = characterForSeat(actorSeat, humanSeat);
    const conversation: { speaker: string; text: string }[] = [];
    // Short, event-driven exchanges, independent of strategy and gameplay randomness.
    if (
        action.kind === 'build' ||
        action.kind === 'trade' ||
        action.kind === 'domestic-trade' ||
        after.phase === 'finished'
    ) {
        const rival =
            character ??
            characterForSeat(
                (humanSeat + 1 + (before.turn % (before.players.length - 1))) %
                    before.players.length,
                humanSeat,
            )!;
        const text =
            after.phase === 'finished'
                ? after.winnerId === humanId
                    ? 'خوب بازی کردی! دور بعد دوباره می‌بینمت.'
                    : 'این دور چسبید! دفعهٔ بعد ببینیم چی می‌شه.'
                : action.kind === 'trade' || action.kind === 'domestic-trade'
                  ? rival.id === 'ashi'
                      ? 'معامله وقتی می‌چسبه که کار هر دومون رو راه بندازه!'
                      : 'معامله جور شد؛ حالا ببینیم چی می‌سازی!'
                  : character
                    ? character.reaction
                    : 'خوب ساختی! باید بیشتر حواسم بهت باشه.';
        conversation.push({ speaker: rival.name, text });
        conversation.push({
            speaker: 'آناهیتا',
            text:
                after.phase === 'finished'
                    ? 'خب، از این دور چی با خودت می‌بری دور بعد؟'
                    : action.kind === 'build'
                      ? 'هزینه و امتیاز این حرکت رو اینجا ببین؛ منابعت هم همیشه مال خودته.'
                      : 'تأیید کردی، منابع هم جابه‌جا شدن. حالا قدم بعدی چیه؟',
        });
    }
    return { headline, details, conversation };
}
