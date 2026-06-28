import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicSplits, copyPublicSplit } from '../api/index';
import { useAuth } from '../context/AuthContext';

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, flexShrink: 0,
      border: '1.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    }} />
  );
}

function Toast({ message, type = 'success', onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg2)', border: `1px solid ${type === 'error' ? 'var(--red)' : 'var(--accent)'}`,
      color: 'var(--text)', padding: '8px 14px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, zIndex: 400, whiteSpace: 'nowrap',
      display: 'flex', alignItems: 'center', gap: 7,
      animation: 'fadeIn 0.15s ease',
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
    </div>
  );
}

export default function BrowseSplitsPage({ onBack }) {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicSplits', page],
    queryFn: () => getPublicSplits(page),
    keepPreviousData: true,
  });

  const copyMutation = useMutation({
    mutationFn: copyPublicSplit,
    onSuccess: (newSplit, id) => {
      setAddedIds((prev) => new Set([...prev, id]));
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      showToast('Split added to your programs!');
    },
    onError: (err) => showToast(err.message || 'Failed to add split', 'error'),
  });

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const allSplits = data?.splits || [];
  const filtered = search.trim()
    ? allSplits.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (s.userId?.name || '').toLowerCase().includes(search.trim().toLowerCase()))
    : allSplits;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 4 }}>
            <BackIcon /> Splits
          </button>
          <h1 className="page-title">Browse Splits</h1>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlobeIcon />
            <span>Community programs</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '20px 16px 16px' }}>
        <input
          className="input"
          placeholder="Search by name or creator…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : isError ? (
        <div className="empty-state">Failed to load public splits.</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {search ? 'No splits match your search.' : 'No public splits available yet.\nBe the first to share yours!'}
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {filtered.map((split) => {
            const isExpanded = expandedIds.includes(split._id);
            const isAdded = addedIds.has(split._id);
            const isCopying = copyMutation.isPending && copyMutation.variables === split._id;
            const sortedDays = [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
            const trainingDays = sortedDays.filter((d) => !d.isRest);
            const tags = [...new Set(trainingDays.map((d) => d.tag).filter(Boolean))];

            return (
              <div
                key={split._id}
                style={{
                  marginBottom: 10,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  overflow: 'hidden',
                }}
              >
                {/* Card header — top row: avatar + name + chevron */}
                <div
                  onClick={() => toggleExpand(split._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px', cursor: 'pointer', userSelect: 'none' }}
                >
                  {/* Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    {split.userId?.avatar ? (
                      <img src={split.userId.avatar} alt={split.userId.name}
                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1.5px solid var(--border2)' }}
                      />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>
                        {(split.userId?.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + creator */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {split.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                      by {split.userId?.name || 'Unknown'}
                    </div>
                  </div>

                  <ChevronIcon expanded={isExpanded} />
                </div>

                {/* Second row: meta pills + add button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 12px', gap: 8 }}>
                  {/* Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                      {trainingDays.length} training {trainingDays.length === 1 ? 'day' : 'days'}
                    </span>
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(232,255,90,0.07)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); !isAdded && !isCopying && copyMutation.mutate(split._id); }}
                    disabled={isAdded || isCopying}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em',
                      cursor: isAdded || isCopying ? 'default' : 'pointer',
                      border: isAdded ? '1px solid rgba(232,255,90,0.2)' : 'none',
                      background: isAdded ? 'transparent' : 'var(--accent)',
                      color: isAdded ? 'var(--accent)' : '#0a0a0a',
                      display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {isCopying ? <><InlineSpinner /> Adding…</> : isAdded ? '✓ Added' : '+ Add'}
                  </button>
                </div>

                {/* Expanded day list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'rgba(0,0,0,0.2)' }}>
                    {sortedDays.length === 0 ? (
                      <div style={{ color: 'var(--text3)', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>No days configured</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sortedDays.map((day, di) => (
                          <div key={day._id || di} style={{ padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.isRest ? 0 : 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>{day.name}</span>
                                {day.isRest && (
                                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text3)', background: 'rgba(255,255,255,0.03)', padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase', border: '1px solid var(--border)' }}>REST</span>
                                )}
                              </div>
                              {day.tag && (
                                <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(232,255,90,0.08)', padding: '2px 7px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(232,255,90,0.15)' }}>{day.tag}</span>
                              )}
                            </div>
                            {!day.isRest && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(day.exercises || []).map((ex, idx) => {
                                  let prefix = "";
                                  let nameStyle = { color: 'var(--text)' };
                                  if (ex.category === 'warmup') {
                                    prefix = "[WU] ";
                                    nameStyle.color = '#ff9f43';
                                  } else if (ex.category === 'cooldown') {
                                    prefix = "[CD] ";
                                    nameStyle.color = 'var(--blue)';
                                  }
                                  return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text2)', padding: '1px 0' }}>
                                      <span style={nameStyle}>{prefix}{idx + 1}. {ex.name}</span>
                                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontSize: 11 }}>
                                        {ex.sets}×{ex.untilFailure ? 'Failure' : ex.reps}
                                      </span>
                                    </div>
                                  );
                                })}
                                {(day.exercises || []).length === 0 && (
                                  <div style={{ color: 'var(--text3)', fontSize: 11, fontStyle: 'italic' }}>No exercises</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {data?.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 0 24px' }}>
              <button
                className="btn btn-ghost"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ fontSize: 12 }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Page {page} of {data.pages}</span>
              <button
                className="btn btn-ghost"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontSize: 12 }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
