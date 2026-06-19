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
const DRIVE_COMMAND_INTERVAL_MS = 100;

const CONTROL_DEFINITIONS = {
  forward: { axis: 'throttle', value: 1 },
  backward: { axis: 'throttle', value: -1 },
  left: { axis: 'steering', value: 1 },
  right: { axis: 'steering', value: -1 }
};

const KEYBOARD_CONTROLS = {
  w: 'forward',
  s: 'backward',
  a: 'left',
  d: 'right'
};

const THROTTLE_CONTROLS = ['forward', 'backward'];
const STEERING_CONTROLS = ['left', 'right'];

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
  const speedRef = useRef(DEFAULT_SPEED);
  const activeDriveControlsRef = useRef(new Set());
  const activeKeyboardKeysRef = useRef(new Set());
  const lastThrottleControlRef = useRef('');
  const lastSteeringControlRef = useRef('');
  const driveTimerRef = useRef(null);
  const driveRequestActiveRef = useRef(false);

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

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

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
    const selectedSpeed = isStop ? 0 : speedRef.current;
    const lastRequest = lastRequestRef.current;
    const requestKey = `${command}:${options.direction || ''}:${options.leftSpeed ?? ''}:${options.rightSpeed ?? ''}`;

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
        direction: options.direction,
        leftSpeed: options.leftSpeed,
        rightSpeed: options.rightSpeed
      });
      setLastCommand(payload.command);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingCommand((current) => (current === command ? '' : current));
    }
  }, []);

  const stopDriveTimer = useCallback(() => {
    if (!driveTimerRef.current) {
      return;
    }

    window.clearInterval(driveTimerRef.current);
    driveTimerRef.current = null;
  }, []);

  const buildDrivePayload = useCallback(() => {
    const activeControlsSet = activeDriveControlsRef.current;
    const throttleControl = activeControlsSet.has(lastThrottleControlRef.current)
      ? lastThrottleControlRef.current
      : findActiveControl(activeControlsSet, THROTTLE_CONTROLS);
    const steeringControl = activeControlsSet.has(lastSteeringControlRef.current)
      ? lastSteeringControlRef.current
      : findActiveControl(activeControlsSet, STEERING_CONTROLS);

    lastThrottleControlRef.current = throttleControl;
    lastSteeringControlRef.current = steeringControl;

    if (!throttleControl && !steeringControl) {
      return null;
    }

    const throttle = throttleControl
      ? CONTROL_DEFINITIONS[throttleControl].value * speedRef.current
      : 0;
    const steering = steeringControl
      ? CONTROL_DEFINITIONS[steeringControl].value * speedRef.current
      : 0;

    return {
      leftSpeed: clampMotorSpeed(throttle + steering),
      rightSpeed: clampMotorSpeed(throttle - steering)
    };
  }, []);

  const sendActiveDriveCommand = useCallback(async () => {
    if (driveRequestActiveRef.current) {
      return;
    }

    const drivePayload = buildDrivePayload();

    if (!drivePayload) {
      return;
    }

    driveRequestActiveRef.current = true;

    try {
      await dispatchCommand('drive', {
        ...drivePayload,
        immediate: true
      });
    } finally {
      driveRequestActiveRef.current = false;
    }
  }, [buildDrivePayload, dispatchCommand]);

  const startDriveTimer = useCallback(() => {
    if (driveTimerRef.current) {
      return;
    }

    driveTimerRef.current = window.setInterval(() => {
      sendActiveDriveCommand();
    }, DRIVE_COMMAND_INTERVAL_MS);
  }, [sendActiveDriveCommand]);

  const startControl = useCallback((command) => {
    const controlDefinition = CONTROL_DEFINITIONS[command];

    if (!controlDefinition) {
      return;
    }

    activeDriveControlsRef.current.add(command);
    setControlActive(command, true);

    if (controlDefinition.axis === 'throttle') {
      lastThrottleControlRef.current = command;
    }

    if (controlDefinition.axis === 'steering') {
      lastSteeringControlRef.current = command;
    }

    sendActiveDriveCommand();
    startDriveTimer();
  }, [sendActiveDriveCommand, setControlActive, startDriveTimer]);

  const endControl = useCallback((command) => {
    const controlDefinition = CONTROL_DEFINITIONS[command];

    if (!controlDefinition) {
      return;
    }

    if (!activeDriveControlsRef.current.has(command)) {
      return;
    }

    activeDriveControlsRef.current.delete(command);
    setControlActive(command, false);

    if (controlDefinition.axis === 'throttle' && lastThrottleControlRef.current === command) {
      lastThrottleControlRef.current = findActiveControl(activeDriveControlsRef.current, THROTTLE_CONTROLS);
    }

    if (controlDefinition.axis === 'steering' && lastSteeringControlRef.current === command) {
      lastSteeringControlRef.current = findActiveControl(activeDriveControlsRef.current, STEERING_CONTROLS);
    }

    if (activeDriveControlsRef.current.size > 0) {
      sendActiveDriveCommand();
      return;
    }

    stopDriveTimer();
    dispatchCommand('stop', { immediate: true });
  }, [dispatchCommand, sendActiveDriveCommand, setControlActive, stopDriveTimer]);

  const stopAllControls = useCallback(() => {
    activeDriveControlsRef.current.clear();
    activeKeyboardKeysRef.current.clear();
    lastThrottleControlRef.current = '';
    lastSteeringControlRef.current = '';
    setActiveControls(new Set());
    stopDriveTimer();
    dispatchCommand('stop', { immediate: true });
  }, [dispatchCommand, stopDriveTimer]);

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
    function resetActiveKeyboardControls() {
      stopAllControls();
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const command = KEYBOARD_CONTROLS[key];

      if (!command || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.repeat || activeKeyboardKeysRef.current.has(key)) {
        return;
      }

      activeKeyboardKeysRef.current.add(key);
      startControl(command);
    }

    function handleKeyUp(event) {
      const key = event.key.toLowerCase();
      const command = KEYBOARD_CONTROLS[key];

      if (!command) {
        return;
      }

      activeKeyboardKeysRef.current.delete(key);
      endControl(command);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetActiveKeyboardControls);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetActiveKeyboardControls);

      resetActiveKeyboardControls();
    };
  }, [endControl, startControl, stopAllControls]);

  return (
    <main className="app-shell">
      <Header socketOnline={socketOnline} />

      <div className="console-grid">
        <CameraFeed imageSrc={cameraImageSrc} cameraInfo={cameraInfo} />

        <div className="side-stack">
          <ControlPanel
            speed={speed}
            onSpeedChange={setSpeed}
            onControlStart={startControl}
            onControlEnd={endControl}
            onStop={stopAllControls}
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

function findActiveControl(activeControls, controls) {
  return controls.find((control) => activeControls.has(control)) || '';
}

function clampMotorSpeed(value) {
  return Math.min(255, Math.max(-255, Math.round(value)));
}

export default App;
