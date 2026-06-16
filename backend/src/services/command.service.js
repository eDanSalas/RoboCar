const VALID_COMMANDS = new Set([
  'forward',
  'backward',
  'stop',
  'brake',
  'left',
  'right',
  'zero_left',
  'zero_right'
]);

const DEFAULT_SPEED = 180;

let lastCommand = null;
let lastDeviceStatus = null;

function getCommandTtlMs() {
  const ttl = Number(process.env.COMMAND_TTL_MS || 2000);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 2000;
}

function parseSpeed(speed) {
  if (speed === undefined) {
    return DEFAULT_SPEED;
  }

  const numericSpeed = Number(speed);

  if (!Number.isFinite(numericSpeed)) {
    const error = new Error('speed must be a number between 0 and 255.');
    error.statusCode = 400;
    error.code = 'INVALID_SPEED';
    throw error;
  }

  return Math.min(255, Math.max(0, Math.round(numericSpeed)));
}

function assertValidCommand(command) {
  if (!VALID_COMMANDS.has(command)) {
    const error = new Error(`Invalid command. Valid commands: ${Array.from(VALID_COMMANDS).join(', ')}.`);
    error.statusCode = 400;
    error.code = 'INVALID_COMMAND';
    throw error;
  }
}

function motorPayload(command, speed) {
  let leftSpeed = 0;
  let rightSpeed = 0;
  let mode = 'drive';

  switch (command) {
    case 'forward':
      leftSpeed = speed;
      rightSpeed = speed;
      break;
    case 'backward':
      leftSpeed = -speed;
      rightSpeed = -speed;
      break;
    case 'brake':
      mode = 'brake';
      break;
    case 'left':
      leftSpeed = Math.round(speed * 0.4);
      rightSpeed = speed;
      break;
    case 'right':
      leftSpeed = speed;
      rightSpeed = Math.round(speed * 0.4);
      break;
    case 'zero_left':
      leftSpeed = -speed;
      rightSpeed = speed;
      break;
    case 'zero_right':
      leftSpeed = speed;
      rightSpeed = -speed;
      break;
    case 'stop':
    default:
      break;
  }

  return {
    command,
    speed,
    leftSpeed,
    rightSpeed,
    mode
  };
}

function buildStopCommand(reason = 'idle') {
  return {
    ...motorPayload('stop', 0),
    active: false,
    reason,
    createdAt: null,
    expiresAt: null,
    serverTime: new Date().toISOString()
  };
}

function saveCommand(payload) {
  const command = payload.command;

  assertValidCommand(command);

  const speed = parseSpeed(payload.speed);
  const now = Date.now();
  const ttlMs = getCommandTtlMs();

  lastCommand = {
    ...motorPayload(command, speed),
    active: true,
    reason: 'latest_command',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    ttlMs
  };

  return {
    ...lastCommand,
    serverTime: new Date().toISOString()
  };
}

function getCommandForDevice(deviceId) {
  if (!lastCommand) {
    return buildStopCommand('no_command');
  }

  const now = Date.now();
  const expiresAt = Date.parse(lastCommand.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return buildStopCommand('expired');
  }

  return {
    ...lastCommand,
    deviceId,
    serverTime: new Date(now).toISOString()
  };
}

function saveDeviceStatus(deviceId, payload) {
  lastDeviceStatus = {
    deviceId,
    status: payload,
    receivedAt: new Date().toISOString()
  };

  return lastDeviceStatus;
}

function getDeviceStatus() {
  return lastDeviceStatus;
}

module.exports = {
  VALID_COMMANDS,
  saveCommand,
  getCommandForDevice,
  saveDeviceStatus,
  getDeviceStatus
};
