import type { BotPersonality } from '../core/botPersonality';

export const CHARACTERS = [
    {
        id: 'mithra',
        name: 'میترا',
        title: 'نگهبان پیمان و روشنایی',
        strategy: 'گسترش راه‌ها و آبادی‌ها؛ فشار بر پیشتاز جزیره',
        greeting: 'پیمان ما روشن است؛ راهت را بساز و برای پیروزی بجنگ!',
        reaction: 'هر راه، آغاز یک قلمرو تازه است.',
    },
    {
        id: 'ashi',
        name: 'اَشی',
        title: 'بانوی توانگری و پاداش',
        strategy: 'دسترسی به بندرها، تنوع تولید و مبادله با بهترین نرخ',
        greeting: 'ثروت به کسی لبخند می‌زند که قدر هر منبع را بداند!',
        reaction: 'یک مبادلهٔ سنجیده، گاهی از یک مشت سکه باارزش‌تر است.',
    },
    {
        id: 'spenta-armaiti',
        name: 'سپنتا آرمیتی',
        title: 'پاسدار زمین و بردباری',
        strategy: 'تولید گندم و سنگ؛ ارتقای آبادی‌ها به شهر',
        greeting: 'زمین به شکیبایی پاسخ می‌دهد؛ بنیان محکم، ماندگار است.',
        reaction: 'آبادی را پرورش بده؛ شهر از همان ریشه می‌روید.',
    },
] as const satisfies readonly {
    id: BotPersonality;
    name: string;
    title: string;
    strategy: string;
    greeting: string;
    reaction: string;
}[];

export type CharacterId = (typeof CHARACTERS)[number]['id'];
export function characterForSeat(seat: number, humanSeat: number) {
    if (seat === humanSeat || seat < 0 || humanSeat < 0) return null;
    return CHARACTERS[(seat < humanSeat ? seat : seat - 1) % CHARACTERS.length];
}

export function characterById(id: string) {
    return CHARACTERS.find((character) => character.id === id);
}
