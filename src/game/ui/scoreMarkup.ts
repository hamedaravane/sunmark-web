import { longestRoad } from '../core/scoring';
import type { MatchState } from './matchState';
import { actionEmblem } from './developmentMarkup';
import { escape, number } from './components';

export function scoreAwards(state: MatchState, playerId: string, viewerId = playerId): string {
    if (!state.development) return ''; // Historical six-point results had no scoring titles.
    const holder = (id: string | null | undefined) =>
        id ? escape(state.players.find((p) => p.id === id)!.name) : 'بدون صاحب';
    const subject =
        viewerId === playerId ? 'تو' : escape(state.players.find((p) => p.id === playerId)!.name);
    const road = longestRoad(state.board, playerId),
        army = state.development?.knights[playerId] ?? 0;
    return `<section class="score-awards"><div class="score-award">${actionEmblem('road', 32)}<span>طولانی‌ترین راه · ${holder(state.awards?.longestRoad)}<small>طول پیوستهٔ ${subject}: ${number(road)} · حداقل ۵${state.awards?.longestRoad === playerId ? ' · +۲ امتیاز' : ''}</small></span></div><div class="score-award">${actionEmblem('knight', 32)}<span>بزرگ‌ترین ارتش · ${holder(state.awards?.largestArmy)}<small>شوالیهٔ بازی‌شدهٔ ${subject}: ${number(army)} · حداقل ۳${state.awards?.largestArmy === playerId ? ' · +۲ امتیاز' : ''}</small></span></div></section>`;
}

export function awardChanges(before: MatchState, after: MatchState): string {
    return (['longestRoad', 'largestArmy'] as const)
        .filter((key) => before.awards?.[key] !== after.awards?.[key])
        .map((key) => {
            const label = key === 'longestRoad' ? 'طولانی‌ترین راه' : 'بزرگ‌ترین ارتش';
            const id = after.awards?.[key];
            return id
                ? `${label} به ${after.players.find((p) => p.id === id)!.name} رسید؛ ۲ امتیاز`
                : `${label} بی‌صاحب شد`;
        })
        .join('؛ ');
}
