import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import CameraFeed from './components/CameraFeed.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import GpsPanel from './components/GpsPanel.jsx';
import StatusPanel from './components/StatusPanel.jsx';
import { API_BASE_URL, sendCommand } from './api/commandApi.js';
import { getLatestGps } from './api/gpsApi.js';
import { createSocketClient } from './socket/socketClient.js';

const DEFAULT_SPEED = 180;
const REPEAT_GUARD_MS = 250;
const HELD_COMMAND_INTERVAL_MS = 300;

const KEYBOARD_COMMANDS = {
  w: { axis: 'drive', command: 'forward' },
  s: { axis: 'drive', command: 'backward' },
  a: { axis: 'turn', command: 'left' },
  d: { axis: 'turn', command: 'right' }
};

function App() {
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [lastCommand, setLastCommand] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [socketOnline, setSocketOnline] = useState(false);
  const [cameraImageSrc, setCameraImageSrc] = useState('');
  const [cameraInfo, setCameraInfo] = useState({ available: false });
  const [gps, setGps] = useState({ available: false, valid: false });
  const [error, setError] = useState('');
  const [pendingCommand, setPendingCommand] = useState('');
  const [activeControls, setActiveControls] = useState(() => new Set());

  const lastRequestRef = useRef({ command: '', at: 0 });
  const activeKeyboardKeysRef = useRef(new Set());
  const lastDriveKeyRef = useRef('');
  const lastTurnKeyRef = useRef('');
  const keyboardTimerRef = useRef(null);
  const keyboardRequestActiveRef = useRef(false);

  const refreshLatestFrame = useCallback(() => {
    setCameraImageSrc(`${API_BASE_URL}/api/camera/latest.jpg?ts=${Date.now()}`);
  }, []);

  const refreshGps = useCallback(async () => {
    try {
      const payload = await getLatestGps();
      setGps(payload.gps);
    } catch (gpsError) {
      setError(gpsError.message);
    }
  }, []);

  const setControlActive = useCallback((command, active) => {
    setActiveControls((current) => {
      const next = new Set(current);

      if (active) {
        next.add(command);
      } else {
        next.delete(command);
      }

      return next;
    });
  }, []);

  const dispatchCommand = useCallback(async (command, options = {}) => {
    const now = Date.now();
    const isStop = command === 'stop';
    const immediate = options.immediate || isStop;
    const selectedSpeed = isStop ? 0 : speed;
    const lastRequest = lastRequestRef.current;
    const requestKey = `${command}:${options.direction || ''}`;

    if (!immediate && lastRequest.command === requestKey && now - lastRequest.at < REPEAT_GUARD_MS) {
      return;
    }

    lastRequestRef.current = { command: requestKey, at: now };
    setPendingCommand(command);
    setError('');

    try {
      const payload = await sendCommand({
        command,
        speed: selectedSpeed,
        direction: options.direction
      });
      setLastCommand(payload.command);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingCommand((current) => (current === command ? '' : current));
    }
  }, [speed]);

  useEffect(() => {
    const socket = createSocketClient();

    function handleConnect() {
      setSocketOnline(true);
      setError('');
    }

    function handleDisconnect() {
      setSocketOnline(false);
    }

    function handleConnectError(socketError) {
      setSocketOnline(false);
      setError(`Socket connection failed: ${socketError.message}`);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('car:command', setLastCommand);
    socket.on('car:status', (status) => {
      setDeviceStatus(status);

      if (status?.status?.gps) {
        setGps({
          available: true,
          ...status.status.gps,
          receivedAt: status.receivedAt
        });
      }
    });
    socket.on('gps:update', setGps);
    socket.on('camera:info', (info) => {
      setCameraInfo(info);

      if (info?.available) {
        refreshLatestFrame();
      }
    });
    socket.on('camera:frame', (frame) => {
      setCameraInfo(frame);

      if (frame?.data) {
        setCameraImageSrc(`data:${frame.mimeType || 'image/jpeg'};base64,${frame.data}`);
      } else {
        refreshLatestFrame();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [refreshGps, refreshLatestFrame]);

  useEffect(() => {
    refreshLatestFrame();
    refreshGps();
    const refreshTimer = window.setInterval(refreshLatestFrame, 5000);
    const gpsTimer = window.setInterval(refreshGps, 10000);

    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(gpsTimer);
    };
  }, [refreshGps, refreshLatestFrame]);

  useEffect(() => {
    function buildActiveKeyboardCommand() {
      const activeKeys = activeKeyboardKeysRef.current;
      const driveKey = activeKeys.has(lastDriveKeyRef.current)
        ? lastDriveKeyRef.current
        : findActiveKey(activeKeys, ['w', 's']);
      const turnKey = activeKeys.has(lastTurnKeyRef.current)
        ? lastTurnKeyRef.current
        : findActiveKey(activeKeys, ['a', 'd']);
      const driveCommand = driveKey ? KEYBOARD_COMMANDS[driveKey].command : '';
      const turnCommand = turnKey ? KEYBOARD_COMMANDS[turnKey].command : '';

      lastDriveKeyRef.current = driveKey;
      lastTurnKeyRef.current = turnKey;

      if (turnCommand) {
        return {
          command: turnCommand,
          direction: driveCommand === 'backward' ? 'backward' : 'forward'
        };
      }

      if (driveCommand) {
        return {
          command: driveCommand,
          direction: ''
        };
      }

      return null;
    }

    async function sendActiveKeyboardCommand() {
      if (keyboardRequestActiveRef.current) {
        return;
      }

      const activeCommand = buildActiveKeyboardCommand();

      if (!activeCommand) {
        return;
      }

      keyboardRequestActiveRef.current = true;

      try {
        await dispatchCommand(activeCommand.command, {
          direction: activeCommand.direction,
          immediate: true
        });
      } finally {
        keyboardRequestActiveRef.current = false;
      }
    }

    function startKeyboardTimer() {
      if (keyboardTimerRef.current) {
        return;
      }

      keyboardTimerRef.current = window.setInterval(() => {
        sendActiveKeyboardCommand();
      }, HELD_COMMAND_INTERVAL_MS);
    }

    function stopKeyboardTimerIfIdle() {
      if (activeKeyboardKeysRef.current.size > 0 || !keyboardTimerRef.current) {
        return;
      }

      window.clearInterval(keyboardTimerRef.current);
      keyboardTimerRef.current = null;
    }

    function resetActiveKeyboardControls() {
      activeKeyboardKeysRef.current.clear();
      lastDriveKeyRef.current = '';
      lastTurnKeyRef.current = '';
      setActiveControls(new Set());

      if (keyboardTimerRef.current) {
        window.clearInterval(keyboardTimerRef.current);
        keyboardTimerRef.current = null;
      }
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const keyAction = KEYBOARD_COMMANDS[key];

      if (!keyAction || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.repeat || activeKeyboardKeysRef.current.has(key)) {
        return;
      }

      activeKeyboardKeysRef.current.add(key);
      setControlActive(keyAction.command, true);

      if (keyAction.axis === 'drive') {
        lastDriveKeyRef.current = key;
      }

      if (keyAction.axis === 'turn') {
        lastTurnKeyRef.current = key;
      }

      sendActiveKeyboardCommand();
      startKeyboardTimer();
    }

    function handleKeyUp(event) {
      const key = event.key.toLowerCase();
      const keyAction = KEYBOARD_COMMANDS[key];

      if (!keyAction) {
        return;
      }

      activeKeyboardKeysRef.current.delete(key);
      setControlActive(keyAction.command, false);

      if (keyAction.axis === 'drive' && lastDriveKeyRef.current === key) {
        lastDriveKeyRef.current = findActiveKey(activeKeyboardKeysRef.current, ['w', 's']);
      }

      if (keyAction.axis === 'turn' && lastTurnKeyRef.current === key) {
        lastTurnKeyRef.current = findActiveKey(activeKeyboardKeysRef.current, ['a', 'd']);
      }

      if (activeKeyboardKeysRef.current.size > 0) {
        sendActiveKeyboardCommand();
      }

      stopKeyboardTimerIfIdle();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetActiveKeyboardControls);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetActiveKeyboardControls);

      if (keyboardTimerRef.current) {
        window.clearInterval(keyboardTimerRef.current);
        keyboardTimerRef.current = null;
      }
    };
  }, [dispatchCommand, setControlActive]);

  return (
    <main className="app-shell">
      <Header socketOnline={socketOnline} />

      <div className="console-grid">
        <CameraFeed imageSrc={cameraImageSrc} cameraInfo={cameraInfo} />

        <div className="side-stack">
          <ControlPanel
            speed={speed}
            onSpeedChange={setSpeed}
            onCommand={dispatchCommand}
            pendingCommand={pendingCommand}
            activeCommands={activeControls}
          />
          <GpsPanel gps={gps} />
          <StatusPanel
            lastCommand={lastCommand}
            speed={speed}
            deviceStatus={deviceStatus}
            socketOnline={socketOnline}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}

function isTypingTarget(target) {
  if (!target) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
}

function findActiveKey(activeKeys, keys) {
  return keys.find((key) => activeKeys.has(key)) || '';
}

export default App;
