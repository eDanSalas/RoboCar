import { Cpu, SquareTerminal } from 'lucide-react';

function StatusPanel({ lastCommand, speed, deviceStatus, socketOnline, error }) {
  const statusPayload = deviceStatus?.status || deviceStatus || {};
  const timestamp = lastCommand?.serverTime || lastCommand?.createdAt || deviceStatus?.receivedAt || 'WAITING';

  return (
    <section className="panel status-panel" aria-label="Device status">
      <div className="panel-title">
        <Cpu size={18} />
        <span>DEVICE STATUS</span>
      </div>

      <div className="status-grid">
        <StatusRow label="SOCKET" value={socketOnline ? 'ONLINE' : 'OFFLINE'} tone={socketOnline ? 'ok' : 'warn'} />
        <StatusRow label="LAST COMMAND" value={lastCommand?.command || 'NONE'} />
        <StatusRow label="SPEED" value={lastCommand?.speed ?? speed} />
        <StatusRow label="LEFT SPEED" value={lastCommand?.leftSpeed ?? 0} />
        <StatusRow label="RIGHT SPEED" value={lastCommand?.rightSpeed ?? 0} />
        <StatusRow label="MODE" value={lastCommand?.mode || 'IDLE'} />
        <StatusRow label="TIMESTAMP" value={timestamp} wide />
      </div>

      <div className="device-log">
        <div className="log-title">
          <SquareTerminal size={16} />
          <span>DEVICE PAYLOAD</span>
        </div>
        <pre>{formatStatus(statusPayload)}</pre>
      </div>

      {error && <div className="error-line" role="alert">ERROR: {error}</div>}
    </section>
  );
}

function StatusRow({ label, value, tone = 'normal', wide = false }) {
  return (
    <div className={`status-row ${tone} ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

function formatStatus(statusPayload) {
  if (!statusPayload || Object.keys(statusPayload).length === 0) {
    return 'WAITING FOR DEVICE STATUS...';
  }

  return JSON.stringify(statusPayload, null, 2);
}

export default StatusPanel;
