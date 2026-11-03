import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig(
    globalIgnores([
        'dist/**',
        'coverage/**',
        'public/assets/**',
        'art/**',
        '.agents/skills/**',
        'output/**',
    ]),
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [js.configs.recommended],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
        },
    },
    { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
    { files: ['tests/**/*.ts', '*.config.ts'], languageOptions: { globals: globals.node } },
    {
        files: ['src/game/core/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [{ name: 'phaser', message: 'Keep game rules independent of Phaser.' }],
                    patterns: [
                        {
                            group: ['phaser/*', '**/scenes/**', '**/rendering/**', '**/ui/**'],
                            message: 'Core rules must not import presentation modules.',
                        },
                    ],
                },
            ],
        },
    },
    // Formatting belongs to Prettier; keep it out of lint runs and runtime code.
    prettier,
);
