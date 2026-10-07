const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const outputDirectory = process.argv[3] || 'dist';
if (!/^dist(?:-[A-Za-z0-9_-]+)?$/.test(outputDirectory)) throw new Error('Only a generated dist directory can be served.');
const root = path.resolve(__dirname, '..', outputDirectory);
const port = Number(process.argv[2] || 8082);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function insideRoot(filePath) {
  return filePath === root || filePath.startsWith(`${root}${path.sep}`);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  let requestedPath;
  try { requestedPath = decodeURIComponent(requestUrl.pathname); }
  catch { response.writeHead(400); response.end('Invalid URL'); return; }
  const candidate = path.resolve(root, `.${requestedPath}`);
  const filePath = insideRoot(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate
    : path.join(root, 'index.html');

  if (!insideRoot(filePath) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`4Chinese web is available at http://localhost:${port}`);
});
