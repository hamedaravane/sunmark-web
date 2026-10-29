import { button } from './components';
import type { MatchSession } from './matchSession';
import type { SheetContent } from './bottomSheet';

export function experienceSheet(session: MatchSession): SheetContent {
    const settings = session.preferences.snapshot;
    const haptics = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    const toggle = (
        key: 'sound' | 'quick' | 'reduced' | 'haptics',
        label: string,
        description: string,
        disabled = false,
    ) =>
        button(
            `<span class="pause-option-copy"><span>${label}</span><small>${description}</small></span><span>${disabled ? 'در دسترس نیست' : settings[key] ? 'روشن ✓' : 'خاموش'}</span>`,
            `experience:${key}`,
            {
                className: 'button pause-option',
                pressed: disabled ? false : settings[key],
                disabled,
            },
        );
    return {
        title: 'صدا و حرکت',
        key: 'experience-settings',
        body: `${toggle('sound', 'صدای کارها', 'صدای کوتاه تاس، منبع و ساخت؛ بدون موسیقی تکراری')}${toggle('haptics', 'بازخورد لمسی', haptics ? 'لرزش کوتاه برای کارهای مهم' : 'این دستگاه پشتیبانی نمی‌کند', !haptics)}${toggle('quick', 'بازخورد سریع', 'همان نتیجه‌ها، با حرکت کوتاه‌تر برای نوبت‌های پی‌درپی')}${toggle('reduced', 'حرکت کمتر', 'بدون پرواز و چرخش؛ نتیجه و دارایی همیشه روشن می‌مانند')}<p class="footnote">تنظیم حرکت کمتر دستگاه هم رعایت می‌شود. هیچ حرکتی نتیجهٔ تاس یا زمان مجاز کارها را عوض نمی‌کند.</p>${button('راهنمای رابط بازی', 'open:experience-guide', { className: 'button button--quiet full-width' })}`,
        footer: button('ادامه بازی', 'resume-game', {
            className: 'button button--primary full-width',
        }),
    };
}
export function experienceGuide(): SheetContent {
    return {
        title: 'تاس، ساخت و کارت‌ها',
        body: '<ul class="help-list"><li>در نوبتت، دو تاس بزرگ وسط جزیره را لمس کن. نتیجه بالای صفحه می‌ماند و زمین‌های تولیدکننده به دارایی تو وصل می‌شوند.</li><li>اگر کارت توسعهٔ مجاز داشته باشی، پیش از تاس هم می‌توانی بازی کنی.</li><li>پس از تاس و مراحل اجباری، چکش ساخت، ترازو و دستهٔ توسعه پایین صفحه‌اند.</li><li>در ساخت، عددها دارایی / هزینه‌اند. یک سازه را «هدف من» کن تا در معامله، کمبود قبل و بعد را ببینی.</li><li>دستهٔ توسعه دست تو را باز می‌کند؛ فقط دکمهٔ خرید داخل آن منابع خرج می‌کند.</li></ul>',
        footer: button('ادامه بازی', 'resume-game', {
            className: 'button button--primary full-width',
        }),
    };
}
