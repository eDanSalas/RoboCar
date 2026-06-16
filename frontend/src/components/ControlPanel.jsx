import {
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  Gauge,
  RotateCcw,
  RotateCw,
  Square
} from 'lucide-react';

const CONTROLS = [
  { label: 'Acelerar', command: 'forward', icon: ChevronsUp, tone: 'primary' },
  { label: 'Stop', command: 'stop', icon: Square, tone: 'danger' },
  { label: 'Izquierda', command: 'left', icon: ArrowLeft, tone: 'neutral' },
  { label: 'Derecha', command: 'right', icon: ArrowRight, tone: 'neutral' },
  { label: 'Giro 360 izquierda', command: 'zero_left', icon: RotateCcw, tone: 'accent' },
  { label: 'Giro 360 derecha', command: 'zero_right', icon: RotateCw, tone: 'accent' }
];

function ControlPanel({ speed, onSpeedChange, onCommand, pendingCommand }) {
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
        {CONTROLS.map(({ label, command, icon: Icon, tone }) => (
          <button
            key={command}
            type="button"
            className={`cyber-button ${tone}`}
            onClick={() => onCommand(command, { immediate: command === 'stop' })}
            title={label}
          >
            <Icon size={20} />
            <span>{pendingCommand === command ? 'Enviando...' : label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default ControlPanel;
