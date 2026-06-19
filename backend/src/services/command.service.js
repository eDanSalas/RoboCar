const VALID_COMMANDS = new Set([
  'forward',
  'backward',
  'stop',
  'brake',
  'left',
  'right'
]);

const DEFAULT_SPEED = 180;
const TURN_INNER_SPEED_RATIO = 0.6;
const DEFAULT_COMMAND_QUEUE_MAX = 30;
const ABSOLUTE_COMMAND_QUEUE_MAX = 200;

let commandQueue = [];
let lastDeliveredCommand = null;
let lastDeviceStatus = null;
let commandSequence = 0;

function getCommandTtlMs() {
  const ttl = Number(process.env.COMMAND_TTL_MS || 2000);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 2000;
}

function getCommandQueueMax() {
  const max = Number(process.env.COMMAND_QUEUE_MAX || DEFAULT_COMMAND_QUEUE_MAX);

  if (!Number.isFinite(max) || max <= 0) {
    return DEFAULT_COMMAND_QUEUE_MAX;
  }

  return Math.min(Math.trunc(max), ABSOLUTE_COMMAND_QUEUE_MAX);
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

function parseTurnDirection(command, direction) {
  if (command !== 'left' && command !== 'right') {
    return null;
  }

  if (direction === undefined || direction === null || direction === '') {
    return 'forward';
  }

  if (direction === 'forward' || direction === 'backward') {
    return direction;
  }

  const error = new Error('direction must be forward or backward.');
  error.statusCode = 400;
  error.code = 'INVALID_DIRECTION';
  throw error;
}

function motorPayload(command, speed, direction = null) {
  let leftSpeed = 0;
  let rightSpeed = 0;
  let mode = 'drive';
  const turnSpeed = Math.round(speed * TURN_INNER_SPEED_RATIO);
  const directionMultiplier = direction === 'backward' ? -1 : 1;

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
      leftSpeed = directionMultiplier * speed;
      rightSpeed = directionMultiplier * turnSpeed;
      break;
    case 'right':
      leftSpeed = directionMultiplier * turnSpeed;
      rightSpeed = directionMultiplier * speed;
      break;
    case 'stop':
    default:
      break;
  }

  const motorCommand = {
    command,
    speed,
    leftSpeed,
    rightSpeed,
    mode
  };

  if (direction) {
    motorCommand.direction = direction;
  }

  return motorCommand;
}

function buildStopCommand(reason = 'idle') {
  return {
    ...motorPayload('stop', 0),
    active: false,
    reason,
    createdAt: null,
    expiresAt: null,
    queueLength: commandQueue.length,
    serverTime: new Date().toISOString()
  };
}

function saveCommand(payload) {
  const command = payload.command;

  assertValidCommand(command);

  const speed = parseSpeed(payload.speed);
  const direction = parseTurnDirection(command, payload.direction);
  const now = Date.now();
  const ttlMs = getCommandTtlMs();

  const queuedCommand = {
    ...motorPayload(command, speed, direction),
    sequence: ++commandSequence,
    active: true,
    reason: 'queued_command',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    ttlMs
  };

  if (command === 'stop' || command === 'brake') {
    commandQueue = [];
    lastDeliveredCommand = queuedCommand;
  } else {
    purgeExpiredCommands(now);
    commandQueue.push(queuedCommand);
    trimCommandQueue();
  }

  return {
    ...queuedCommand,
    queueLength: commandQueue.length,
    serverTime: new Date().toISOString()
  };
}

function getCommandForDevice(deviceId) {
  const now = Date.now();

  purgeExpiredCommands(now);

  const queuedCommand = commandQueue.shift();

  if (queuedCommand) {
    lastDeliveredCommand = {
      ...queuedCommand,
      reason: 'queued_command'
    };

    return {
      ...lastDeliveredCommand,
      deviceId,
      queueLength: commandQueue.length,
      serverTime: new Date(now).toISOString()
    };
  }

  if (!lastDeliveredCommand) {
    return buildStopCommand('no_command');
  }

  const expiresAt = Date.parse(lastDeliveredCommand.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return buildStopCommand('expired');
  }

  return {
    ...lastDeliveredCommand,
    reason: 'last_delivered_replay',
    deviceId,
    queueLength: commandQueue.length,
    serverTime: new Date(now).toISOString()
  };
}

function purgeExpiredCommands(now = Date.now()) {
  commandQueue = commandQueue.filter((queuedCommand) => {
    const expiresAt = Date.parse(queuedCommand.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

function trimCommandQueue() {
  const max = getCommandQueueMax();

  if (commandQueue.length <= max) {
    return;
  }

  commandQueue = commandQueue.slice(commandQueue.length - max);
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
  getDeviceStatus,
  getCommandQueueMax
};
