import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SplitModal({ title, initial = '', onConfirm, onClose }) {
  const [value, setValue] = useState(initial);
  function submit(e) { e.preventDefault(); if (!value.trim()) return; onConfirm(value.trim()); }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        <form onSubmit={submit}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Split name…" autoFocus />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Confirm</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['splits'] });

  const activateMutation = useMutation({ mutationFn: (id) => storage.activateSplit(id), onSuccess: invalidate });
  const createMutation = useMutation({ mutationFn: (name) => storage.createSplit(name), onSuccess: invalidate });
  const renameMutation = useMutation({ mutationFn: ({ id, name }) => storage.renameSplit(id, name), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id) => storage.deleteSplit(id), onSuccess: invalidate });

  async function handleActivate(split) {
    if (split.isActive || actionLoading) return;
    setActionLoading(split._id);
    try { await activateMutation.mutateAsync(split._id); }
    finally { setActionLoading(null); }
  }
  async function handleCreate(name) { setModal(null); await createMutation.mutateAsync(name); }
  async function handleRename(name) { const id = modal.split._id; setModal(null); await renameMutation.mutateAsync({ id, name }); }
  async function handleDelete() { const id = modal.split._id; setModal(null); await deleteMutation.mutateAsync(id); }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Splits</h1>
          <div className="page-subtitle">{splits.length} programs</div>
        </div>
        <button className="btn btn-accent" onClick={() => setModal({ type: 'add' })}>
          <PlusIcon /> New
        </button>
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="empty-state">No splits yet.<br />Tap New to create one.</div>
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {splits.map((split) => (
            <div
              key={split._id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10,
                borderRadius: 10, border: `1px solid ${split.isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: split.isActive ? 'rgba(232,255,90,0.04)' : 'var(--bg2)',
                opacity: actionLoading === split._id ? 0.5 : 1, transition: 'opacity 0.15s',
              }}
            >
              <button
                onClick={() => handleActivate(split)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${split.isActive ? 'var(--accent)' : 'var(--border2)'}`,
                  background: split.isActive ? 'var(--accent)' : 'transparent',
                  flexShrink: 0, cursor: split.isActive ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                }}
              >
                {split.isActive && <CheckIcon />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em',
                  color: split.isActive ? 'var(--accent)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {split.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>
                  {split.days?.length || 0} days
                  {split.isActive && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', fontSize: 10, textTransform: 'uppercase' }}>● Active</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-icon" onClick={() => setModal({ type: 'rename', split })} title="Rename">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5Z" />
                  </svg>
                </button>
                <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setModal({ type: 'delete', split })} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
                    <line x1="6.5" y1="7" x2="6.5" y2="11" /><line x1="9.5" y1="7" x2="9.5" y2="11" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'add' && <SplitModal title="New Split" onConfirm={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'rename' && <SplitModal title="Rename Split" initial={modal.split.name} onConfirm={handleRename} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <ConfirmModal message={`Delete "${modal.split.name}"? This cannot be undone.`} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}
