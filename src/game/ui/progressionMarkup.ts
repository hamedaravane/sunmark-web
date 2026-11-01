import {
    BADGES,
    SEALS,
    experience,
    metric,
    type Profile,
    type ProgressionStore,
    type Reward,
} from '../progression/progression';
import { artSprite, button, escape, number, playerAvatar } from './components';
import { PLAYER_NAME_LIMIT } from './playerIdentity';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';

export function experienceBar(
    profile: Pick<Profile, 'xp'> & { level?: number; levelXP?: number; nextLevelXP?: number },
): string {
    const local = experience(profile.xp);
    const xp = {
        level: profile.level ?? local.level,
        current: profile.levelXP ?? local.current,
        required: profile.nextLevelXP ?? local.required,
    };
    const percent = xp.current / xp.required;
    return `<div class="hub-xp"><div class="row-between"><span>سطح ${number(xp.level)}</span><span>${number(xp.current)} از ${number(xp.required)} تجربه</span></div><span class="hub-progress" role="progressbar" aria-label="تجربه تا سطح بعد" aria-valuemin="0" aria-valuemax="${xp.required}" aria-valuenow="${xp.current}" data-progress="${percent}"></span></div>`;
}

export function rewardMarkup(reward: Reward, profile: Profile): string {
    const level = experience(profile.xp).level;
    return `<section class="hub-reward" aria-label="پاداش دریافت‌شده"><div class="row-between"><strong>${reward.source === 'practice' ? 'تمرین کامل شد' : reward.won ? 'پاداش پیروزی' : 'پاداش پایان بازی'}</strong><span class="hub-tag">دریافت شد</span></div><p class="hub-reward-values">${number(reward.xp)} تجربه <span>+ ${number(reward.coins)} سکه</span></p>${level > reward.previousLevel ? `<p>به سطح ${number(level)} رسیدی!</p>` : ''}${
        reward.badges.length
            ? `<p class="hub-badge-names">نشان تازه: ${reward.badges
                  .map((id) => BADGES.find((b) => b.id === id)?.name ?? '')
                  .map(escape)
                  .join('، ')}</p>`
            : ''
    }<small>پیشرفت آفلاین · روی همین دستگاه</small></section>`;
}

export function storageNotice(store: ProgressionStore): string {
    return store.status === 'unavailable'
        ? '<p class="availability" role="status">ذخیرهٔ پیشرفت در دسترس نیست؛ پاداش‌های این نشست پس از بستن بازی ممکن است از دست بروند.</p>'
        : store.status === 'invalid'
          ? '<p class="availability" role="status">ذخیرهٔ پیشرفت قابل خواندن نبود. ذخیرهٔ بازی اصلی جدا و محفوظ است.</p>'
          : '';
}

