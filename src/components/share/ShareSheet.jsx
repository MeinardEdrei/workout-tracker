import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, Copy, Download, ImagePlus } from 'lucide-react';
import { useBackClose } from '../../hooks/useBackClose';
import { tick } from '../../utils/haptics';
import { summarizeLog, monthRecap } from '../../utils/workoutStats';
import { renderPng, shareBlob, downloadBlob, canCopyImage, copyBlob } from '../../utils/shareImage';
import { CARD_W, CARD_SIZES, PALETTES, SummaryCard, PRCard, StickerCard, PhotoCard, RecapCard } from './ShareCards';

const TABS = [['summary', 'Summary'], ['pr', 'PR'], ['sticker', 'Sticker'], ['photo', 'Photo'], ['month', 'Month']];
const STATS = [['time', 'Time'], ['volume', 'Volume'], ['sets', 'Sets'], ['prs', 'PRs'], ['muscles', 'Muscles']];
const PREFS_KEY = 'wt_share_prefs';
const DEFAULT_PREFS = { bg: 'dark', size: '9:16', show: { time: true, volume: true, sets: true, prs: true, muscles: false } };

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return { ...DEFAULT_PREFS, ...p, show: { ...DEFAULT_PREFS.show, ...(p.show || {}) } };
  } catch { return DEFAULT_PREFS; }
}

const label = { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.12em', textTransform: 'uppercase' };
const segBtn = (on) => ({ height: 36, borderRadius: 10, border: 'none', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--on-accent)' : 'var(--text2)', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' });

function Segmented({ ariaLabel, options, value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 4, background: 'var(--bg2)', borderRadius: 14, padding: 4, opacity: disabled ? 0.4 : 1 }}>
      {options.map(([id, text]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} disabled={disabled} onClick={() => onChange(id)} style={segBtn(value === id)}>{text}</button>
      ))}
    </div>
  );
}

