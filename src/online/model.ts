import type { GameView } from './shared/src/online/wire';
export const resources = ['wood', 'brick', 'wheat', 'wool', 'stone'] as const;
export const resourceLabels = {
    wood: 'چوب',
    brick: 'آجر',
    wheat: 'گندم',
    wool: 'پشم',
    stone: 'سنگ',
};
export const cardLabels = {
    knight: 'شوالیه',
    'victory-point': 'امتیاز پیروزی',
    'road-building': 'راه‌سازی',
    monopoly: 'انحصار',
    'year-of-plenty': 'فراوانی',
};
export interface Drafts {
    name: string;
    code: string;
    lobby: string;
    tool: string;
    target: number;
    give: string;
    receive: string;
    discard: Record<string, number>;
    offerGive: Record<string, number>;
    offerWant: Record<string, number>;
    to: string;
    selected: string;
    screen: 'home' | 'create' | 'join';
    notice: string;
}
export const newDrafts = (): Drafts => ({
    name: '',
    code: '',
    lobby: 'بازی دوستانه',
    tool: '',
    target: -1,
    give: 'wood',
    receive: 'brick',
    discard: {},
    offerGive: {},
    offerWant: {},
    to: '',
    selected: '',
    screen: 'home',
    notice: '',
});
/** Validate drafts against this seat's projected hand; the server still owns consent. */
export function validOffer(game: GameView, draft: Drafts): boolean {
    const recipient = game.players.some(
        (player) =>
            player.id === draft.to &&
            player.id !== game.self.id &&
            (game.activePlayerId === game.self.id || player.id === game.activePlayerId),
    );
    const valid = resources.every((resource) => {
        const give = draft.offerGive[resource] ?? 0;
        const want = draft.offerWant[resource] ?? 0;
        return (
            Number.isSafeInteger(give) &&
            Number.isSafeInteger(want) &&
            give >= 0 &&
            want >= 0 &&
            give <= game.self.resources[resource] &&
            !(give && want)
        );
    });
    return (
        recipient &&
        valid &&
        resources.some((r) => (draft.offerGive[r] ?? 0) > 0) &&
        resources.some((r) => (draft.offerWant[r] ?? 0) > 0)
    );
}
export function validDiscard(game: GameView, draft: Drafts): boolean {
    return (
        resources.every(
            (r) =>
                Number.isSafeInteger(draft.discard[r] ?? 0) &&
                (draft.discard[r] ?? 0) >= 0 &&
                (draft.discard[r] ?? 0) <= game.self.resources[r],
        ) &&
        resources.reduce((total, r) => total + (draft.discard[r] ?? 0), 0) ===
            (game.discardObligations[game.self.id] ?? 0)
    );
}
