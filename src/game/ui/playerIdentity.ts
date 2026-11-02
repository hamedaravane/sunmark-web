import { CHARACTERS, characterForSeat } from './characters';

export const BOT_NAMES = CHARACTERS.map((character) => character.name);
export const LEGACY_BOT_NAMES = ['اطلس', 'آسیمو', 'سوفیا'];
export const PLAYER_NAME_LIMIT = 24;
export const AVATARS = [
    'human',
    'mithra',
    'ashi',
    'spenta-armaiti',
    'atlas',
    'asimo',
    'sophia',
] as const;
export type AvatarId = (typeof AVATARS)[number];

/** Preserve Persian joining characters; discard controls that can spoof surrounding labels. */
export function playerName(value: string): string {
    const clean = Array.from(value.replace(/\s+/gu, ' '))
        .filter((char) => {
            const code = char.codePointAt(0)!;
            return code > 0x1f && !(code >= 0x7f && code <= 0x9f);
        })
        .join('')
        .replace(/[\u202a-\u202e\u2066-\u2069]/gu, '')
        .trim();
    return Array.from(clean).slice(0, PLAYER_NAME_LIMIT).join('') || 'بازیکن';
}

export function avatarForSeat(seat: number, humanSeat: number): AvatarId {
    return characterForSeat(seat, humanSeat)?.id ?? 'human';
}

/** Remote server bots retain their existing identities and server strategy. */
export function legacyAvatarForSeat(seat: number, humanSeat: number): AvatarId {
    if (seat === humanSeat) return 'human';
    const botIndex = seat < humanSeat ? seat : seat - 1;
    return (['atlas', 'asimo', 'sophia'] as const)[botIndex % 3];
}
