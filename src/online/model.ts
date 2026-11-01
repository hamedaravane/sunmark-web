export interface Drafts {
    code: string;
    screen: 'home' | 'join';
    notice: string;
}
export const newDrafts = (): Drafts => ({
    code: '',
    screen: 'home',
    notice: '',
});
