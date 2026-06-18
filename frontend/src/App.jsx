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

const KEYBOARD_COMMANDS = {
  w: 'forward',
  a: 'forward',
  s: 'stop',
  arrowdown: 'backward',
  arrowleft: 'left',
  arrowright: 'right'
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

  const lastRequestRef = useRef({ command: '', at: 0 });
  const pressedKeysRef = useRef(new Set());

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

  const dispatchCommand = useCallback(async (command, options = {}) => {
    const now = Date.now();
    const isStop = command === 'stop';
    const immediate = options.immediate || isStop;
    const selectedSpeed = isStop ? 0 : speed;
    const lastRequest = lastRequestRef.current;

    if (!immediate && lastRequest.command === command && now - lastRequest.at < REPEAT_GUARD_MS) {
      return;
    }

    lastRequestRef.current = { command, at: now };
    setPendingCommand(command);
    setError('');

    try {
      const payload = await sendCommand({ command, speed: selectedSpeed });
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
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const command = KEYBOARD_COMMANDS[key];

      if (!command || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.repeat || pressedKeysRef.current.has(event.code)) {
        return;
      }

      pressedKeysRef.current.add(event.code);
      dispatchCommand(command, { immediate: command === 'stop' });
    }

    function handleKeyUp(event) {
      pressedKeysRef.current.delete(event.code);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatchCommand]);

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

export default App;