// Share a finished workout as an image: pick a card, background, size and
// which stats show. The PNG is rendered ahead of time so "Share to…" can open
// the system sheet straight from the tap.
export default function ShareSheet({ log, logs, photoUrl: initialPhoto, onPhotoChange, onClose, onShowToast }) {
  useBackClose(true, onClose);
  const summary = useMemo(() => summarizeLog(log, logs), [log, logs]);
  const recap = useMemo(() => monthRecap([...(logs || []).filter((l) => l.date !== log.date), log], log.date), [log, logs]);
  const [tab, setTab] = useState(initialPhoto ? 'photo' : 'summary');
  const [prefs, setPrefs] = useState(loadPrefs);
  const [prIndex, setPrIndex] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(initialPhoto || null);
  const [stickerY, setStickerY] = useState(0.72);
  const [stickerBg, setStickerBg] = useState('clear');
  const [png, setPng] = useState(null);
  const [rendering, setRendering] = useState(false);
  const captureRef = useRef(null);
  const previewRef = useRef(null);
  const fileRef = useRef(null);
  const [box, setBox] = useState({ w: 300, h: 400 });

  const update = (patch) => setPrefs((p) => {
    const next = { ...p, ...patch };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });

  const isSticker = tab === 'sticker';
  const isPhoto = tab === 'photo';
  // Stickers start see-through — that's the point of them.
  const bg = isPhoto ? 'clear' : isSticker ? stickerBg : prefs.bg;
  const p = PALETTES[bg];
  const height = CARD_SIZES[prefs.size];
  const showStats = tab === 'summary' || isSticker || isPhoto;

  const card = (() => {
    if (tab === 'summary') return <SummaryCard log={log} summary={summary} show={prefs.show} p={p} height={height} />;
    if (tab === 'pr') return <PRCard log={log} summary={summary} prIndex={prIndex} p={p} height={height} />;
    if (isSticker) return <StickerCard log={log} summary={summary} show={prefs.show} p={p} />;
    if (isPhoto) return <PhotoCard log={log} summary={summary} show={prefs.show} photoUrl={photoUrl} stickerY={stickerY} height={height} />;
    return <RecapCard recap={recap} p={p} height={height} />;
  })();
  const cardHeight = isSticker ? null : height;

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-render the PNG shortly after any change; drop results that are stale.
  const renderKey = JSON.stringify([tab, bg, prefs.size, prefs.show, prIndex, photoUrl, Math.round(stickerY * 100)]);
  useEffect(() => {
    let alive = true;
    setPng(null);
    if (isPhoto && !photoUrl) return undefined;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const blob = await renderPng(captureRef.current.firstChild, { transparent: bg === 'clear' && !isPhoto });
        if (alive) setPng(blob);
      } catch (e) {
        if (alive) onShowToast?.(`Couldn't make the image: ${e.message}`, 'error');
      } finally {
        if (alive) setRendering(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [renderKey]);

  const choosePhoto = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    onPhotoChange?.(url);
    setTab('photo');
  };

  // Drag the stats sticker up/down over the photo.
  const dragRef = useRef(null);
  const scale = Math.min(box.w / CARD_W, box.h / (cardHeight || 220), 1.2);
  const onPointerDown = (e) => {
    if (!isPhoto || !photoUrl) return;
    dragRef.current = { y: e.clientY, start: stickerY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const travel = (height - 170) * scale;
    setStickerY(Math.min(1, Math.max(0, dragRef.current.start + (e.clientY - dragRef.current.y) / travel)));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const filename = `workout-${log.date}-${tab}.png`;
  const title = `${log.dayName} — workout`;
  const onShare = async () => {
    if (!png) return;
    tick();
    try {
      const r = await shareBlob(png, filename, title);
      if (r === 'downloaded') onShowToast?.('Image saved', 'success');
    } catch (e) { onShowToast?.(`Couldn't share: ${e.message}`, 'error'); }
  };
  const onSave = () => { if (png) { tick(); downloadBlob(png, filename); onShowToast?.('Image saved', 'success'); } };
  const onCopy = async () => {
    if (!png) return;
    tick();
    try { await copyBlob(png); onShowToast?.('Image copied', 'success'); }
    catch (e) { onShowToast?.(`Couldn't copy: ${e.message}`, 'error'); }
  };

  const iconBtn = { width: 64, height: 64, borderRadius: 16, background: 'var(--bg2)', border: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Share workout" style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <header style={{ height: 64, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button type="button" aria-label="Back" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--bg2)', border: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '0.08em' }}>SHARE</h1>
          <span style={{ width: 44 }} />
        </header>

        <div role="tablist" aria-label="Card type" style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          {TABS.map(([id, text]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{ height: 40, padding: '0 16px', borderRadius: 20, border: 'none', flexShrink: 0, background: tab === id ? 'var(--accent)' : 'var(--bg2)', color: tab === id ? 'var(--on-accent)' : 'var(--text)', fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {text}
            </button>
          ))}
        </div>

        <div ref={previewRef} style={{ flex: 1, minHeight: 0, margin: '0 16px', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 16,
          background: bg === 'clear' && !isPhoto ? 'repeating-conic-gradient(#2a2724 0% 25%, #1b1a18 0% 50%) 50% / 20px 20px' : 'var(--bg2)' }}>
          {isPhoto && !photoUrl ? (
            <button type="button" onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', minHeight: 120 }}>
              <ImagePlus size={40} strokeWidth={1.5} aria-hidden="true" />
              <span style={{ ...label, fontSize: 15 }}>Choose a gym photo</span>
            </button>
          ) : (
            <div style={{ width: CARD_W * scale, height: (cardHeight || 0) * scale || 'auto', position: 'relative' }}>
              <div aria-label="Card preview" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_W, borderRadius: 12 / scale, overflow: 'hidden', boxShadow: bg === 'clear' && !isPhoto ? 'none' : '0 18px 40px rgba(0,0,0,0.5)', touchAction: isPhoto ? 'none' : 'auto', cursor: isPhoto ? 'grab' : 'default' }}>
                {card}
              </div>
              {isPhoto && <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 12, fontWeight: 700, color: '#121110', background: '#f2eee8', borderRadius: 8, padding: '4px 8px', letterSpacing: '0.08em' }}>DRAG TO MOVE</span>}
            </div>
          )}
        </div>

        <section style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          {tab === 'pr' && summary.prs.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {summary.prs.map((pr, i) => (
                <button key={pr.name} type="button" aria-pressed={prIndex === i} onClick={() => setPrIndex(i)}
                  style={{ height: 40, padding: '0 14px', borderRadius: 20, border: 'none', flexShrink: 0, background: prIndex === i ? 'rgba(var(--red-rgb), 0.16)' : 'var(--bg2)', color: prIndex === i ? 'var(--red)' : 'var(--text2)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {pr.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {isPhoto ? (
              <button type="button" className="btn btn-ghost" style={{ minHeight: 44, fontSize: 15 }} onClick={() => fileRef.current?.click()}>{photoUrl ? 'Change photo' : 'Choose photo'}</button>
            ) : (
              <Segmented ariaLabel="Background" value={bg} onChange={(v) => (isSticker ? setStickerBg(v) : update({ bg: v }))} options={[['dark', 'Dark'], ['chalk', 'Chalk'], ['clear', 'Clear']]} />
            )}
            <Segmented ariaLabel="Size" value={prefs.size} onChange={(v) => update({ size: v })} disabled={isSticker} options={[['9:16', '9:16'], ['4:5', '4:5'], ['1:1', '1:1']]} />
          </div>
          {showStats && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {STATS.filter(([id]) => !(id === 'muscles' && tab !== 'summary')).map(([id, text]) => {
                const on = prefs.show[id];
                return (
                  <button key={id} type="button" aria-pressed={on} onClick={() => update({ show: { ...prefs.show, [id]: !on } })}
                    style={{ height: 40, padding: '0 14px', borderRadius: 20, border: 'none', background: on ? 'var(--bg3)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--bg4)', color: on ? 'var(--text)' : 'var(--text2)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    {on && <Check size={14} strokeWidth={2.6} style={{ color: 'var(--green)' }} aria-hidden="true" />}{text}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer style={{ padding: '12px 16px calc(16px + var(--safe-bottom))', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" aria-label="Save image" style={{ ...iconBtn, opacity: png ? 1 : 0.5 }} disabled={!png} onClick={onSave}><Download size={20} /></button>
          {canCopyImage() && <button type="button" aria-label="Copy image" style={{ ...iconBtn, opacity: png ? 1 : 0.5 }} disabled={!png} onClick={onCopy}><Copy size={20} /></button>}
          <button type="button" className="btn btn-accent" style={{ flex: 1, minHeight: 64, fontSize: 20 }} disabled={!png} onClick={onShare}>
            {png ? 'Share to…' : rendering ? 'Preparing…' : isPhoto && !photoUrl ? 'Choose a photo' : 'Share to…'}
          </button>
        </footer>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { choosePhoto(e.target.files?.[0]); e.target.value = ''; }} />
      {/* Unscaled copy of the card that gets captured to PNG. */}
      <div ref={captureRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>{card}</div>
    </div>,
    document.body
  );
}
