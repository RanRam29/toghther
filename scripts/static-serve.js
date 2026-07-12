const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'apps', 'mobile', 'dist');
const port = process.env.PORT || 4176;

const mime = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) filePath = path.join(root, 'index.html');
    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(port, () => console.log(`Listening on http://localhost:${port}`));
