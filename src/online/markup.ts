import type { OnlineClient, Intent } from './client';
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
export const escape = (text: unknown) =>
    String(text).replace(
        /[&<>"']/g,
        (char) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? '',
    );
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
});
const label = (text: string, kind = 'p') => `<${kind} data-paint>${escape(text)}</${kind}>`;
const button = (text: string, action: string, disabled = false) =>
    `<button data-paint data-online="${escape(action)}" ${disabled ? 'disabled' : ''}>${escape(text)}</button>`;
const input = (title: string, key: string, value: string | number, type = 'text', max = '80') =>
    `<label>${label(title, 'span')}<input data-paint aria-label="${escape(title)}" data-draft="${key}" value="${escape(value)}" type="${type}" ${type === 'number' ? 'min="0" max="999" step="1"' : `maxlength="${max}"`}></label>`;
export function intentLabel(intent: Intent, game: GameView): string {
    switch (intent.kind) {
        case 'setup-roll':
            return 'تاس برای آغاز';
        case 'roll':
            return 'تاس بریز';
        case 'end-turn':
            return 'پایان نوبت';
        case 'buy-development':
            return 'خرید کارت';
        case 'declare-victory':
            return 'اعلام پیروزی';
        case 'setup':
            return intent.type === 'road' ? 'راه آغازین' : 'آبادی آغازین';
        case 'build':
            return { road: 'راه بساز', settlement: 'آبادی بساز', city: 'شهر بساز' }[intent.type];
        case 'robber':
            return 'جابجایی اهریمن';
        case 'steal':
            return `برداشت از ${game.players.find((p) => p.id === intent.victimId)?.name ?? ''}`;
        case 'trade':
            return `${intent.ratio} ${resourceLabels[intent.give]} ← ۱ ${resourceLabels[intent.receive]}`;
        case 'play-development':
            return `${cardLabels[game.self.developmentCards.find((c) => c.id === intent.cardId)?.kind ?? 'knight']}${intent.choice?.resource ? ` · ${resourceLabels[intent.choice.resource]}` : ''}${intent.choice?.resources ? ` · ${intent.choice.resources.map((r) => resourceLabels[r]).join(' و ')}` : ''}`;
        default:
            return 'تأیید';
    }
}
export function actionGroup(intent: Intent) {
    return intent.kind === 'setup' || intent.kind === 'build'
        ? `${intent.kind}-${intent.type}`
        : intent.kind === 'play-development'
          ? `card-${intent.cardId}`
          : intent.kind;
}
export function onlineMarkup(client: OnlineClient, draft: Drafts) {
    const snapshot = client.snapshot;
    const busy = client.busy;
    let body = '';
    if (!client.session) {
        body =
            label('با نام خود وارد شوید. نشست شما روی همین مرورگر حفظ می‌شود.') +
            input('نام شما', 'name', draft.name) +
            button('ورود مهمان', 'guest', busy);
    } else if (!snapshot) {
        body =
            label(`درود ${client.session.name}`, 'h2') +
            input('نام بازی', 'lobby', draft.lobby) +
            button('ساخت اتاق خصوصی', 'create', busy) +
            input('کد دعوت', 'code', draft.code, 'text', '12') +
            button('پیوستن با کد', 'join', busy) +
            client.matches
                .map((m) =>
                    button(
                        `${m.name} · ${m.status === 'finished' ? 'پایان‌یافته' : 'ادامه بازی'}`,
                        `open:${m.id}`,
                        busy,
                    ),
                )
                .join('');
    } else if (snapshot.status === 'lobby') {
        body =
            label(snapshot.name, 'h2') +
            label(`کد دعوت: ${snapshot.code}`) +
            button('کپی پیوند دعوت', 'invite') +
            snapshot.seats
                .map(
                    (seat, index) =>
                        `<section class="online-card">${label(`${seat.isYou ? 'شما · ' : ''}${seat.occupied ? seat.name : 'جای خالی'} · ${seat.ready ? 'آماده' : 'منتظر'}`)}${snapshot.host && index > 0 && !seat.isYou && !(!seat.bot && seat.occupied) ? button(seat.bot ? 'حذف ربات' : 'افزودن ربات', `bot:${index}:${!seat.bot}`, busy) : ''}</section>`,
                )
                .join('') +
            button(
                snapshot.seats.find((s) => s.isYou)?.ready ? 'لغو آمادگی' : 'آماده‌ام',
                'ready',
                busy,
            ) +
            (snapshot.host
                ? button(
                      'آغاز بازی',
                      'start',
                      busy || snapshot.seats.some((s) => !s.occupied || !s.ready),
                  )
                : '');
    } else if (snapshot.game) {
        const game = snapshot.game;
        const actor = game.players.find((p) => p.id === game.actorId);
        const phases = {
            'setup-roll': 'انتخاب آغازگر',
            'setup-settlement': 'آبادی آغازین',
            'setup-road': 'راه آغازین',
            roll: 'تاس',
            actions: 'ساخت و تجارت',
            discard: 'دورریختن منابع',
            robber: 'جابجایی اهریمن',
            steal: 'انتخاب حریف',
            'road-building': 'راه رایگان',
            finished: 'پایان بازی',
        };
        body =
            label(`${snapshot.name} · ${phases[game.phase]}`, 'h2') +
            label(
                game.winnerId
                    ? `برنده: ${game.players.find((p) => p.id === game.winnerId)?.name ?? ''}`
                    : `نوبت ${actor?.name ?? ''}${game.actorId === game.self.id ? ' · شما' : ''}`,
            ) +
            label(game.lastRoll ? `تاس: ${game.lastRoll.join(' + ')}` : 'تاس هنوز ریخته نشده است') +
            `<div class="online-standings">${game.players.map((p) => label(`${p.name}: ${p.publicScore} امتیاز · ${p.resourceCount} منبع · ${p.developmentCount} کارت`, 'span')).join('')}</div>` +
            `<div class="online-hand">${resources.map((r) => label(`${resourceLabels[r]}: ${game.self.resources[r]}`, 'span')).join('')}</div>` +
            label(`امتیاز شما: ${game.self.score}`) +
            game.self.developmentCards
                .map((card) =>
                    label(
                        `${cardLabels[card.kind]} · ${card.boughtOnRound === game.turn ? 'خرید این دور' : 'در دست'}`,
                        'span',
                    ),
                )
                .join('');
        const groups = [
            ...new Map(
                game.availableIntents.map((intent) => [actionGroup(intent), intent]),
            ).entries(),
        ];
        body += `<div class="online-actions">${groups.map(([key, intent]) => button(intentLabel(intent, game), `tool:${key}`, busy || !!client.pending)).join('')}</div>`;
        if (draft.tool) {
            const choices = game.availableIntents.filter(
                (intent) => actionGroup(intent) === draft.tool,
            );
            if (choices.length) {
                body += label('مقصد یا گزینه را انتخاب و سپس تأیید کنید.');
                if (
                    choices.some(
                        (c) => c.kind === 'build' || c.kind === 'setup' || c.kind === 'robber',
                    )
                )
                    body += `<div class="online-choices">${choices.map((intent, i) => button(`${i + 1} · ${'targetId' in intent ? intent.targetId : ''}`, `select:${game.availableIntents.indexOf(intent)}`, busy)).join('')}</div>`;
                else
                    body += `<div class="online-choices">${choices.map((intent) => button(intentLabel(intent, game), `select:${game.availableIntents.indexOf(intent)}`, busy)).join('')}</div>`;
            }
        }
        const chosen = game.availableIntents[draft.target];
        if (chosen)
            body +=
                label(
                    `انتخاب: ${intentLabel(chosen, game)}${'targetId' in chosen ? ` · ${chosen.targetId}` : ''}`,
                ) +
                button('تأیید حرکت', 'confirm', busy || !!client.pending) +
                button('لغو انتخاب', 'cancel');
        const discard = game.discardObligations[game.self.id] ?? 0;
        if (game.actorId === game.self.id && game.phase === 'discard')
            body +=
                label(`دقیقاً ${discard} منبع را انتخاب کنید.`) +
                resources
                    .map((r) =>
                        input(resourceLabels[r], `discard.${r}`, draft.discard[r] ?? 0, 'number'),
                    )
                    .join('') +
                button('تأیید دورریختن', 'discard', busy || !!client.pending);
        if (game.phase === 'actions') {
            body += button('پیشنهاد تجارت', 'offer-form', busy || !!client.pending);
            if (draft.selected === 'offer')
                body +=
                    label('برای پیشنهاد یا پیشنهاد متقابل، منابع پرداختی و دریافتی را مشخص کنید.') +
                    game.players
                        .filter(
                            (p) =>
                                p.id !== game.self.id &&
                                (p.id === game.activePlayerId ||
                                    game.activePlayerId === game.self.id),
                        )
                        .map((p) => button(`مخاطب: ${p.name}`, `recipient:${p.id}`))
                        .join('') +
                    label(
                        `مخاطب انتخاب‌شده: ${game.players.find((p) => p.id === draft.to)?.name ?? 'انتخاب نشده'}`,
                    ) +
                    resources
                        .map(
                            (r) =>
                                input(
                                    `پرداخت ${resourceLabels[r]}`,
                                    `offerGive.${r}`,
                                    draft.offerGive[r] ?? 0,
                                    'number',
                                ) +
                                input(
                                    `دریافت ${resourceLabels[r]}`,
                                    `offerWant.${r}`,
                                    draft.offerWant[r] ?? 0,
                                    'number',
                                ),
                        )
                        .join('') +
                    button('ارسال پیشنهاد', 'offer', busy || !draft.to || !!client.pending);
        }
        for (const offer of snapshot.offers) {
            body += `<section class="online-card">${label(`پیشنهاد ${offer.id} · ${game.players.find((p) => p.id === offer.from)?.name ?? ''} ← ${game.players.find((p) => p.id === offer.to)?.name ?? ''}`)}${label(
                `پرداخت: ${resources
                    .filter((r) => offer.give[r])
                    .map((r) => `${offer.give[r]} ${resourceLabels[r]}`)
                    .join('، ')} · دریافت: ${resources
                    .filter((r) => offer.want[r])
                    .map((r) => `${offer.want[r]} ${resourceLabels[r]}`)
                    .join('، ')}`,
            )}${label({ open: 'منتظر پاسخ', accepted: 'پذیرفته‌شده؛ در انتظار تأیید نهایی', rejected: 'رد شد', countered: 'پیشنهاد متقابل', withdrawn: 'پس گرفته شد', completed: 'انجام شد', expired: 'نامعتبر' }[offer.status])}${offer.status === 'open' && offer.to === game.self.id ? button('قبول', `accept:${offer.id}`, busy || !!client.pending) + button('رد', `reject:${offer.id}`, busy || !!client.pending) + button('پیشنهاد متقابل', `counter:${offer.id}`) : ''}${offer.status === 'accepted' ? button('تأیید نهایی مبادله', `trade-confirm:${offer.id}`, busy || !!client.pending) : ''}${['open', 'accepted'].includes(offer.status) ? button('انصراف', `withdraw:${offer.id}`, busy || !!client.pending) : ''}</section>`;
        }
        if (game.winnerId) body += button('بازی دوباره با اتاق تازه', 'rematch', busy);
    }
    return `<header>${label('بازی آنلاین', 'h1')}${button(snapshot ? 'اتاق‌ها' : 'بازگشت', snapshot ? 'back' : 'exit')}${label(client.connected ? 'متصل' : snapshot ? 'در حال اتصال مجدد…' : 'اتاق خصوصی با دوستان', 'small')}</header><section class="online-board" aria-label="جزیره بازی" ${snapshot?.game ? '' : 'hidden'}></section><main class="online-panel">${client.error ? `<p data-paint role="alert">${escape(client.error)}</p>` : ''}${client.pending ? label('نتیجه درخواست قبلی هنوز قطعی نیست. ابتدا همان درخواست را پیگیری کنید.') + button('پیگیری همان درخواست', 'retry', busy) : ''}${body}</main>`;
}
