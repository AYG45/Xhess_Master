import React, { useState } from 'react';
import { OnlineGame } from './OnlineGame';

interface OnlinePlayProps {
  onBackToMenu: () => void;
}

type GameMode = 'create' | 'join' | 'matchmaking' | null;

interface TimeControl {
  id: string;
  label: string;
  time: string;
  increment: string;
  description: string;
  popular?: boolean;
}

const TIME_CONTROLS: TimeControl[] = [
  { id: '3min',      label: '3 + 0',            time: '3 min',   increment: 'No increment',  description: 'Blitz · Fast-paced',      popular: true  },
  { id: '10min',     label: '10 + 0',           time: '10 min',  increment: 'No increment',  description: 'Rapid · Balanced',        popular: true  },
  { id: '15min',     label: '15 + 10',          time: '15 min',  increment: '+10 sec',       description: 'Rapid · Extra time',      popular: true  },
  { id: '5+3',       label: '5 + 3',            time: '5 min',   increment: '+3 sec',        description: 'Blitz · With increment'              },
  { id: '1min',      label: '1 + 0',            time: '1 min',   increment: 'No increment',  description: 'Bullet · Lightning fast'             },
  { id: 'challenge', label: 'Challenge Friends', time: 'Any',     increment: 'Custom',        description: 'Private · Play with friends'         },
];

const SubHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.9rem',
    padding: '0 1.25rem', height: '52px', minHeight: '52px',
    background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)', flexShrink: 0,
  }}>
    <button onClick={onBack} style={{ color: 'var(--text-muted)', padding: '0.25rem', fontSize: '1rem', lineHeight: 1 }}>←</button>
    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)', margin: 0 }}>
      {title}
    </h1>
  </div>
);

export const OnlinePlay: React.FC<OnlinePlayProps> = ({ onBackToMenu }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [customTime, setCustomTime] = useState('10');
  const [customIncrement, setCustomIncrement] = useState('0');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');

  const handleTimeControlSelect = (id: string) => {
    if (id === 'challenge') { setShowChallenge(true); return; }
    setSelectedTimeControl(id);
    setGameMode('matchmaking');
  };

  const handleChallengeAction = (action: 'create' | 'join') => {
    if (action === 'create') { setSelectedTimeControl('10+0'); setGameMode('create'); }
    else { setGameMode('join'); }
  };

  const handleCustomGame = () => {
    setSelectedTimeControl(`${customTime}+${customIncrement}`);
    setGameMode('matchmaking');
  };

  if (gameMode) {
    return (
      <OnlineGame
        timeControl={selectedTimeControl}
        gameMode={gameMode}
        roomId={roomId}
        onBackToMenu={() => { setGameMode(null); setSelectedTimeControl(''); setRoomId(''); }}
      />
    );
  }

  if (showChallenge) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
        <SubHeader title="Challenge Friends" onBack={() => setShowChallenge(false)} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '560px', width: '100%' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '2.5rem', textAlign: 'center' }}>
              Create a private game to play with friends.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem' }}>
              {[
                { action: 'create' as const, label: 'Create Challenge', desc: 'Set up a game and share the link', sub: 'Choose time control · Invite friends · Private room' },
                { action: 'join' as const,   label: 'Join Challenge',   desc: "Enter a friend's game code",     sub: 'Have a code? · Join instantly · Private match' },
              ].map(item => (
                <div
                  key={item.action}
                  onClick={() => handleChallengeAction(item.action)}
                  style={{ background: 'var(--bg-card)', padding: '1.75rem 1.5rem', cursor: 'pointer', transition: 'background var(--transition)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)', marginBottom: '0.4rem' }}>{item.label}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{item.desc}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sub}</p>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.9rem', fontWeight: 600 }}>How it works</p>
              {[
                ['Create', 'Set up a private game with your preferred time control and get a shareable link.'],
                ['Share', 'Send the game code or link to your friend via any platform.'],
                ['Play', 'Your friend joins using the code and you start playing immediately.'],
              ].map(([title, body]) => (
                <div key={title} style={{ marginBottom: '0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{title}: </span>{body}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCustom) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
        <SubHeader title="Custom Game" onBack={() => setShowCustom(false)} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '420px', width: '100%' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
              Set your preferred time control.
            </p>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Time per player (minutes)', value: customTime, min: 1, max: 180, onChange: setCustomTime },
                { label: 'Increment per move (seconds)', value: customIncrement, min: 0, max: 60, onChange: setCustomIncrement },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    style={{
                      width: '100%', padding: '0.65rem 0.9rem',
                      background: 'var(--bg)', border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                      fontSize: '1rem', textAlign: 'center', outline: 'none',
                      transition: 'border-color var(--transition)',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  />
                </div>
              ))}
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)', letterSpacing: '-0.03em' }}>
                  {customTime} + {customIncrement}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {customTime} min · +{customIncrement}s per move
                </div>
              </div>
              <button className="primary" onClick={handleCustomGame} style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem' }}>
                Start Custom Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <SubHeader title="Play Online" onBack={onBackToMenu} />
      <div className="op-wrap">
        <div className="op-inner">
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.7rem', fontWeight: 600, textAlign: 'center' }}>
            Select time control
          </p>
          <h2 className="op-title">Choose your next game</h2>
          <p className="op-subtitle">Pick a format and get matched instantly.</p>

          <div className="time-control-grid">
            {TIME_CONTROLS.map(tc => (
              <div
                key={tc.id}
                onClick={() => handleTimeControlSelect(tc.id)}
                className="time-control-button"
              >
                {tc.popular && (
                  <div className="op-pill">
                    Popular
                  </div>
                )}
                {tc.id === 'challenge' && (
                  <div className="op-pill">
                    Private
                  </div>
                )}
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--white)', marginBottom: '0.35rem' }}>
                  {tc.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {tc.time} · {tc.increment}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {tc.description}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="secondary" onClick={() => setShowCustom(true)} style={{ fontSize: '0.82rem', minHeight: '40px' }}>
              Custom Time Control
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .op-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 1rem;
          display: flex;
          justify-content: center;
        }
        .op-inner {
          width: 100%;
          max-width: 980px;
        }
        .op-title {
          margin: 0 0 0.4rem;
          text-align: center;
          color: var(--white);
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(1.2rem, 2.6vw, 1.65rem);
          letter-spacing: -0.02em;
        }
        .op-subtitle {
          margin: 0 0 1.25rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.83rem;
        }
        .time-control-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.75rem;
        }
        .time-control-button {
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.1rem 1rem;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
          position: relative;
          min-height: 132px;
        }
        .time-control-button:hover {
          background: var(--bg-hover);
          border-color: var(--border-light);
          transform: translateY(-1px);
        }
        .op-pill {
          position: absolute;
          top: 0.65rem;
          right: 0.65rem;
          border: 1px solid var(--border-mid);
          color: var(--text-muted);
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 0.52rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(0,0,0,0.25);
        }
        @media (max-width: 640px) {
          .op-wrap { padding: 1.2rem 0.75rem; }
          .time-control-grid { grid-template-columns: 1fr 1fr; gap: 0.6rem; }
          .time-control-button { min-height: 120px; padding: 0.95rem 0.8rem; }
        }
        @media (max-width: 480px) {
          .time-control-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
