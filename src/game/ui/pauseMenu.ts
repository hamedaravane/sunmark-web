import { button, escape } from './components';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';

function menuOption(label: string, hint: string, action: string): string {
    return button(
        `<span class="pause-option-copy"><span>${escape(label)}</span><small>${escape(hint)}</small></span><span aria-hidden="true">‹</span>`,
        action,
        { className: 'button pause-option' },
    );
}

export const pauseMenuBack = (): string =>
    button('بازگشت به منوی توقف', 'open:help', { className: 'button full-width' });

/** A small navigation menu; rules, lessons and inspection lists live on their own screens. */
export function pauseMenuContent(session: MatchSession, updateReady: boolean): SheetContent {
    const practice = !!session.practice;
    return {
        title:
            session.online || session.state?.phase === 'finished' ? 'منوی بازی' : 'بازی متوقف است',
        key: 'pause-menu',
        focusAction: 'resume-game',
        body: `<div class="pause-menu">${session.online ? '<p class="footnote">بازی آنلاین در پس‌زمینه ادامه دارد؛ منو نوبت دیگران را متوقف نمی‌کند.</p>' : ''}
            <section class="pause-section"><h3>راهنما</h3>
                ${menuOption(practice ? 'آموزش تمرین' : 'آموزش و آناهیتا', practice ? 'هدف و مراحل این تمرین' : session.tutorial.enabled ? 'آناهیتا روشن است • درس‌ها و قوانین' : 'آناهیتا خاموش است • برای روشن‌کردن بزن', practice ? 'open:rules' : 'open:journal')}
            </section>
            <section class="pause-section"><h3>بازی</h3>
                ${menuOption('رویدادهای بازی', 'تاس‌ها، ساخت‌ها و معامله‌های این سفر', 'open:history')}${menuOption('خانه‌های جزیره', 'خانه‌ها، تولید و ساختمان‌های مجاور', 'open:inspect')}${!practice && !session.online ? menuOption('بازبینی آخرین حرکت', 'منابع، هزینه‌ها و گفت‌وگوی رقبا', 'open:turn-review') : ''}
                ${menuOption(session.online ? 'بازگشت به اتاق‌ها' : practice ? 'خروج از تمرین' : 'بازگشت به منوی اصلی', practice ? 'بازی اصلی محفوظ می‌ماند' : session.saveStatus === 'unavailable' ? 'ذخیره خودکار در دسترس نیست' : 'ذخیره روی همین دستگاه؛ هر وقت خواستی ادامه بده', 'new-game')}
                ${!practice && !session.online ? menuOption('شروع بازی تازه', 'پس از تأیید، بازی فعلی جایگزین می‌شود', 'restart-match') : ''}
            </section>
            <section class="pause-section"><h3>برنامه</h3>
                ${menuOption('راهنمای رابط بازی', 'تاس، هزینه‌ها و کارت‌های تو', 'open:experience-guide')}
                ${menuOption('صدا و حرکت', 'صدای کارها، حرکت کمتر و بازخورد سریع', 'open:experience')}
                ${menuOption(updateReady ? 'به‌روزرسانی بازی' : 'نصب و بازی آفلاین', updateReady ? 'نسخه تازه آماده است' : 'نصب، ذخیره و وضعیت برنامه', 'open-app')}
            </section>
        </div>`,
        footer: button(
            session.state?.phase === 'finished'
                ? 'بازگشت به جزیره'
                : practice
                  ? 'ادامه تمرین'
                  : 'ادامه بازی',
            'resume-game',
            { className: 'button button--primary full-width' },
        ),
    };
}
