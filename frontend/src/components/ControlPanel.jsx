import {
  useEffect,
  useRef,
  useState
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

const HELD_BUTTON_INTERVAL_MS = 300;

function ControlPanel({ speed, onSpeedChange, onCommand, pendingCommand, activeCommands }) {
  const [activePointerCommand, setActivePointerCommand] = useState('');
  const pointerTimerRef = useRef(null);
  const ignoreNextClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pointerTimerRef.current) {
        window.clearInterval(pointerTimerRef.current);
        pointerTimerRef.current = null;
      }
    };
  }, []);

  function startPointerHold(command, event) {
    if (command === 'stop') {
      return;
    }

    event.preventDefault();
    ignoreNextClickRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    stopPointerHold();
    setActivePointerCommand(command);
    onCommand(command, { immediate: true });

    pointerTimerRef.current = window.setInterval(() => {
      onCommand(command, { immediate: true });
    }, HELD_BUTTON_INTERVAL_MS);
  }

  function stopPointerHold() {
    if (pointerTimerRef.current) {
      window.clearInterval(pointerTimerRef.current);
      pointerTimerRef.current = null;
    }

    setActivePointerCommand('');
  }

  function cancelPointerHold() {
    ignoreNextClickRef.current = false;
    stopPointerHold();
  }

  function handleClick(command) {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    onCommand(command, { immediate: command === 'stop' });
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
          const isActive = activePointerCommand === command || activeCommands?.has(command);
          const showPending = pendingCommand === command && !isActive;

          return (
            <button
              key={command}
              type="button"
              className={`cyber-button ${tone}${wide ? ' wide' : ''}${isActive ? ' active' : ''}`}
              onClick={() => handleClick(command)}
              onPointerDown={(event) => startPointerHold(command, event)}
              onPointerUp={stopPointerHold}
              onPointerCancel={cancelPointerHold}
              onLostPointerCapture={stopPointerHold}
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
