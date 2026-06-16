const { Server } = require('socket.io');
const { getFrameInfo } = require('./camera.service');
const { getCorsOptions } = require('./cors.service');

let io = null;

function initializeSocket(server) {
  io = new Server(server, {
    cors: getCorsOptions()
  });

  io.on('connection', (socket) => {
    socket.emit('camera:info', getFrameInfo());
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
