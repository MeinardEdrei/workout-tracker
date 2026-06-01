import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// storage functions come from useStorage() hook inside each component

/* ─── Icons ─── */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="10,4 6,8 10,12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
    </svg>
  );
}
function EditPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5Z" />
    </svg>
  );
}
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="4" x2="11" y2="4" />
      <line x1="3" y1="7" x2="11" y2="7" />
      <line x1="3" y1="10" x2="11" y2="10" />
    </svg>
  );
}

/* ─── Modals ─── */
function TextModal({ title, initial = '', placeholder, onConfirm, onClose }) {
  const [value, setValue] = useState(initial);
  function submit(e) { e.preventDefault(); if (!value.trim()) return; onConfirm(value.trim()); }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        <form onSubmit={submit}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoFocus />
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
        <div className="modal-title">Delete?</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function AddDayModal({ onConfirm, onClose }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [isRest, setIsRest] = useState(false);
  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm({ name: name.trim(), tag: tag.trim(), isRest });
  }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Day</div>
        <form onSubmit={submit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Day name (e.g. Monday)" autoFocus style={{ marginBottom: 8 }} />
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (e.g. Chest + Back)" style={{ marginBottom: 12 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
            <input type="checkbox" checked={isRest} onChange={(e) => setIsRest(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Mark as Rest Day</span>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExerciseModal({ onConfirm, onClose }) {
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg' });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onConfirm({ ...form, name: form.name.trim(), sets: +form.sets, reps: +form.reps, weight: +form.weight });
  }
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Exercise</div>
        <form onSubmit={submit}>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Exercise name" autoFocus style={{ marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Sets</div>
              <input className="input" type="number" min="0" value={form.sets} onChange={(e) => set('sets', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Reps</div>
              <input className="input" type="number" min="0" value={form.reps} onChange={(e) => set('reps', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Weight</div>
              <input className="input" type="number" min="0" step="0.5" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </div>
          </div>
          <select className="select" style={{ width: '100%', marginBottom: 4 }} value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Inline exercise editor ─── */
function ExerciseEditRow({ ex, index, splitId, dayId, onUpdate, onDelete, dragHandleProps }) {
  const { storage } = useStorage();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, weightUnit: ex.weightUnit,
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const updated = await storage.updateExercise(splitId, dayId, ex._id, {
        ...form, sets: +form.sets, reps: +form.reps, weight: +form.weight,
      });
      onUpdate(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
        <input
          className="input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          style={{ marginBottom: 8, fontSize: 14 }}
          autoFocus
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 6, marginBottom: 8 }}>
          {['sets','reps','weight'].map((k) => (
            <div key={k}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
              <input className="input" type="number" min="0" step={k==='weight'?'0.5':'1'} value={form[k]} onChange={(e) => set(k, e.target.value)} style={{ fontSize: 14, padding: '6px 8px' }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Unit</div>
            <select className="select" value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)} style={{ width: '100%', fontSize: 14, padding: '6px 8px' }}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={save} disabled={saving}>Save</button>
        </div>
      </div>
    );
  }

  const weightLabel = ex.weight > 0 ? ` · ${ex.weight}${ex.weightUnit}` : '';
  const repsLabel = ex.reps > 0 ? `${ex.reps} reps` : 'max reps';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
      <div
        {...dragHandleProps}
        style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center', touchAction: 'none', padding: '0 2px' }}
        title="Drag to reorder"
      >
        <GripIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {index + 1}. {ex.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {ex.sets}×{repsLabel}{weightLabel}
        </div>
      </div>
      <button className="btn-icon" onClick={() => setEditing(true)} title="Edit"><EditPencil /></button>
      <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => onDelete(ex._id)} title="Delete"><TrashIcon /></button>
    </div>
  );
}

/* ─── Sortable wrapper for exercise row ─── */
function SortableExerciseEditRow({ ex, index, splitId, dayId, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex._id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <ExerciseEditRow
        ex={ex}
        index={index}
        splitId={splitId}
        dayId={dayId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/* ─── Day editor panel ─── */
function DayEditor({ day, split, onBack, onDayUpdated }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [exercises, setExercises] = useState(day.exercises || []);
  const [modal, setModal] = useState(null);
  const [isRest, setIsRest] = useState(day.isRest);
  const [reorderError, setReorderError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e._id === active.id);
    const newIndex = exercises.findIndex((e) => e._id === over.id);
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    const prevExercises = exercises;

    setExercises(reordered);
    setReorderError(null);

    try {
      await storage.reorderExercises(
        split._id,
        day._id,
        reordered.map((e, i) => ({ _id: e._id, order: i }))
      );
      setExercises(reordered.map((e, i) => ({ ...e, order: i })));
      queryClient.invalidateQueries({ queryKey: ['splits'] });
    } catch {
      setExercises(prevExercises);
      setReorderError('Failed to reorder exercises. Changes reverted.');
      setTimeout(() => setReorderError(null), 3000);
    }
  }

  async function handleAddExercise(data) {
    setModal(null);
    const ex = await storage.createExercise(split._id, day._id, data);
    setExercises((prev) => [...prev, ex]);
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  function handleUpdateExercise(updated) {
    setExercises((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  async function handleDeleteExercise(exId) {
    await storage.deleteExercise(split._id, day._id, exId);
    setExercises((prev) => prev.filter((e) => e._id !== exId));
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  async function toggleRest() {
    const next = !isRest;
    setIsRest(next);
    const updated = await storage.updateDay(split._id, day._id, { isRest: next });
    onDayUpdated(updated);
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  async function handleRenameSave(name) {
    setModal(null);
    const updated = await storage.updateDay(split._id, day._id, { name });
    onDayUpdated(updated);
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  return (
    <div>
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <button className="back-btn" onClick={onBack}><ChevronLeft />{split.name}</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>{day.name}</h1>
            {day.tag && <div className="page-subtitle" style={{ marginTop: 2 }}>{day.tag}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="btn-icon" onClick={() => setModal('rename')} title="Rename day"><EditPencil /></button>
            <button
              className="btn"
              style={{
                fontSize: 11,
                padding: '6px 10px',
                background: isRest ? 'var(--accent)' : 'transparent',
                color: isRest ? '#0a0a0a' : 'var(--text2)',
                border: '1px solid var(--border2)',
              }}
              onClick={toggleRest}
            >
              {isRest ? '✓ Rest' : 'Rest'}
            </button>
          </div>
        </div>
      </div>

      {reorderError && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--red)',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 200,
          maxWidth: 320,
          textAlign: 'center',
        }}>
          {reorderError}
        </div>
      )}

      {isRest ? (
        <div className="empty-state">This is a rest day. Toggle off to add exercises.</div>
      ) : (
        <>
          <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => setModal('addEx')}>
              <PlusIcon /> Add Exercise
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            {exercises.length === 0 ? (
              <div className="empty-state">No exercises yet.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={exercises.map((e) => e._id)} strategy={verticalListSortingStrategy}>
                  {exercises.map((ex, i) => (
                    <SortableExerciseEditRow
                      key={ex._id}
                      ex={ex}
                      index={i}
                      splitId={split._id}
                      dayId={day._id}
                      onUpdate={handleUpdateExercise}
                      onDelete={handleDeleteExercise}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}

      {modal === 'rename' && (
        <TextModal
          title="Rename Day"
          initial={day.name}
          placeholder="Day name…"
          onConfirm={handleRenameSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'addEx' && (
        <AddExerciseModal onConfirm={handleAddExercise} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ─── Split editor panel ─── */
function SplitEditor({ split, onBack, onSplitUpdated }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [days, setDays] = useState(split.days || []);
  const [activeDayId, setActiveDayId] = useState(null);
  const [modal, setModal] = useState(null);

  const activeDay = days.find((d) => d._id === activeDayId);

  function handleDayUpdated(updated) {
    const newDays = days.map((d) => (d._id === updated._id ? { ...d, ...updated } : d));
    setDays(newDays);
    onSplitUpdated({ ...split, days: newDays });
  }

  async function handleAddDay(data) {
    setModal(null);
    const day = await storage.createDay(split._id, data);
    setDays((prev) => [...prev, day]);
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  async function handleDeleteDay(day) {
    setModal(null);
    await storage.deleteDay(split._id, day._id);
    setDays((prev) => prev.filter((d) => d._id !== day._id));
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  if (activeDay) {
    return (
      <DayEditor
        day={activeDay}
        split={split}
        onBack={() => setActiveDayId(null)}
        onDayUpdated={handleDayUpdated}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: 4 }}><ChevronLeft />Splits</button>
          <h1 className="page-title" style={{ fontSize: 22 }}>{split.name}</h1>
        </div>
        <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => setModal('addDay')}>
          <PlusIcon /> Add Day
        </button>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">No days yet. Tap Add Day.</div>
      ) : (
        <div style={{ padding: '12px 16px 0' }}>
          {days.map((day) => (
            <div
              key={day._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 14px',
                marginBottom: 8,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                cursor: 'pointer',
              }}
              onClick={() => setActiveDayId(day._id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                  {day.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                  {day.isRest ? 'Rest Day' : `${(day.exercises || []).length} exercises${day.tag ? ` · ${day.tag}` : ''}`}
                </div>
              </div>
              {day.isRest && <span className="tag">Rest</span>}
              <button
                className="btn-icon"
                style={{ color: 'var(--red)' }}
                onClick={(e) => { e.stopPropagation(); setModal({ type: 'deleteDay', day }); }}
              >
                <TrashIcon />
              </button>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round">
                <polyline points="5,3 9,7 5,11" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {modal === 'addDay' && (
        <AddDayModal onConfirm={handleAddDay} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteDay' && (
        <ConfirmModal
          message={`Delete "${modal.day.name}" and all its exercises?`}
          onConfirm={() => handleDeleteDay(modal.day)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Edit Page root ─── */
export default function EditPage() {
  const { storage, storageKey } = useStorage();
  const [activeSplitId, setActiveSplitId] = useState(null);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const activeSplit = splits.find((s) => s._id === activeSplitId);

  function handleSplitUpdated(updated) {
    // local state update handled inside SplitEditor; query will sync on next invalidation
  }

  if (activeSplit) {
    return (
      <SplitEditor
        split={activeSplit}
        onBack={() => setActiveSplitId(null)}
        onSplitUpdated={handleSplitUpdated}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit</h1>
          <div className="page-subtitle">Select a split to edit</div>
        </div>
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="empty-state">No splits. Create one in the Splits tab.</div>
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {splits.map((split) => (
            <div
              key={split._id}
              style={{
                padding: '14px 16px',
                marginBottom: 8,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onClick={() => setActiveSplitId(split._id)}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                  {split.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                  {split.days?.length || 0} days
                  {split.isActive && (
                    <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', fontSize: 10, textTransform: 'uppercase' }}>
                      ● Active
                    </span>
                  )}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round">
                <polyline points="5,3 9,7 5,11" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
