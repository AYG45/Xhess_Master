import React, { useState } from 'react';
import { LearnOpenings } from './LearnOpenings';

interface LearnProps {
  onNavigate: (page: string) => void;
}

type LearnSection = 'main' | 'openings' | 'tactics' | 'endgames' | 'strategy';

export const Learn: React.FC<LearnProps> = ({ onNavigate }) => {
  const [currentSection, setCurrentSection] = useState<LearnSection>('main');

  if (currentSection === 'openings') {
    return <LearnOpenings onBackToLearn={() => setCurrentSection('main')} />;
  }

  const learningSections = [
    {
      id: 'openings' as LearnSection,
      title: 'Openings',
      icon: 'Opening Theory',
      description: 'Master the first phase of the game with our comprehensive opening library.',
      features: ['15+ Variations', 'Deep Analysis', 'Strategic Ideas'],
      available: true
    },
    {
      id: 'tactics' as LearnSection,
      title: 'Tactics',
      icon: 'Pattern Recognition',
      description: 'Sharpen your tactical vision with combinations and forcing moves.',
      features: ['Pins & Skewers', 'Discoveries', 'Mating Nets'],
      available: false
    },
    {
      id: 'endgames' as LearnSection,
      title: 'Endgames',
      icon: 'Theoretical Conversions',
      description: 'Learn essential endgame techniques and theoretical draw/win positions.',
      features: ['Basic Mates', 'Pawn Endgames', 'Rook Play'],
      available: false
    },
    {
      id: 'strategy' as LearnSection,
      title: 'Strategy',
      icon: 'Positional Mastery',
      description: 'Understand positional play, pawn structures, and long-term planning.',
      features: ['Weak Squares', 'Piece Activity', 'Prophylaxis'],
      available: false
    }
  ];

  return (
    <div className="animate-fade-in learn-container" style={{
      height: '100%',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--gray-800) transparent',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 3vw, 1.5rem)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.1rem', fontWeight: 500 }}>Study</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.05em', color: 'var(--white)', marginBottom: '0.75rem', lineHeight: 1 }}>
            Study Matrix
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
            A systematized approach to mastery. From opening principles to endgame theory.
          </p>
        </div>

        <div className="learn-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '3rem',
        }}>
          {learningSections.map((section) => (
            <div
              key={section.id}
              onClick={() => section.available ? setCurrentSection(section.id) : null}
              style={{
                background: 'var(--bg-card)',
                padding: '1.75rem 1.5rem',
                cursor: section.available ? 'pointer' : 'default',
                transition: 'background var(--transition)',
                opacity: section.available ? 1 : 0.35,
                position: 'relative',
              }}
              onMouseEnter={e => { if (section.available) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (section.available) e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.1rem', fontWeight: 600 }}>
                {section.icon}
              </p>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--white)', fontSize: '1.05rem', marginBottom: '0.55rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {section.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.1rem', fontSize: '0.76rem' }}>
                {section.description}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.features.map((feature, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray-600)', flexShrink: 0 }} />
                    {feature}
                  </li>
                ))}
              </ul>
              {!section.available && (
                <div style={{ position: 'absolute', top: '1.1rem', right: '1.1rem', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 5px', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', borderRadius: '2px' }}>
                  Soon
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary" onClick={() => setCurrentSection('openings')}>Access Openings</button>
            <button className="secondary" onClick={() => onNavigate('play')}>Back to Play</button>
          </div>
        </div>
      </div>
    </div>
  );
};