import {
  useRef
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  ChevronsUp,
  Gauge,
  Square
} from 'lucide-react';

const CONTROLS = [
  { label: 'Acelerar', command: 'forward', icon: ChevronsUp, tone: 'primary' },
  { label: 'Stop', command: 'stop', icon: Square, tone: 'danger' },
  { label: 'Izquierda', command: 'left', icon: ArrowLeft, tone: 'neutral' },
  { label: 'Derecha', command: 'right', icon: ArrowRight, tone: 'neutral' },
  { label: 'Reversa', command: 'backward', icon: ChevronsDown, tone: 'accent', wide: true }
];

const CLICK_PULSE_MS = 100;

function ControlPanel({
  speed,
  onSpeedChange,
  onControlStart,
  onControlEnd,
  onStop,
  pendingCommand,
  activeCommands
}) {
  const ignoreNextClickRef = useRef(false);

  function handlePointerDown(command, event) {
    if (command === 'stop') {
      return;
    }

    event.preventDefault();
    ignoreNextClickRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onControlStart(command);
  }

  function handlePointerEnd(command) {
    if (command !== 'stop') {
      onControlEnd(command);
    }
  }

  function handlePointerCancel(command) {
    ignoreNextClickRef.current = false;
    handlePointerEnd(command);
  }

  function handleClick(command) {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    if (command === 'stop') {
      onStop();
      return;
    }

    onControlStart(command);
    window.setTimeout(() => onControlEnd(command), CLICK_PULSE_MS);
  }

  return (
    <section className="panel control-panel" aria-label="Motor control">
      <div className="panel-title">
        <Gauge size={18} />
        <span>MOTOR CONTROL</span>
      </div>

      <div className="speed-control">
        <div className="speed-readout">
          <span>SPEED</span>
          <strong>{speed}</strong>
        </div>
        <input
          type="range"
          min="0"
          max="255"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          aria-label="Motor speed"
        />
        <div className="speed-scale">
          <span>0</span>
          <span>255</span>
        </div>
      </div>

      <div className="control-grid">
        {CONTROLS.map(({ label, command, icon: Icon, tone, wide }) => {
          const isActive = activeCommands?.has(command);
          const showPending = pendingCommand === command && !isActive;

          return (
            <button
              key={command}
              type="button"
              className={`cyber-button ${tone}${wide ? ' wide' : ''}${isActive ? ' active' : ''}`}
              onClick={() => handleClick(command)}
              onPointerDown={(event) => handlePointerDown(command, event)}
              onPointerUp={() => handlePointerEnd(command)}
              onPointerCancel={() => handlePointerCancel(command)}
              onLostPointerCapture={() => handlePointerEnd(command)}
              aria-pressed={isActive}
              title={label}
            >
              <Icon size={20} />
              <span>{showPending ? 'Enviando...' : label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ControlPanel;
