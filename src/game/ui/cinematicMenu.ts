import { assetUrl } from '../assets';

/** Four independent art planes; intrinsic dimensions reserve geometry before decoding. */
function plane(name: string, width: number, height: number, className: string): string {
    return `<img class="${className}" src="${assetUrl(`menu/${name}-${width}.webp`)}" srcset="${[640, 1024, width].map((w) => `${assetUrl(`menu/${name}-${w}.webp`)} ${w}w`).join(', ')}" sizes="${name === 'character-ensemble' ? '(min-width: 1100px) 56vw, (orientation: landscape) 48vw, (min-width: 600px) 70vw, 94vw' : '(max-aspect-ratio: 4/5) 180vw, 110vw'}" width="${width}" height="${height}" alt="" decoding="async" ${name === 'distant-world' || name === 'character-ensemble' ? 'fetchpriority="high"' : ''}>`;
}
export function cinematicWorld(): string {
    return `<div class="cinematic-world" aria-hidden="true">${plane('distant-world', 1672, 941, 'world-horizon')}${plane('royal-palace', 1672, 941, 'world-palace')}${plane('garden-frame', 1672, 941, 'world-garden')}<div class="world-light"></div></div>`;
}
export function cinematicCast(): string {
    return `<section class="cinematic-hero" aria-label="آناهیتا و همراهان جزیره"><div class="cinematic-cast" aria-hidden="true">${plane('character-ensemble', 1536, 1024, 'cinematic-ensemble')}</div><h1 class="cinematic-wordmark" aria-label="Sunmark" dir="ltr" lang="en"><img src="${assetUrl('menu/wordmark-1024.webp')}" srcset="${[640, 1024, 2172].map((w) => `${assetUrl(`menu/wordmark-${w}.webp`)} ${w}w`).join(', ')}" sizes="(min-width: 1100px) 56vw, (min-width: 600px) 70vw, 94vw" alt="Sunmark" width="2172" height="724" decoding="async"></h1></section>`;
}

/** Keep failed decorative downloads from painting browser error icons over the scene. */
export function hideFailedMenuArt(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.closest('.cinematic-world, .cinematic-hero'))
        image.dataset.failed = 'true';
}
