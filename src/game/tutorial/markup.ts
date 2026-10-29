import { artSprite, button, escape, number } from '../ui/components';
import type { MatchSession } from '../ui/matchSession';
import { pauseMenuBack } from '../ui/pauseMenu';
import type { SheetContent } from '../ui/bottomSheet';
import { CHAPTERS, LESSONS, type LessonId } from './lessons.fa';

export function tutorialContent(session: MatchSession): SheetContent {
    const director = session.tutorial;
    const id = director.current!;
    const lesson = LESSONS[id];
    const practice = session.practice;
    return {
        title: 'آناهیتا',
        narrator: { portrait: `anahita-${lesson.expression}`, key: id },
        body: `<article class="narrator-dialogue" aria-label="گفت‌وگو با آناهیتا">
            <div class="narrator-copy"><p class="eyebrow">${CHAPTERS[lesson.chapter]}</p><h3>${escape(lesson.title)}</h3><p>${escape(lesson.text)}</p></div>
            <p class="narrator-task">${escape(lesson.task)}</p>
        </article>`,
        footer: `<div class="narrator-controls">${button(practice?.stage === 'complete' ? 'دیدن آبادی و امتیاز تازه' : director.remaining > 1 ? 'بعدش چی؟' : 'بریم سراغش', 'tutorial-next', { className: 'button button--primary' })}${button(practice ? 'خروج از تمرین' : 'خاموش‌کردن آناهیتا', 'tutorial-pause', { className: 'button button--quiet' })}</div><p class="footnote">${practice ? 'این تمرین ذخیره نمی‌شود؛ با خروج، بازی اصلی محفوظ می‌ماند.' : 'بستن پنجره، آناهیتا رو خاموش می‌کنه. برای روشن‌کردن: منوی بازی ← آموزش و آناهیتا.'}</p>`,
    };
}

export function journalContent(session: MatchSession): SheetContent {
    const director = session.tutorial;
    return {
        title: 'آموزش و آناهیتا',
        key: 'tutorial-hub',
        footer: pauseMenuBack(),
        body: `<div class="journal-intro">${artSprite('anahita-calm', 76, 'narrator-portrait')}<div><h3>آناهیتا ${director.enabled ? 'روشن' : 'خاموش'} است</h3><p class="sheet-intro">${director.enabled ? 'در طول بازی، قدم‌به‌قدم همراهت هستم.' : 'برای برگشتن راهنمایی‌های من، «روشن‌کردن آناهیتا» رو بزن.'}</p></div></div>
        ${button(director.enabled ? 'خاموش‌کردن آناهیتا' : 'روشن‌کردن آناهیتا', director.enabled ? 'tutorial-pause' : 'tutorial-resume', { className: `button${director.enabled ? '' : ' button--primary'} full-width` })}
        ${button('قوانین بازی', 'open:rules', { className: 'button full-width' })}
        <h3>دفتر درس‌ها</h3><p class="footnote">${number(director.seen.size)} گفت‌وگو مرور شد • ${number(director.practiced.size)} مفهوم تمرین شد. برای مرور، یک درس رو انتخاب کن.</p>
        ${CHAPTERS.map(
            (chapter, index) =>
                `<section class="journal-chapter"><h3>${chapter}</h3><div class="target-list">${(
                    Object.keys(LESSONS) as LessonId[]
                )
                    .filter((id) => LESSONS[id].chapter === index)
                    .map((id) =>
                        button(
                            `<span>${escape(LESSONS[id].title)}</span><span class="muted">${director.practiced.has(id) ? 'تمرین شد' : director.seen.has(id) ? 'مرور شد' : 'هنوز نرسیدیم • مرور آزاد'}</span>`,
                            `lesson:${id}`,
                            {
                                className: 'button journal-lesson',
                                label: `${LESSONS[id].title}؛ ${director.practiced.has(id) ? 'تمرین شد' : director.seen.has(id) ? 'مرور شد' : 'هنوز توی بازی معرفی نشده'}؛ مرور گفت‌وگو`,
                            },
                        ),
                    )
                    .join('')}</div></section>`,
        ).join('')}`,
    };
}
