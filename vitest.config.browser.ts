import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.browser.ts'],
        testTimeout: 1200000,
        hookTimeout: 30000,
        fileParallelism: false,
    },
});
