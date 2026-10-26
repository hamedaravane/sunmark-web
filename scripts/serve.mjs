import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const api = new URL(process.env.API_UPSTREAM ?? 'http://api:3000');
if (api.protocol !== 'http:') throw new Error('API_UPSTREAM must be the private HTTP service URL');
const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/socket.io/') ||
        url.pathname === '/docs' ||
        url.pathname.startsWith('/docs/') ||
        url.pathname === '/docs-json'
    ) {
        const upstream = http.request(
            {
                hostname: api.hostname,
                port: api.port || 80,
                path: req.url,
                method: req.method,
                headers: { ...req.headers, host: api.host },
            },
            (response) => {
                res.writeHead(response.statusCode ?? 502, response.headers);
                response.pipe(res);
            },
        );
        upstream.on('error', () => {
            if (res.headersSent) res.destroy();
            else {
                res.writeHead(502);
                res.end('Backend unavailable');
            }
        });
        req.on('aborted', () => upstream.destroy());
        req.pipe(upstream);
        return;
    }
    try {
        let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
        if (path !== root && !path.startsWith(root + sep)) {
            res.writeHead(403);
            res.end();
            return;
        }
        let info = await stat(path).catch(() => null);
        if (!info?.isFile()) {
            path = resolve(root, 'index.html');
            info = await stat(path);
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405);
            res.end();
            return;
        }
        res.writeHead(200, {
            'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
            'Content-Length': info.size,
            'Cache-Control': path.includes(`${sep}assets${sep}`)
                ? 'public, max-age=31536000, immutable'
                : 'no-store',
            'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') res.end();
        else createReadStream(path).pipe(res);
    } catch {
        res.writeHead(404);
        res.end();
    }
});
server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io/')) {
        socket.destroy();
        return;
    }
    const upstream = http.request({
        hostname: api.hostname,
        port: api.port || 80,
        path: req.url,
        headers: { ...req.headers, host: api.host },
    });
    upstream.on('upgrade', (response, peer, extra) => {
        const headers = Object.entries(response.headers).flatMap(([key, value]) =>
            Array.isArray(value)
                ? value.map((part) => `${key}: ${part}`)
                : value === undefined
                  ? []
                  : [`${key}: ${value}`],
        );
        socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers.join('\r\n')}\r\n\r\n`);
        if (head.length) peer.write(head);
        if (extra.length) socket.write(extra);
        peer.pipe(socket);
        socket.pipe(peer);
        socket.on('error', () => peer.destroy());
        peer.on('error', () => socket.destroy());
        socket.on('close', () => peer.destroy());
        peer.on('close', () => socket.destroy());
    });
    upstream.on('response', () => socket.destroy());
    upstream.on('error', () => socket.destroy());
    upstream.end();
});
server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
