import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Share, Trophy, X } from 'lucide-react';
import { useBackClose } from '../../hooks/useBackClose';
import { tick } from '../../utils/haptics';
import { summarizeLog, fmtKg, fmtNum } from '../../utils/workoutStats';
import ShareSheet from './ShareSheet';

const label = { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.12em', textTransform: 'uppercase' };
const card = { background: 'var(--bg2)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 17 };
const mono = { fontFamily: 'var(--font-mono)', fontSize: 15 };
const signed = (n, unit = '') => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}${unit}`;

// Post-workout screen: what you did, how it compares, a note, then share.
export default function WorkoutSummary({ log, logs, onClose, onSaveNote, onShowToast }) {
  const [sharing, setSharing] = useState(false);
  useBackClose(!sharing, () => finish());
  const s = useMemo(() => summarizeLog(log, logs), [log, logs]);
  const [note, setNote] = useState(log.notes || '');
  const savedNote = useRef(log.notes || '');
  const [photoUrl, setPhotoUrl] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const saveNote = async () => {
    const trimmed = note.trim();
    if (trimmed === savedNote.current) return;
    savedNote.current = trimmed;
    try { await onSaveNote(trimmed); }
    catch (e) { savedNote.current = ''; onShowToast?.(`Couldn't save note: ${e.message}`, 'error'); }
  };
  function finish() { saveNote(); onClose(); }

  const dateLabel = new Date(`${log.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const tiles = [
    s.minutes > 0 && { v: String(s.minutes), l: 'Min' },
    s.volumeKg > 0 && { v: fmtKg(s.volumeKg), l: 'Kg' },
    { v: String(s.sets), l: 'Sets' },
    { v: String(s.prs.length), l: s.prs.length === 1 ? 'PR' : 'PRs', pr: s.prs.length > 0 },
  ].filter(Boolean);
  const vs = s.vsLast;
  const hasVs = vs && (vs.volumePct != null || vs.timeDiffMin != null);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Workout complete" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--bg)', display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <header style={{ padding: '32px 16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span style={{ ...label, color: 'var(--green)' }}>Workout #{s.number} · complete</span>
            <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, lineHeight: 0.95, textTransform: 'uppercase' }}>{log.dayName}</h1>
            <span style={{ fontSize: 15, color: 'var(--text2)' }}>{dateLabel}{log.dayTag ? ` · ${log.dayTag}` : ''}</span>
          </header>

          <main style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 8 }}>
              {tiles.map((t) => (
                <div key={t.l} style={{ background: 'var(--bg2)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, lineHeight: 1, color: t.pr ? 'var(--red)' : 'var(--text)' }}>{t.v}</span>
                  <span style={label}>{t.l}</span>
                </div>
              ))}
            </div>

            {(hasVs || s.swaps.length > 0) && (
              <section style={card}>
                <span style={label}>{hasVs ? `vs last ${vs.dayName}` : 'Swaps'}</span>
                {vs?.volumePct != null && <div style={row}><span>Volume</span><span style={{ ...mono, color: vs.volumePct >= 0 ? 'var(--green)' : 'var(--text2)' }}>{signed(vs.volumePct, '%')}</span></div>}
                {vs?.timeDiffMin != null && <div style={row}><span>Time</span><span style={{ ...mono, color: vs.timeDiffMin <= 0 ? 'var(--green)' : 'var(--text2)' }}>{signed(vs.timeDiffMin, ' min')}</span></div>}
                {s.swaps.map((w) => <div key={w.to} style={row}><span>Swap</span><span style={{ ...mono, textAlign: 'right' }}>{w.from} → {w.to}</span></div>)}
              </section>
            )}

            {s.prs.length > 0 && (
              <section style={card}>
                <span style={{ ...label, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={16} aria-hidden="true" /> New records</span>
                {s.prs.map((pr) => (
                  <div key={pr.name} style={row}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.name}</span>
                    <span style={{ ...mono, flexShrink: 0 }}>{fmtNum(pr.weight)}{pr.unit === 'lbs' ? ' lb' : ''} × {pr.reps} · +{fmtNum(pr.diff)} {pr.unit === 'lbs' ? 'lb' : 'kg'}</span>
                  </div>
                ))}
              </section>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={label}>Session note</span>
              <textarea rows={2} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} placeholder="Slept badly, gym packed…"
                style={{ background: 'var(--bg2)', border: 'none', borderRadius: 16, padding: '14px 16px', color: 'var(--text)', fontSize: 17, resize: 'none' }} />
            </label>

            {photoUrl ? (
              <div style={{ position: 'relative', height: 120, borderRadius: 16, overflow: 'hidden', backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <button type="button" aria-label="Remove photo" onClick={() => setPhotoUrl(null)} style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 22, border: 'none', background: 'rgba(18,17,16,0.7)', color: '#f2eee8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} style={{ height: 56, borderRadius: 16, background: 'var(--bg2)', border: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <Camera size={20} style={{ color: 'var(--text2)' }} aria-hidden="true" /> Add gym photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoUrl(URL.createObjectURL(f)); e.target.value = ''; }} />
          </main>
        </div>

        <footer style={{ padding: '16px 16px calc(16px + var(--safe-bottom))', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost" style={{ width: 112, minHeight: 64, fontSize: 18 }} onClick={() => { tick(); finish(); }}>Done</button>
          <button type="button" className="btn btn-accent" style={{ flex: 1, minHeight: 64, fontSize: 20, gap: 10 }} onClick={() => { tick(); saveNote(); setSharing(true); }}>
            <Share size={20} aria-hidden="true" /> Share
          </button>
        </footer>
      </div>

      {sharing && (
        <ShareSheet log={{ ...log, notes: note }} logs={logs} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} onClose={() => setSharing(false)} onShowToast={onShowToast} />
      )}
    </div>,
    document.body
  );
}
