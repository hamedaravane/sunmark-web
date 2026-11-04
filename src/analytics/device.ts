import { deviceSchema } from '../online/shared/src/analytics/analytics.schemas';
import { createProgressionId } from '../game/progression/progression';

let installationId: string | undefined;
export function deviceDiagnostics() {
    try {
        installationId ??= localStorage.getItem('sunmark.installation.v1') ?? createProgressionId();
        localStorage.setItem('sunmark.installation.v1', installationId);
        const hints: unknown = Reflect.get(navigator, 'userAgentData');
        const platform =
            typeof hints === 'object' && hints !== null
                ? Reflect.get(hints, 'platform')
                : undefined;
        const mobile =
            typeof hints === 'object' && hints !== null ? Reflect.get(hints, 'mobile') : undefined;
        const memory: unknown = Reflect.get(navigator, 'deviceMemory');
        const result = deviceSchema.safeParse({
            installationId,
            userAgent: navigator.userAgent.slice(0, 512),
            platform:
                typeof platform === 'string'
                    ? platform.slice(0, 80)
                    : navigator.platform.slice(0, 80),
            language: navigator.language.slice(0, 35),
            ...(typeof mobile === 'boolean' ? { mobile } : {}),
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            pixelRatio: devicePixelRatio,
            cpuThreads: navigator.hardwareConcurrency || undefined,
            ...(typeof memory === 'number' ? { memoryGiB: memory } : {}),
            touchPoints: navigator.maxTouchPoints,
        });
        return result.success ? result.data : undefined;
    } catch {
        return undefined;
    }
}
