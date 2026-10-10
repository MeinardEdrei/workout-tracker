import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Slide-up panel anchored to the bottom of the screen, in thumb reach.
// Closes on backdrop tap, the close button or Escape.
export default function BottomSheet({ title, onClose, children, labelledBy = 'sheet-title' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8,8,7,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.15s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg2)', borderRadius: '28px 28px 0 0',
          padding: '12px 16px calc(24px + var(--safe-bottom))',
          display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
          animation: 'sheetUp 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <span aria-hidden="true" style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--bg4)', alignSelf: 'center', marginBottom: 'var(--sp-2)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: '0 4px var(--sp-2)' }}>
          <h2 id={labelledBy} style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: 'var(--bg3)', border: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// A full-width 56px row for a sheet: icon + label (+ optional trailing node).
export function SheetRow({ icon: Icon, label, hint, onClick, danger, disabled, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 56, width: '100%', borderRadius: 'var(--r-lg)', border: 'none', background: 'none',
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px', textAlign: 'left',
        color: danger ? 'var(--red)' : 'var(--text)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {Icon && <Icon size={22} strokeWidth={1.8} style={{ color: danger ? 'var(--red)' : 'var(--text2)', flexShrink: 0 }} aria-hidden="true" />}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)' }}>{hint}</span>}
      </span>
      {trailing}
    </button>
  );
}

// Big square action used in the top row of an action sheet.
export function SheetTile({ icon: Icon, label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 80, borderRadius: 'var(--r-lg)', border: 'none',
        background: active ? 'var(--bg4)' : 'var(--bg3)', color: 'var(--text)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 'var(--fs-md)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      }}
    >
      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </button>
  );
}
