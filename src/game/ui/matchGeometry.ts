import { fitBoard } from './layout';
import { DESKTOP_LAYOUT } from './responsiveLayout';

/** Shared by the actual board and its ocean controls; independent of turn/animation state. */
export function matchGeometry(width: number, height: number, wide = false, desktop = false) {
    const compact = width < 360 || height < 420;
    // On short screens the dice occupy the action ledge, preserving readable hexes.
    const diceOnLedge = !wide && height < 420;
    // Landscape controls (including dice) live in their own rail, off the island.
    const seaBand = wide || diceOnLedge ? 0 : 104;
    const board = fitBoard(width, Math.max(1, height - seaBand));
    if (desktop) board.hexRadius = Math.min(board.hexRadius, DESKTOP_LAYOUT.maxHexRadius);
    return {
        board,
        seaBand,
        diceOnLedge,
        dieSize: compact ? 48 : 56,
        detailScale: desktop ? 1.2 : 1,
    };
}
