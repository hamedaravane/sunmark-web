import { icon } from '../../ui/icons';
import {
    onlineProgression,
    progressionStatus,
    rankLabel,
    referralLink,
} from '../../account/progression';
import { playerIdentity } from '../../account/identity';
import type { ProgressionProfile } from '../../online/shared/src/online/progression.schemas';
import { BADGES, SEALS } from '../progression/progression';
import { button, escape, number, playerAvatar } from './components';
import { experienceBar } from './progressionMarkup';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';
const badgeName = (id: string) =>
    id === 'ambassador' ? 'سفیر دوستان' : (BADGES.find((b) => b.id === id)?.name ?? id);
export function onlineRewardMarkup(profile: ProgressionProfile, matchId: string): string {
    const reward = profile.rewards.find((r) => r.source === `match:${matchId}`);
    return reward
        ? `<section class="hub-reward"><strong>پاداش آنلاین دریافت شد</strong><p class="hub-reward-values">${number(reward.xp)} تجربه + ${number(reward.coins)} سکه</p>${reward.ratingChange ? `<p>تغییر رتبه: <bdi dir="ltr">${reward.ratingChange > 0 ? '+' : ''}${number(reward.ratingChange)}</bdi> · ${escape(rankLabel(profile))}</p>` : ''}<small>در حساب آنلاین ذخیره شد</small></section>`
        : '';
}
export function onlineProgressionSheet(session: MatchSession): SheetContent | null {
    const kind = session.sheet?.kind;
    if (
        ![
            'competitive',
            'online-profile',
            'online-achievements',
            'online-cosmetics',
            'referrals',
        ].includes(kind ?? '')
    )
        return null;
    const profile = onlineProgression();
    const status = progressionStatus();
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const notice = status.error
        ? `<p role="alert" class="availability">${escape(status.error)}</p>`
        : '';
    const close = button('بازگشت به خانه', 'close-sheet', { className: 'button full-width' });
    if (kind === 'competitive')
        return {
            title: 'رقابت رتبه‌بندی‌شده',
            key: 'competitive-live',
            tone: 'lapis',
            body: `<h3 class="hub-rank-title">${escape(rankLabel(profile))}</h3><p>با چهار بازیکن واقعی وارد رقابت می‌شوی. برد و قدرت حریف‌ها روی رتبه اثر دارند؛ تجربه و سکه، مهارت رقابتی نیستند.</p>${profile ? `<div class="hub-stat-grid"><div class="hub-stat"><strong>${number(profile.rankedMatches)}</strong><span>رقابت کامل</span></div><div class="hub-stat"><strong>${number(profile.rankedWins)}</strong><span>برد رقابتی</span></div></div><p>${profile.placementGamesRemaining ? `پس از ${number(profile.placementGamesRemaining)} بازی ارزیابی دیگر، رتبه و مدالت نمایش داده می‌شوند.` : `رتبهٔ کنونی: ${escape(rankLabel(profile))}`}</p>` : '<p>برای ذخیرهٔ رتبه و بازی روی دستگاه دیگر، وارد حساب آنلاین شو.</p>'}<p class="footnote">نوبت‌ها در این نسخه زمان‌سنج ندارند. برای یک بازی کامل آماده باش؛ پس از قطع اتصال، همان بازی را ادامه می‌دهی. بازی خصوصی و آفلاین رتبه را تغییر نمی‌دهند.</p>${notice}`,
            footer: `${button('پیدا کردن رقابت', 'ranked', { className: 'button button--primary full-width', disabled: !online || status.busy })}${close}`,
        };
    if (!profile)
        return {
            title: 'حساب آنلاین',
            key: 'online-profile-unavailable',
            body:
                '<p>برای دیدن سکه‌ها، تجربه، رتبه و پاداش دعوت، حساب آنلاین را همگام کن. پیشرفت آفلاین جداگانه روی همین دستگاه محفوظ است.</p>' +
                notice,
            footer: `${button('ورود و همگام‌سازی', 'account-login', { className: 'button button--primary full-width', disabled: !online })}${button('تلاش برای همگام‌سازی', 'online-refresh', { className: 'button full-width', disabled: !online })}${close}`,
        };
    if (kind === 'online-profile')
        return {
            title: 'پروفایل آنلاین',
            key: 'online-profile',
            tone: 'turquoise',
            body: `<h3 dir="auto">${escape(playerIdentity()?.name ?? '')}</h3><p>${escape(rankLabel(profile))}</p>${experienceBar(profile)}<div class="hub-stat-grid"><div class="hub-stat"><strong>${number(profile.matches)}</strong><span>بازی آنلاین</span></div><div class="hub-stat"><strong>${number(profile.wins)}</strong><span>برد</span></div><div class="hub-stat"><strong>${number(profile.matches - profile.wins)}</strong><span>باخت</span></div><div class="hub-stat"><strong>${number(profile.coins)}</strong><span>سکهٔ آنلاین</span></div></div>${button('مدال و رتبهٔ رقابتی', 'hub:competitive', { className: 'button full-width' })}${button('دعوت دوستان و پاداش', 'hub:referrals', { className: 'button full-width' })}${button('نشان‌های آنلاین', 'hub:online-achievements', { className: 'button full-width' })}${button('گنجینهٔ آنلاین', 'hub:online-cosmetics', { className: 'button full-width' })}${button('پیشرفت آفلاین این دستگاه', 'hub:profile', { className: 'button button--quiet full-width' })}<p class="footnote">این دارایی و رتبه در سرور ذخیره می‌شوند و پس از ورود با همین حساب، روی دستگاه‌های دیگر هم در دسترس‌اند. سکه و تجربهٔ آفلاین به آن منتقل نمی‌شوند.</p>${notice}`,
            footer: `${button('همگام‌سازی دوباره', 'online-refresh', { className: 'button full-width', disabled: status.busy })}${close}`,
        };
    if (kind === 'online-achievements')
        return {
            title: 'نشان‌های آنلاین',
            key: 'online-achievements',
            tone: 'amethyst',
            body: `<div class="hub-achievements">${[...BADGES.filter((b) => b.id !== 'practice'), { id: 'ambassador', name: 'سفیر دوستان', description: 'اولین دعوت واجد شرایطت را کامل کن' }].map((badge) => `<article class="hub-achievement${profile.badges.some((id) => id === badge.id) ? ' is-earned' : ''}"><div class="hub-badge-icon" data-earned="${profile.badges.some((id) => id === badge.id)}" aria-hidden="true">${icon('achievement', 32)}</div><div><h3>${escape(badgeName(badge.id))}</h3><p>${escape(badge.description)}</p><span>${profile.badges.some((id) => id === badge.id) ? 'گرفته‌ای' : 'هنوز کامل نشده'}</span></div></article>`).join('')}</div>${notice}`,
            footer: close,
        };
    if (kind === 'online-cosmetics')
        return {
            title: 'گنجینهٔ آنلاین',
            key: 'online-cosmetics',
            tone: 'amethyst',
            context: `<p class="hub-balance">${number(profile.coins)} سکهٔ آنلاین</p>`,
            body: `<p>مهرها فقط ظاهر پروفایل را عوض می‌کنند؛ خرید روی همهٔ دستگاه‌های حسابت همگام می‌شود.</p><div class="hub-cosmetics">${profile.catalog
                .map((seal) => {
                    const owned = profile.ownedSeals.includes(seal.id),
                        equipped = profile.equippedSeal === seal.id;
                    const color = SEALS.find((s) => s.id === seal.id)?.color ?? SEALS[0].color;
                    return `<article class="hub-cosmetic" style="--owner:#${color.toString(16)}">${playerAvatar('human')}<div><h3>${escape(seal.name)}</h3><p>${owned ? 'در گنجینهٔ تو' : `${number(seal.cost)} سکه`}</p></div>${button(equipped ? 'انتخاب شده' : owned ? 'انتخاب' : 'خرید و انتخاب', `online-seal:${seal.id}`, { pressed: equipped, disabled: status.busy || (!owned && profile.coins < seal.cost) })}</article>`;
                })
                .join('')}</div>${notice}`,
            footer: close,
        };
    const locked = profile.referral.status !== 'none' || profile.matches > 0;
    return {
        title: 'دوستان و پاداش دعوت',
        key: 'online-referrals',
        tone: 'emerald',
        body: `<h3>کد دعوت تو: <bdi dir="ltr">${escape(profile.referral.code)}</bdi></h3>${button('کپی پیوند دعوت', 'copy-referral', { className: 'button full-width' })}<p class="footnote hub-referral-link" dir="ltr">${escape(referralLink(profile.referral.code))}</p><p>دوستت کد تو را پیش از پایان اولین بازی آنلاین ثبت کند. پس از سه رقابت کامل با گروه‌های متفاوت، هر دو ${number(100)} تجربه و ${number(40)} سکه می‌گیرید. تکرار یک گروه، پیشرفت دعوت را بیشتر نمی‌کند.</p><p>${number(profile.referral.rewardedInvites)} دعوت پاداش‌گرفته از ${number(profile.referral.limit)}</p><h3>با دعوت یک دوست آمده‌ای؟</h3>${locked ? `<p>${profile.referral.status === 'rewarded' ? 'پاداش دعوتت دریافت شد.' : profile.referral.status === 'capped' ? 'سقف پاداش دعوت این دوست تکمیل شده است.' : profile.referral.status === 'pending' ? `دعوت ثبت شد؛ ${number(profile.referral.qualifiedGames)} از ۳ رقابت با گروه متفاوت کامل شده.` : 'ثبت کد دعوت، پیش از پایان اولین بازی آنلاین ممکن است.'}</p>` : `<label class="name-label" for="player-name">کد دعوت دوستت</label><div class="name-entry"><input id="player-name" data-action="player-name" type="text" dir="ltr" maxlength="24" value="${escape(session.playerNameDraft)}" autocomplete="off"><span class="name-entry-value" dir="ltr" aria-hidden="true">${escape(session.playerNameDraft || 'کد دوستت')}</span></div>${button('ثبت کد دعوت', 'apply-referral', { className: 'button button--primary full-width', disabled: status.busy })}`}${notice}`,
        footer: close,
    };
}
