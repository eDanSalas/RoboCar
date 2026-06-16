import { Activity, RadioTower } from 'lucide-react';

function Header({ socketOnline }) {
  return (
    <header className="terminal-header">
      <div>
        <p className="terminal-label">SYSTEM ONLINE</p>
        <h1>SMART CAR CONTROL PANEL</h1>
      </div>

      <div className={`connection-pill ${socketOnline ? 'online' : 'offline'}`}>
        {socketOnline ? <RadioTower size={18} /> : <Activity size={18} />}
        <span>{socketOnline ? 'SOCKET ONLINE' : 'SOCKET OFFLINE'}</span>
      </div>
    </header>
  );
}

export default Header;
