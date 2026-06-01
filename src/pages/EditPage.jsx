import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { MusclePill, MUSCLE_COLORS } from '../components/MusclePill';
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

/* ─── Constants ─── */
const STANDARD_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Rest'];
const DAY_SHORT = { Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT', Sunday: 'SUN', Rest: 'REST' };
const TAG_OPTIONS = ['Chest + Back', 'Shoulders + Back', 'Legs + Core', 'Push', 'Pull', 'Full Body', 'Rest', 'Cardio', 'Upper Body', 'Lower Body'];
const MUSCLE_OPTIONS = Object.keys(MUSCLE_COLORS);
const LABEL = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 };

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

/* ─── Shared pill button for pickers ─── */
function PickerPill({ label, selected, disabled, onClick, small }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: small ? 36 : 44,
        padding: small ? '6px 10px' : '10px 14px',
        borderRadius: 22,
        border: selected ? 'none' : '1px solid var(--border2)',
        background: selected ? 'var(--accent)' : 'transparent',
        color: selected ? '#0a0a0a' : (disabled ? 'var(--text3)' : 'var(--text2)'),
        fontFamily: 'var(--font-display)',
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'background 0.15s, color 0.15s, border 0.15s',
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
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

function AddDayModal({ existingDays = [], onConfirm, onClose }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [customName, setCustomName] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [customTag, setCustomTag] = useState('');

  const usedNames = new Set(existingDays.map((d) => d.name.trim().toLowerCase()));

  function handleDayClick(day) {
    setSelectedDay(selectedDay === day ? null : day);
    setCustomName(''); // picking a pill clears the custom input
  }

  function handleCustomNameChange(e) {
    setCustomName(e.target.value);
    setSelectedDay(null); // typing a name deselects any pill
  }

  const finalName = customName.trim() || selectedDay || '';
  const finalIsRest = finalName.toLowerCase() === 'rest';
  const showTagSection = finalName.length > 0 && !finalIsRest;
  const canSubmit = finalName.length > 0;

  function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const tag = showTagSection ? (customTag.trim() || selectedTag || '') : '';
    onConfirm({ name: finalName, tag, isRest: finalIsRest });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-title">New Day</div>
        <form onSubmit={submit}>

          {/* Day picker */}
          <div style={LABEL}>Day</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
            {STANDARD_DAYS.map((day) => (
              <PickerPill
                key={day}
                label={DAY_SHORT[day]}
                selected={selectedDay === day}
                disabled={usedNames.has(day.toLowerCase())}
                onClick={() => handleDayClick(day)}
              />
            ))}
          </div>

          {/* Custom name override */}
          <div style={{ ...LABEL, marginBottom: 6 }}>
            Custom name{' '}
            <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — overrides selection)</span>
          </div>
          <input
            className="input"
            value={customName}
            onChange={handleCustomNameChange}
            placeholder="Upper A, Lower B…"
            style={{ marginBottom: 16 }}
          />

          {/* Tag picker — hidden for rest days */}
          {showTagSection && (
            <>
              <div style={LABEL}>Focus</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {TAG_OPTIONS.map((tag) => (
                  <PickerPill
                    key={tag}
                    label={tag}
                    selected={selectedTag === tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  />
                ))}
              </div>

              <div style={{ ...LABEL, marginBottom: 6 }}>
                Custom tag{' '}
                <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </div>
              <input
                className="input"
                value={customTag}
                onChange={(e) => { setCustomTag(e.target.value); if (e.target.value.trim()) setSelectedTag(null); }}
                placeholder="e.g. Chest + Shoulders"
                style={{ marginBottom: 4 }}
              />
            </>
          )}

          {finalIsRest && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, textAlign: 'center' }}>
              Rest days have no exercises or focus tags.
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={!canSubmit}>Add Day</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExerciseModal({ onConfirm, onClose }) {
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: [] });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleTarget(target) {
    set('muscleTargets',
      form.muscleTargets.includes(target)
        ? form.muscleTargets.filter((t) => t !== target)
        : [...form.muscleTargets, target]
    );
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onConfirm({ ...form, name: form.name.trim(), sets: +form.sets, reps: +form.reps, weight: +form.weight });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-title">New Exercise</div>
        <form onSubmit={submit}>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Exercise name" autoFocus style={{ marginBottom: 12 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            {['sets', 'reps', 'weight'].map((k) => (
              <div key={k}>
                <div style={{ ...LABEL, marginBottom: 4 }}>{k}</div>
                <input className="input" type="number" min="0" step={k === 'weight' ? '0.5' : '1'} value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <select className="select" style={{ width: '100%', marginBottom: 16 }} value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>

          {/* Muscle target picker */}
          <div style={LABEL}>
            Targets{' '}
            <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — select all that apply)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {MUSCLE_OPTIONS.map((target) => (
              <PickerPill
                key={target}
                label={target}
                selected={form.muscleTargets.includes(target)}
                onClick={() => toggleTarget(target)}
                small
              />
            ))}
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
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
    muscleTargets: ex.muscleTargets || [],
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleTarget(target) {
    set('muscleTargets',
      form.muscleTargets.includes(target)
        ? form.muscleTargets.filter((t) => t !== target)
        : [...form.muscleTargets, target]
    );
  }

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
          {['sets', 'reps', 'weight'].map((k) => (
            <div key={k}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
              <input className="input" type="number" min="0" step={k === 'weight' ? '0.5' : '1'} value={form[k]} onChange={(e) => set(k, e.target.value)} style={{ fontSize: 14, padding: '6px 8px' }} />
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

        {/* Muscle target picker in inline editor */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Targets (optional)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {MUSCLE_OPTIONS.map((target) => (
            <PickerPill
              key={target}
              label={target}
              selected={form.muscleTargets.includes(target)}
              onClick={() => toggleTarget(target)}
              small
            />
          ))}
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
      <div
        {...dragHandleProps}
        style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center', touchAction: 'none', padding: '2px 2px', paddingTop: 4 }}
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
        {ex.muscleTargets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
            {ex.muscleTargets.map((t) => <MusclePill key={t} target={t} />)}
          </div>
        )}
      </div>
      <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => setEditing(true)} title="Edit"><EditPencil /></button>
      <button className="btn-icon" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={() => onDelete(ex._id)} title="Delete"><TrashIcon /></button>
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
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--red)', color: '#fff', padding: '10px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 200,
          maxWidth: 320, textAlign: 'center',
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
        <TextModal title="Rename Day" initial={day.name} placeholder="Day name…" onConfirm={handleRenameSave} onClose={() => setModal(null)} />
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
  const [days, setDays] = useState(
    [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8))
  );
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
    setDays((prev) => [...prev, day].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8)));
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
                display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', marginBottom: 8,
                borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer',
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
        <AddDayModal existingDays={days} onConfirm={handleAddDay} onClose={() => setModal(null)} />
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

  function handleSplitUpdated() {
    // local state update handled inside SplitEditor; query syncs on next invalidation
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
                padding: '14px 16px', marginBottom: 8, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
