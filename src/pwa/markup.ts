import type { AppPlatform } from './app';
import type { MatchSession } from '../game/ui/matchSession';
import type { SheetContent } from '../game/ui/bottomSheet';
import { button, escape } from '../game/ui/components';
import { icon } from '../ui/icons';
import { BRAND } from '../brand';

export function offlineLabel(app: AppPlatform): string {
    if (app.offline === 'ready') return 'آماده برای بازی آفلاین';
    if (app.offline === 'error') return 'آماده‌سازی آفلاین کامل نشد؛ دوباره امتحان کن.';
    if (app.offline === 'unsupported')
        return 'بازی آفلاین اینجا در دسترس نیست؛ لینک بازی رو در مرورگر گوشی باز کن.';
    return app.online
        ? 'داریم بازی رو برای اجرای آفلاین آماده می‌کنیم…'
        : 'برای آماده‌سازی آفلاین، یک بار به اینترنت وصل شو.';
}
export function saveLabel(session: MatchSession): string {
    if (session.saveStatus === 'unavailable')
        return 'ذخیره روی این دستگاه در دسترس نیست؛ با بستن برنامه ممکنه بازی از دست بره.';
    if (session.saveStatus === 'invalid')
        return 'ذخیره قبلی قابل بازیابی نیست؛ می‌تونی یک بازی تازه شروع کنی.';
    return 'بازی و پیشرفت آموزش، خودکار روی همین دستگاه ذخیره می‌شن.';
}
/** Menu stays at two actions; Play also resumes an unfinished saved match. */
export function menuStatus(app: AppPlatform, session: MatchSession): string {
    return `<p class="footnote" role="status">${session.savedMatch?.state.phase !== 'finished' && session.savedMatch ? 'سفرت ذخیره شده؛ با «بازی» از همون‌جا ادامه بده.' : 'تو و سه رقیب؛ یک جزیره و ده امتیاز تا پیروزی.'}</p>
        ${session.saveStatus === 'unavailable' || session.saveStatus === 'invalid' ? `<p class="availability">${escape(saveLabel(session))}</p>` : ''}
        ${app.updateReady ? '<p class="footnote">نسخه تازه آماده‌ست؛ از منوی توقف داخل بازی هم می‌تونی به‌روزش کنی.</p>' : ''}`;
}

export function updateContent(app: AppPlatform, session: MatchSession): SheetContent {
    const active = !!session.state && session.state.phase !== 'finished';
    return {
        title: 'نسخه تازهٔ سان‌مارک آماده‌ست',
        body: `<p>یه نسخه تازه از بازی آماده شده. الان به‌روزش کنیم؟</p>
            <p class="footnote">${active ? 'بازی و پیشرفت آموزشت قبل از به‌روزرسانی ذخیره می‌شن. بعد از بازشدن نسخه تازه، «بازی» رو بزن و از همین‌جا ادامه بده. انتخاب‌های تأییدنشده رو باید دوباره انجام بدی.' : 'بازی دوباره باز می‌شه و ذخیره سفرت باقی می‌مونه.'}</p>
            <p role="status">${app.updating ? 'در حال بازکردن نسخه تازه…' : !app.updateReady ? 'نسخه بازی به‌روزه.' : 'نسخه تازه دانلود شده و آمادهٔ اجراست.'}</p>
            ${button(app.updating ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی و بازکردن بازی', 'app-update', { className: 'button button--primary full-width', disabled: !app.updateReady || app.updating })}
            ${button('بعداً', 'close-sheet', { className: 'button full-width', disabled: app.updating })}
            ${app.error ? `<p class="availability" role="alert">${escape(app.error)}</p>` : ''}`,
    };
}

/** Chrome labels vary by version; keep current and older install paths explicit. */
export function installInstructions(app: AppPlatform): string {
    if (app.ios)
        return 'توی Safari، منوی اشتراک‌گذاری رو باز کن و «افزودن به صفحه اصلی» (Add to Home Screen) رو بزن. اگر «Open as Web App» رو دیدی، روشنش کن؛ بعد «Add» رو بزن.';
    if (app.android && app.chrome)
        return 'توی Chrome، منوی سه‌نقطه (⋮) کنار نوار آدرس رو باز کن؛ «نصب و ایجاد میانبر» (Install and create shortcut) و بعد «نصب» (Install) رو بزن. اگه نسخه‌ت «افزودن به صفحه اصلی» (Add to Home screen) یا «نصب برنامه» (Install app) رو نشون می‌ده، از همون مسیر نصب رو تأیید کن.';
    if (app.android)
        return 'توی منوی مرورگر، «نصب برنامه» یا «افزودن به صفحه اصلی» رو پیدا کن. اگه گزینه نصب نیست یا بازی رو داخل یک پیام‌رسان باز کردی، همین لینک رو توی Chrome باز کن؛ از منوی سه‌نقطه، Install and create shortcut یا Add to Home screen و بعد Install رو بزن.';
    return 'اگه مرورگرت نصب برنامه رو پشتیبانی می‌کنه، از گزینه نصب کنار نوار آدرس یا منوی مرورگر استفاده کن. برای نصب روی گوشی، همین لینک رو توی Chrome اندروید یا Safari آیفون باز کن.';
}

