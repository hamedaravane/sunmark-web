import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const executable =
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const child = spawn(resolve('node_modules/.bin/playwright-cli'), process.argv.slice(2), {
    stdio: 'inherit',
    env: {
        ...process.env,
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || resolve('output/playwright/cache'),
        ...(executable ? { PLAYWRIGHT_MCP_EXECUTABLE_PATH: executable } : {}),
    },
});
child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
});
child.on('exit', (code) => {
    process.exitCode = code ?? 1;
});
