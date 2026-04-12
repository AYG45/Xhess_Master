import React, { useState } from 'react';
import { CHESS_OPENINGS, type ChessOpening } from '../data/openings';

interface LearnOpeningsProps {
  onBackToLearn: () => void;
}

const DIFF_LABEL: Record<ChessOpening['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const CAT_LABEL: Record<ChessOpening['category'], string> = {
  e4: "1.e4",
  d4: "1.d4",
  nf3: "1.Nf3",
  c4: "1.c4",
  other: "Other",
};

export const LearnOpenings: React.FC<LearnOpeningsProps> = ({ onBackToLearn }) => {
  const [selected, setSelected] = useState<ChessOpening | null>(null);
  const [filterCat, setFilterCat] = useState<'all' | ChessOpening['category']>('all');
  const [filterDiff, setFilterDiff] = useState<'all' | ChessOpening['difficulty']>('all');

  const filtered = CHESS_OPENINGS
    .filter(o => filterCat === 'all' || o.category === filterCat)
    .filter(o => filterDiff === 'all' || o.difficulty === filterDiff)
    .sort((a, b) => b.popularity - a.popularity);

  const diffDot = (d: ChessOpening['difficulty']) => {
    const colors = { 
      beginner: '#3b82f6',      // blue
      intermediate: '#eab308',  // yellow
      advanced: '#ef4444'       // red
    };
    return colors[d];
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="openings-detail animate-fade-in">
        {/* Sticky header */}
        <div className="openings-detail-header">
          <button className="secondary" onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--white)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.name}
            </h1>
            <span style={{ 
              background: `${diffDot(selected.difficulty)}15`, 
              border: `1px solid ${diffDot(selected.difficulty)}40`, 
              color: diffDot(selected.difficulty), 
              padding: '2px 8px', 
              borderRadius: '3px', 
              fontSize: '0.65rem', 
              fontWeight: 600, 
              letterSpacing: '0.08em', 
              textTransform: 'uppercase', 
              flexShrink: 0 
            }}>
              {DIFF_LABEL[selected.difficulty]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '3px' }}>
              {selected.eco}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="openings-detail-body">
          {/* Left column */}
          <div className="openings-detail-left">
            {/* Description */}
            <div className="detail-section">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>{selected.description}</p>
            </div>

            {/* Moves sequence */}
            <div className="detail-section">
              <h3 className="detail-section-title">Opening Moves</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selected.moves.map((move, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {i % 2 === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>{Math.floor(i / 2) + 1}.</span>
                    )}
                    <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '4px 10px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {move}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continuations */}
            {selected.commonContinuations && selected.commonContinuations.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">Common Continuations</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selected.commonContinuations.map((move, i) => (
                    <span key={i} style={{ background: 'transparent', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Famous games */}
            {selected.famousGames && selected.famousGames.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">Famous Games</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selected.famousGames.map((g, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{g.white}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> vs </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{g.black}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.year}</span>
                        <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>{g.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — key ideas */}
          <div className="openings-detail-right">
            <div className="detail-section" style={{ position: 'sticky', top: '1.5rem' }}>
              <h3 className="detail-section-title">Key Ideas</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selected.mainIdeas.map((idea, i) => (
                  <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.3rem', flexShrink: 0 }}>0{i + 1}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{idea}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Popularity</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{selected.popularity}/5</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(selected.popularity / 5) * 100}%`, background: 'var(--white)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Category</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{CAT_LABEL[selected.category]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="openings-root animate-fade-in">
      {/* Page header */}
      <div className="openings-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="secondary" onClick={onBackToLearn} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Learn
          </button>
          <div>
            <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--white)', margin: 0 }}>
              Chess Openings
            </h1>
          </div>
        </div>

        {/* Filters row */}
        <div className="openings-filters">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)} style={{ flex: '0 0 auto' }}>
            <option value="all">All Categories</option>
            <option value="e4">1.e4 — King's Pawn</option>
            <option value="d4">1.d4 — Queen's Pawn</option>
            <option value="nf3">1.Nf3 — Réti</option>
            <option value="c4">1.c4 — English</option>
            <option value="other">Other</option>
          </select>

          <select value={filterDiff} onChange={e => setFilterDiff(e.target.value as any)} style={{ flex: '0 0 auto' }}>
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {filtered.length} opening{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="openings-grid">
        {filtered.map((opening, i) => (
          <div
            key={i}
            className="opening-card"
            onClick={() => setSelected(opening)}
          >
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <h3 style={{ color: 'var(--white)', margin: 0, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                {opening.name}
              </h3>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: diffDot(opening.difficulty), flexShrink: 0, boxShadow: `0 0 4px ${diffDot(opening.difficulty)}60` }} />
                <span style={{ color: diffDot(opening.difficulty), fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {DIFF_LABEL[opening.difficulty]}
                </span>
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.55, marginBottom: '1rem', flex: 1 }}>
              {opening.description}
            </p>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '3px' }}>
                {opening.eco}
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} style={{ width: '14px', height: '3px', borderRadius: '1px', background: j < opening.popularity ? 'var(--text-secondary)' : 'var(--bg-hover)' }} />
                ))}
              </div>
            </div>

            {/* Move chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {opening.moves.slice(0, 4).map((move, mi) => (
                <span key={mi} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {move}
                </span>
              ))}
              {opening.moves.length > 4 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 4px' }}>
                  +{opening.moves.length - 4}
                </span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No openings match your filters.
          </div>
        )}
      </div>
    </div>
  );
};