export function progressionSheet(session: MatchSession): SheetContent | null {
    const store = session.progression;
    if (!store) return null;
    const kind = session.sheet?.kind;
    const profile = store.snapshot;
    const back = button('بازگشت به خانه', 'close-sheet', { className: 'button full-width' });
    if (kind === 'profile-name')
        return {
            title: 'نام بازیکن',
            key: 'profile-name',
            preserveInput: true,
            body: `<label class="name-label" for="player-name">دوست داری چه صدات کنیم؟</label><div class="name-entry"><input id="player-name" data-action="player-name" name="player-name" type="text" dir="auto" maxlength="${PLAYER_NAME_LIMIT}" value="${escape(session.playerNameDraft)}" autocomplete="nickname" enterkeyhint="done"><span class="name-entry-value" dir="auto" aria-hidden="true">${escape(session.playerNameDraft || 'اسمت رو بنویس…')}</span></div><p class="footnote">نام پروفایل برای بازی‌های تازه استفاده می‌شود؛ نام بازی ذخیره‌شده تغییر نمی‌کند.</p>`,
            footer: button('ذخیرهٔ نام', 'hub-save-name', {
                className: 'button button--primary full-width',
            }),
        };
    if (kind === 'profile')
        return {
            title: 'پروفایل من',
            key: 'player-profile',
            tone: 'turquoise',
            body: `<div class="hub-profile-heading" style="--owner:#${store.seal.color.toString(16)}">${playerAvatar('human')}<div><h3 dir="auto">${escape(profile.name)}</h3><p>${escape(store.seal.name)} · سطح ${number(experience(profile.xp).level)}</p></div></div>${experienceBar(profile)}<div class="hub-stat-grid"><div class="hub-stat"><strong>${number(profile.matches)}</strong><span>بازی آفلاین</span></div><div class="hub-stat"><strong>${number(profile.wins)}</strong><span>برد</span></div><div class="hub-stat"><strong>${number(profile.matches - profile.wins)}</strong><span>باخت</span></div><div class="hub-stat"><strong>${number(profile.coins)}</strong><span>سکه</span></div></div><p class="sheet-intro">${number(profile.xp)} تجربهٔ کل · ${number(profile.badges.length)} نشان از ${number(BADGES.length)}</p>${button('تغییر نام', 'hub-edit-name', { className: 'button full-width' })}${button('دیدن نشان‌ها', 'hub:achievements', { className: 'button full-width' })}${button('رتبه و رقابت آنلاین', 'hub:competitive', { className: 'button full-width' })}${profile.lastReward ? rewardMarkup(profile.lastReward, profile) : '<p class="footnote">با کامل‌کردن تمرین یا یک بازی آفلاین، اولین پاداشت را بگیر.</p>'}<p class="footnote">این پروفایل روی همین دستگاه ذخیره می‌شود. پاک‌کردن داده‌های مرورگر آن را پاک می‌کند؛ هنوز به حساب آنلاین متصل نیست.</p>${storageNotice(store)}`,
            footer: back,
        };
    if (kind === 'achievements')
        return {
            title: 'نشان‌ها و مسیر سفر',
            key: 'player-achievements',
            tone: 'amethyst',
            body: `<p class="sheet-intro">هر هدف را یک‌بار کامل کن؛ نشان و پاداشش خودکار به پروفایلت اضافه می‌شود.</p><div class="hub-achievements">${BADGES.map(
                (badge) => {
                    const earned = profile.badges.includes(badge.id);
                    const progress = Math.min(badge.goal, metric(profile, badge.metric));
                    return `<article class="hub-achievement${earned ? ' is-earned' : ''}"><div class="hub-badge-icon" data-earned="${earned}" aria-hidden="true">${artSprite('rosette', 32)}</div><div><h3>${badge.name}<small>${earned ? 'گرفته‌ای' : `${number(progress)} از ${number(badge.goal)}`}</small></h3><p>${badge.description}</p><span>${number(badge.xp)} تجربه + ${number(badge.coins)} سکه</span><span class="hub-progress" role="progressbar" aria-label="${badge.name}" aria-valuemin="0" aria-valuemax="${badge.goal}" aria-valuenow="${progress}" data-progress="${progress / badge.goal}"></span></div></article>`;
                },
            ).join('')}</div>${storageNotice(store)}`,
            footer: back,
        };
    if (kind === 'cosmetics')
        return {
            title: 'گنجینهٔ مهرها',
            key: 'player-cosmetics',
            tone: 'amethyst',
            context: `<p class="hub-balance">دارایی تو: ${number(profile.coins)} سکه</p>`,
            body: `<p class="sheet-intro">با سکه‌های بازی، مهر پروفایلت را شخصی کن. مهرها فقط ظاهر پروفایل را عوض می‌کنند.</p><div class="hub-cosmetics">${SEALS.map(
                (seal) => {
                    const owned = profile.owned.includes(seal.id);
                    const equipped = profile.equipped === seal.id;
                    return `<article class="hub-cosmetic" style="--owner:#${seal.color.toString(16)}">${playerAvatar('human')}<div><h3>${seal.name}</h3><p>${equipped ? 'مهر فعلی تو' : owned ? 'در گنجینهٔ تو' : `${number(seal.cost)} سکه`}</p></div>${button(equipped ? 'انتخاب شده' : owned ? 'انتخاب' : 'خرید و انتخاب', `hub-equip:${seal.id}`, { pressed: equipped, disabled: !owned && profile.coins < seal.cost, label: `${equipped ? 'انتخاب‌شده' : owned ? 'انتخاب' : 'خرید'} ${seal.name}${!owned ? `؛ ${number(seal.cost)} سکه${profile.coins < seal.cost ? '؛ سکه کافی نداری' : ''}` : ''}` })}</article>`;
                },
            ).join(
                '',
            )}</div><p class="footnote">هر خرید یک‌بار هزینه دارد؛ انتخاب دوبارهٔ مهرهای خریده‌شده رایگان است. رنگ مهر، رنگ مهره‌های داخل بازی را تغییر نمی‌دهد.</p>${storageNotice(store)}`,
            footer: back,
        };
    return null;
}