export function entryInstall(app: AppPlatform): string {
    if (app.installed) return '';
    return `<section class="entry-install"><h3>${app.embedded ? 'اول در مرورگر گوشی باز کن' : 'سان‌مارک، همیشه دم دست'}</h3><p>${app.embedded ? 'برای نصب و اجرای بهتر، از مرورگر داخل شبکهٔ اجتماعی خارج شو.' : 'به صفحهٔ اصلی اضافه کن؛ دفعهٔ بعد با یک لمس به جزیره برگرد.'}</p>${button(app.embedded ? 'راهنمای بازکردن در مرورگر' : app.installPrompt ? 'نصب برنامه' : 'افزودن به صفحهٔ اصلی', app.installPrompt && !app.embedded ? 'app-install' : 'open-app', { className: 'button button--primary full-width', disabled: app.updating })}<small>بدون نصب هم می‌توانی بازی کنی.</small></section>`;
}

export function installGuide(app: AppPlatform): string {
    const steps = app.embedded
        ? [
              'منوی ⋮ یا … بالای همین مرورگر را باز کن.',
              app.ios
                  ? 'گزینهٔ Open in Safari یا بازکردن در مرورگر را انتخاب کن.'
                  : 'گزینهٔ Open in browser یا بازکردن در مرورگر را انتخاب کن.',
              'اگر این گزینه نبود، پیوند را کپی و در مرورگر گوشی جای‌گذاری کن.',
          ]
        : app.ios
          ? [
                'سایت را در Safari باز کن.',
                'دکمهٔ اشتراک‌گذاری (Share؛ مربع با پیکان رو به بالا) را بزن. جای آن ممکن است بالا یا پایین صفحه باشد.',
                'در فهرست، Add to Home Screen را پیدا کن؛ ممکن است لازم باشد پایین بروی یا More را بزنی.',
                'اگر Open as Web App نمایش داده شد، روشنش کن؛ سپس Add را بزن.',
            ]
          : [installInstructions(app)];
    return `<ol class="install-steps">${steps.map((text, index) => `<li><span class="install-step-symbol" aria-hidden="true">${app.ios && !app.embedded ? ['Safari', '↑', '＋', '✓'][index] : (['⋮', '↗', '⧉'][index] ?? '＋')}</span><p>${escape(text)}</p></li>`).join('')}</ol>${button(app.linkCopied ? 'پیوند کپی شد' : 'کپی پیوند بازی', 'copy-game-link', { className: 'button full-width' })}<p class="footnote" dir="ltr">${escape(typeof location !== 'undefined' ? location.href : 'https://sunmarkgame.top/')}</p>`;
}

export function appContent(app: AppPlatform, session: MatchSession): SheetContent {
    return {
        title: app.embedded ? 'بازکردن در مرورگر گوشی' : `${BRAND.persianName}، همیشه همراهت`,
        body: `<h3>${app.installed ? 'بازی نصب شده' : 'نصب روی گوشی'}</h3><p>${app.installed ? 'از آیکون بازی روی صفحه اصلی، مستقیم وارد جزیره شو.' : ''}</p>${!app.installed ? installGuide(app) : ''}${!app.installed ? '<p class="footnote">نصب اختیاریه؛ می‌تونی همین‌جا هم بازی کنی.</p>' : ''}
            ${app.installPrompt && !app.installed && !app.embedded ? button(`نصب ${BRAND.persianName}`, 'app-install', { className: 'button button--primary full-width' }) : ''}
            ${!app.installed ? button('فعلاً ادامه بده', 'close-sheet', { className: 'button full-width' }) : ''}
            <details><summary>وضعیت برنامه و ذخیره</summary><h3>${icon('offline', 22)} بازی بدون اینترنت</h3><p role="status">${offlineLabel(app)}</p><p class="footnote">جزیره و تصویرهای بازی آماده می‌شن. بار اول اینترنت لازمه؛ بعد از آماده‌شدن، می‌تونی بدون اینترنت بازی کنی.</p>
            ${app.offline === 'error' ? button('دوباره آماده کن', 'app-retry', { className: 'button full-width' }) : ''}
            <h3>${icon('save', 22)} ادامه سفر</h3><p>${escape(saveLabel(session))}</p><p class="footnote">ذخیره روی همین دستگاهه؛ با پاک‌کردن داده‌های سایت ممکنه حذف بشه.</p>
            <h3>${icon('refresh', 22)} نسخه بازی</h3><p>${app.updating ? 'در حال به‌روزرسانی…' : app.updateReady ? 'نسخه تازه آماده‌ست؛ قبل از بازشدن دوبارهٔ بازی، سفرت رو ذخیره می‌کنیم.' : 'وقتی نسخه تازه‌ای آماده بشه، بهت خبر می‌دیم.'}</p>
            ${app.updateReady ? button('به‌روزرسانی و بازکردن نسخه تازه', 'app-update', { className: 'button button--primary full-width', disabled: app.updating }) : ''}
            ${app.error ? `<p class="availability" role="alert">${escape(app.error)}</p>` : ''}
            ${session.state ? button('ذخیره و بازگشت به منو', 'new-game', { className: 'button full-width' }) : ''}</details><p class="footnote" dir="ltr">Icons: Fluent Emoji Flat · Microsoft · MIT</p>`,
    };
}
