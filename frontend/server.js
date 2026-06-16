import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, 'dist');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

export function createStaticServer() {
  return createServer(async (req, res) => {
    try {
      const requestedPath = safePath(req.url || '/');
      const filePath = await resolveStaticPath(requestedPath);

      if (!filePath) {
        sendText(res, 404, 'Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
        'Cache-Control': filePath.includes(`${normalize('/assets/')}`) ? 'public, max-age=31536000, immutable' : 'no-cache'
      });
      createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error(error);
      sendText(res, 500, 'Internal server error');
    }
  });
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const server = createStaticServer();

  server.listen(port, host, () => {
    console.log(`Frontend listening on http://${host}:${port}`);
  });
}

function safePath(url) {
  const pathname = new URL(url, 'http://localhost').pathname;
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  return normalizedPath === '/' ? '/index.html' : normalizedPath;
}

async function resolveStaticPath(requestedPath) {
  const filePath = resolve(join(distDir, requestedPath));

  if (!filePath.startsWith(distDir)) {
    return null;
  }

  if (existsSync(filePath) && (await stat(filePath)).isFile()) {
    return filePath;
  }

  const indexPath = resolve(distDir, 'index.html');
  return existsSync(indexPath) ? indexPath : null;
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}
