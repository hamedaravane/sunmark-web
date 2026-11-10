import type { BotPersonality } from '../core/botPersonality';

export const CHARACTERS = [
    {
        id: 'mithra',
        name: 'میترا',
        title: 'نگهبان پیمان و روشنایی',
        strategy: 'گسترش راه‌ها و آبادی‌ها؛ فشار بر پیشتاز جزیره',
        greeting: 'اهل رقابتی؟ راهت رو بساز؛ ببینم چی تو چنته داری!',
        reaction: 'یه راه دیگه! حالا جا برای جلو رفتن دارم.',
    },
    {
        id: 'ashi',
        name: 'اَشی',
        title: 'بانوی توانگری و پاداش',
        strategy: 'دسترسی به بندرها، تنوع تولید و مبادله با بهترین نرخ',
        greeting: 'چی کم داری؟ شاید بتونیم یه معاملهٔ خوب جور کنیم!',
        reaction: 'یه معاملهٔ به‌موقع، یه قدم نزدیک‌تر به برد!',
    },
    {
        id: 'spenta-armaiti',
        name: 'سپنتا آرمیتی',
        title: 'پاسدار زمین و بردباری',
        strategy: 'تولید گندم و سنگ؛ ارتقای آبادی‌ها به شهر',
        greeting: 'عجله‌ای ندارم؛ همین آبادی رو کم‌کم شهرش می‌کنم.',
        reaction: 'آروم‌آروم داره شکل می‌گیره. از همین‌جا می‌شه جلو رفت.',
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
