import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { BRAND } from './src/brand';

export default defineConfig({
    base: './',
    plugins: [
        {
            name: 'game-brand',
            transformIndexHtml(html) {
                return html
                    .replace(/%GAME_NAME%/g, BRAND.name)
                    .replace(/%GAME_PERSIAN_NAME%/g, BRAND.persianName)
                    .replace(/%GAME_URL%/g, BRAND.url)
                    .replace(/%GAME_DESCRIPTION%/g, BRAND.description);
            },
        },
        VitePWA({
            registerType: 'prompt',
            // The game owns registration and reloads, including other open tabs.
            injectRegister: null,
            includeManifestIcons: false, // Already covered by the complete PNG precache glob.
            manifest: {
                // Preserve the shipped identity so Sunmark updates the existing installed app.
                id: '/ancient-persia-game/',
                name: BRAND.name,
                short_name: BRAND.name,
                description: BRAND.description,
                lang: 'fa',
                dir: 'rtl',
                start_url: './',
                scope: './',
                display: 'standalone',
                orientation: 'portrait-primary',
                theme_color: '#252b2d',
                background_color: '#252b2d',
                categories: ['games'],
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                cacheId: 'ancient-persia', // Keep existing offline caches through the rename.
                globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg}'],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: false,
            },
        }),
    ],
    server: {
        port: 8080,
        strictPort: true,
    },
    build: {
        target: 'es2020',
    },
});
