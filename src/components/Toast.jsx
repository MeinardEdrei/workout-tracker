import { Check, AlertCircle, X } from 'lucide-react';

const TONES = {
  success: { color: 'var(--green)', Icon: Check, role: 'status' },
  error: { color: 'var(--red)', Icon: AlertCircle, role: 'alert' },
  info: { color: 'var(--text2)', Icon: null, role: 'status' },
  loading: { color: 'var(--text2)', Icon: null, role: 'status' },
};

function Spinner() {
  return (
    <span aria-hidden="true" style={{
      width: 16, height: 16, flexShrink: 0, borderRadius: '50%',
      border: '2px solid var(--text3)', borderTopColor: 'transparent',
      animation: 'spin 0.6s linear infinite',
    }} />
  );
}

// The one floating notice above the bottom nav. `icon` overrides the tone's
// default icon (pass a lucide component); `action` adds a text button such as
// Undo or Retry; `onDismiss` adds a close button.
export default function Toast({ tone = 'success', icon: IconOverride, action, onDismiss, children }) {
  const { color, Icon: DefaultIcon, role } = TONES[tone] || TONES.info;
  const Icon = IconOverride || DefaultIcon;
  return (
    <div role={role} style={{
      position: 'fixed', bottom: 'var(--above-nav)', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 420, minHeight: 52, zIndex: 400,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: `8px ${onDismiss || action ? 6 : 16}px 8px 16px`,
      background: 'var(--bg3)', borderRadius: 'var(--r-lg)',
      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.5)`,
      color: 'var(--text)', fontSize: 'var(--fs-md)', fontWeight: 600, lineHeight: 1.3,
      animation: 'fadeIn 0.2s ease',
    }}>
      {tone === 'loading' ? <Spinner /> : Icon && <Icon size={18} strokeWidth={2.4} style={{ color, flexShrink: 0 }} aria-hidden="true" />}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {action && (
        <button type="button" onClick={action.onClick} style={{ height: 40, padding: '0 12px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'underline', cursor: 'pointer' }}>
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} style={{ width: 40, height: 40, flexShrink: 0, background: 'none', border: 'none', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
