require('./config/env');

const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./services/socket.service');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

initializeSocket(server);

server.listen(port, host, () => {
  console.log(`Robot car backend listening on http://${host}:${port}`);
});
