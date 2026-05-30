import { useState } from 'react';
import { socket } from '../socket';
import TradePanel from './TradePanel';
import Leaderboard from './Leaderboard';
import PriceBoard from './PriceBoard';
import RollFeed from './RollFeed';
import './GameRoom.css';

export default function GameRoom({ room, me, onLeave }) {
  const [activeTab, setActiveTab] = useState('market'); // 'market' | 'trade' | 'scores'

  return (
    <div className="game-root">
      <header className="game-header">
        <div className="game-header-left">
          <span className="game-room-code">{room.code}</span>
          <span className="game-phase-badge">Live</span>
        </div>
        <div className="game-header-right">
          <span className="game-cash">${me?.cash?.toLocaleString()}</span>
          <button className="leave-btn-sm" onClick={onLeave}>Leave</button>
        </div>
      </header>

      <div className="game-tabs">
        {['market', 'trade', 'scores'].map(t => (
          <button
            key={t}
            className={`game-tab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="game-content">
        {activeTab === 'market' && (
          <>
            <PriceBoard prices={room.prices} />
            <RollFeed history={room.history || []} />
          </>
        )}
        {activeTab === 'trade' && (
          <TradePanel room={room} me={me} />
        )}
        {activeTab === 'scores' && (
          <Leaderboard players={room.players} myId={socket.id} />
        )}
      </div>
    </div>
  );
}
