export interface Drafts {
    name: string;
    code: string;
    lobby: string;
    screen: 'home' | 'create' | 'join';
    notice: string;
}
export const newDrafts = (): Drafts => ({
    name: '',
    code: '',
    lobby: 'بازی دوستانه',
    screen: 'home',
    notice: '',
});
