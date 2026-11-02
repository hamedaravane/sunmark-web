import { escapeHtml as escape, number } from './markup';

/** Native SVG charts: no external scripts, inline styles, or third-party telemetry. */
export function trendChart(
    points: { date: string; registrations: number; players: number }[],
): string {
    const width = 640,
        height = 190,
        pad = 24;
    const max = Math.max(1, ...points.flatMap((p) => [p.registrations, p.players]));
    const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
    const y = (n: number) => height - pad - (n * (height - pad * 2)) / max;
    const line = (key: 'registrations' | 'players', className: string) =>
        `<polyline class="${className}" points="${points.map((p, i) => `${x(i)},${y(p[key])}`).join(' ')}"/>${points.map((p, i) => `<circle class="${className}-dot" cx="${x(i)}" cy="${y(p[key])}" r="3"><title>${escape(p.date)}: ${number(p[key])}</title></circle>`).join('')}`;
    return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="روند روزانه ثبت‌نام و حساب‌های مشاهده‌شده"><title>ثبت‌نام و فعالیت روزانه؛ روز جاری کامل نشده است</title>${[0, 0.5, 1].map((r) => `<line class="chart-grid" x1="${pad}" x2="${width - pad}" y1="${y(r * max)}" y2="${y(r * max)}"/><text x="4" y="${y(r * max) + 4}" class="chart-label">${number(Math.round(r * max))}</text>`).join('')}${line('registrations', 'line-registration')}${line('players', 'line-activity')}</svg><div class="chart-dates" dir="ltr"><span>${escape(points[0]?.date ?? '')}</span><span>${escape(points[points.length - 1]?.date ?? '')}</span></div>`;
}

export function reachBar(label: string, value: number, total: number, tone = 'cyan'): string {
    const ratio = Math.max(0, Math.min(100, total > 0 ? (value / total) * 100 : 0));
    return `<div class="reach-row"><div><span>${escape(label)}</span><b>${number(value)}</b></div><svg viewBox="0 0 100 5" preserveAspectRatio="none" role="img" aria-label="${escape(label)}: ${number(value)} از ${number(total)}"><rect class="bar-track" width="100" height="5" rx="2.5"/><rect class="bar-${tone}" x="${100 - ratio}" width="${ratio}" height="5" rx="2.5"/></svg></div>`;
}

export function cohortCell(returned: number | null, players: number): string {
    if (returned === null || !players) return '<td class="cohort-pending">در انتظار</td>';
    const percent = Math.round((returned / players) * 100),
        bucket = Math.min(4, Math.floor(percent / 25));
    return `<td class="cohort-${bucket}"><b>${number(percent)}٪</b><small>${number(returned)} / ${number(players)}</small></td>`;
}
