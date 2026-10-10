import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// One confirm dialog for the whole app. tone="danger" (default) is for
// destructive actions; tone="primary" for ordinary confirmations.
export default function ConfirmModal({ title = 'Confirm', message, confirmLabel = 'Delete', tone = 'danger', onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="modal-title" id="confirm-title">{title}</div>
        <div id="confirm-message" style={{ color: 'var(--text2)', fontSize: 'var(--fs-md)', lineHeight: 1.4 }}>{message}</div>
        <div className="modal-actions">
          {/* Destructive dialogs start focus on Cancel so a stray Enter can't delete. */}
          <button className="btn btn-ghost" onClick={onClose} autoFocus={tone === 'danger'}>Cancel</button>
          <button className={tone === 'danger' ? 'btn btn-danger-solid' : 'btn btn-accent'} onClick={onConfirm} autoFocus={tone !== 'danger'}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
