const { Server } = require('socket.io');
const { getFrameInfo } = require('./camera.service');
const { getCorsOptions } = require('./cors.service');
const { getGps } = require('./gps.service');

let io = null;

function initializeSocket(server) {
  io = new Server(server, {
    cors: getCorsOptions()
  });

  io.on('connection', (socket) => {
    socket.emit('camera:info', getFrameInfo());
    socket.emit('gps:update', getGps());
  });

  return io;
}

function emitToFrontend(eventName, payload) {
  if (!io) {
    return;
  }

  io.emit(eventName, payload);
}

function getSocketServer() {
  return io;
}

module.exports = {
  initializeSocket,
  emitToFrontend,
  getSocketServer
};
