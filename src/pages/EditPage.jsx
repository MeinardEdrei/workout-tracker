import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { MusclePill, MUSCLE_COLORS, MUSCLE_GROUPS } from '../components/MusclePill';
import { capitalizeWords } from '../utils/textFormat';
import ExerciseThumbnail from '../components/ExerciseThumbnail';
import { isSyncExcluded, excludeFromSync } from '../utils/syncPrefs';
import { createPortal } from 'react-dom';
import * as api from '../api/index.js';
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
const TAG_OPTIONS = ['Chest + Back', 'Shoulders + Back', 'Legs + Core', 'Push', 'Pull', 'Full Body', 'Rest', 'Cardio', 'Upper Body', 'Lower Body', 'Upper A', 'Upper B', 'Lower A', 'Lower B'];
const MUSCLE_OPTIONS = Object.keys(MUSCLE_COLORS);

function MuscleTargetPicker({ selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {MUSCLE_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {group.muscles.map((target) => {
              const c = MUSCLE_COLORS[target] || { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' };
              const isSelected = selected.includes(target);
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => onToggle(target)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    border: `1px solid ${isSelected ? c.text : 'var(--border2)'}`,
                    background: isSelected ? c.bg : 'transparent',
                    color: isSelected ? c.text : 'var(--text3)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {target}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
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

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2"/>
      <polyline points="8,2 8,10"/><polyline points="5,5 8,2 11,5"/>
    </svg>
  );
}
function SearchImageIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/>
      <line x1="5" y1="6.5" x2="8" y2="6.5"/><line x1="6.5" y1="5" x2="6.5" y2="8"/>
    </svg>
  );
}
function XSmallIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/>
    </svg>
  );
}

/* ─── Toast notification ─── */
function Toast({ message, type = 'error' }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? 'var(--red)' : '#1e3a0f',
      color: '#fff', padding: '10px 16px', borderRadius: 8,
      fontSize: 13, fontWeight: 600, zIndex: 400, maxWidth: 300,
      textAlign: 'center', pointerEvents: 'none',
      animation: 'fadeIn 0.15s ease',
    }}>
      {message}
    </div>
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
  return createPortal(
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
    </div>,
    document.body
  );
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Delete?</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 4 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round((weight / 2.20462) * 10) / 10;
  }
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round((weight * 2.20462) * 10) / 10;
  }
  return weight;
}

function findMatchingExercise(name, splitDays, pastExercises) {
  if (!name) return null;
  const targetName = name.trim().toLowerCase();
  if (splitDays) {
    for (const d of splitDays) {
      const found = (d.exercises || []).find(e => e.name && e.name.trim().toLowerCase() === targetName);
      if (found) return found;
    }
  }
  if (pastExercises) {
    const found = pastExercises.find(e => e.name && e.name.trim().toLowerCase() === targetName);
    if (found) return found;
  }
  return null;
}

function WeightSyncModal({ 
  exName, 
  oldWeight, oldUnit, newWeight, newUnit, 
  oldSets, newSets, oldReps, newReps, oldUntilFailure, newUntilFailure, 
  oldMuscleTargets = [], newMuscleTargets = [],
  oldCategory, newCategory,
  otherDays, otherSplits = [], onSync, onSkip, onExclude
}) {
  const oldWInNewUnit = convertWeight(oldWeight ?? 0, oldUnit || 'kg', newUnit || 'kg');
  const delta = (newWeight ?? 0) - oldWInNewUnit;
  const weightChanged = Math.abs(delta) >= 0.01;
  const setsRepsChanged = (oldSets !== undefined && newSets !== undefined && oldSets !== newSets) ||
                          (oldReps !== undefined && newReps !== undefined && oldReps !== newReps) ||
                          (oldUntilFailure !== undefined && newUntilFailure !== undefined && oldUntilFailure !== newUntilFailure);

  const tagsChanged = oldMuscleTargets.length !== newMuscleTargets.length ||
                      !oldMuscleTargets.every(t => newMuscleTargets.includes(t)) ||
                      !newMuscleTargets.every(t => oldMuscleTargets.includes(t));

  const categoryChanged = oldCategory !== undefined && newCategory !== undefined && oldCategory !== newCategory;

  const isIncrease = delta > 0;
  const directionColor = isIncrease ? 'var(--green)' : '#f87171';
  const deltaFormatted = Math.abs(delta).toFixed(1).replace(/\.0$/, '');

  const oldRepsStr = (oldUntilFailure || oldReps === 0) ? 'Failure' : `${oldReps}`;
  const newRepsStr = (newUntilFailure || newReps === 0) ? 'Failure' : `${newReps}`;

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <div className="modal">
        <div className="modal-title" style={{ fontSize: 16 }}>Sync Exercise Changes?</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>{exName}</strong>
          
          {weightChanged && (
            <div style={{ marginTop: 4 }}>
              Weight:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{oldWeight}{oldUnit}</span>
              {' → '}
              <span style={{ fontFamily: 'var(--font-mono)', color: directionColor, fontWeight: 700 }}>{newWeight}{newUnit}</span>
              {' '}
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: isIncrease ? 'rgba(68,255,136,0.12)' : 'rgba(248,113,113,0.12)',
                color: directionColor, padding: '2px 6px', borderRadius: 4,
              }}>
                {isIncrease ? `+${deltaFormatted}${newUnit} increase` : `-${deltaFormatted}${newUnit} decrease`}
              </span>
            </div>
          )}

          {setsRepsChanged && (
            <div style={{ marginTop: 4 }}>
              Sets & Reps:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{oldSets}×{oldRepsStr}</span>
              {' → '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{newSets}×{newRepsStr}</span>
            </div>
          )}

          {tagsChanged && (
            <div style={{ marginTop: 4 }}>
              Targets:{' '}
              <span style={{ color: 'var(--text)' }}>{oldMuscleTargets.length > 0 ? oldMuscleTargets.join(', ') : 'None'}</span>
              {' → '}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{newMuscleTargets.length > 0 ? newMuscleTargets.join(', ') : 'None'}</span>
            </div>
          )}

          {categoryChanged && (
            <div style={{ marginTop: 4 }}>
              Category:{' '}
              <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{oldCategory}</span>
              {' → '}
              <span style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'capitalize' }}>{newCategory}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          This exercise also appears in{' '}
          <strong style={{ color: 'var(--text2)' }}>
            {otherDays.map((d) => d.dayName).join(', ')}
            {otherDays.length > 0 && otherSplits.length > 0 ? ', ' : ''}
            {otherSplits.map((d) => `${d.dayName} (${d.splitName})`).join(', ')}
          </strong>
          . Sync these changes there too?
        </div>
        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, color: 'var(--text3)' }}
            onClick={onExclude}
            title="Stop asking to sync this exercise in the future"
          >
            Never sync this exercise
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>Keep separate</button>
          <button
            className="btn btn-accent"
            onClick={onSync}
          >
            Sync to all days
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditDayModal({ initialName = '', initialTag = '', onConfirm, onClose }) {
  const [name, setName] = useState(initialName);
  const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS.includes(initialTag) ? initialTag : null);
  const [customTag, setCustomTag] = useState(TAG_OPTIONS.includes(initialTag) ? '' : initialTag);

  const showTagSection = name.trim().toLowerCase() !== 'rest';

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const finalTag = showTagSection ? (customTag.trim() || selectedTag || '') : '';
    onConfirm({ name: name.trim(), tag: finalTag });
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Edit Day</div>
        <form onSubmit={submit}>
          {/* Day Name */}
          <div style={LABEL}>Name</div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Day name…"
            style={{ marginBottom: 16 }}
            autoFocus
          />

          {/* Tag picker */}
          {showTagSection && (
            <>
              <div style={LABEL}>Focus / Tag</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {TAG_OPTIONS.map((tag) => (
                  <PickerPill
                    key={tag}
                    label={tag}
                    selected={selectedTag === tag}
                    onClick={() => {
                      setSelectedTag(selectedTag === tag ? null : tag);
                      setCustomTag('');
                    }}
                  />
                ))}
              </div>

              <div style={{ ...LABEL, marginBottom: 6 }}>
                Custom focus tag{' '}
                <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </div>
              <input
                className="input"
                value={customTag}
                onChange={(e) => {
                  setCustomTag(e.target.value);
                  setSelectedTag(null);
                }}
                placeholder="e.g. Quads & Calves"
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={!name.trim()}>Save</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
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
    </div>,
    document.body
  );
}

function AddExerciseModal({ splitDays, onConfirm, onClose }) {
  const { storage, storageKey } = useStorage();
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: [], untilFailure: false, imageUrl: '', placeholderUsed: false, category: 'workout', duration: 0, durationUnit: 'sec' });
  const [isDuration, setIsDuration] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  const pastExercises = useMemo(() => {
    const list = [];
    const seen = new Set();
    (logs || []).forEach((log) => {
      (log.exercises || []).forEach((ex) => {
        if (!ex.name) return;
        const lowerName = ex.name.trim().toLowerCase();
        if (!seen.has(lowerName)) {
          seen.add(lowerName);
          list.push({
            name: ex.name.trim(),
            imageUrl: ex.imageUrl || '',
            muscleTargets: ex.muscleTargets || [],
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            weightUnit: ex.weightUnit || 'kg',
            untilFailure: ex.untilFailure || false,
            category: ex.category || 'workout',
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit || 'sec',
            isCustom: true
          });
        }
      });
    });
    return list;
  }, [logs]);

  useEffect(() => {
    const q = form.name.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        const dbMatches = await api.suggestExercises(q);
        const combined = [...userMatches];
        dbMatches.forEach(db => {
          const dbName = typeof db === 'string' ? db : db.name;
          const dbImg = typeof db === 'string' ? null : db.imageUrl;
          if (!combined.some(c => c.name.toLowerCase() === dbName.toLowerCase())) {
            combined.push({
              name: dbName,
              imageUrl: dbImg,
              isCustom: false
            });
          }
        });
        setSuggestions(combined.slice(0, 10));
      } catch {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        setSuggestions(userMatches.slice(0, 10));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name, pastExercises]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSelectSuggestion(s) {
    const match = findMatchingExercise(s.name, splitDays, pastExercises);
    if (match) {
      setForm({
        name: s.name,
        sets: match.sets ?? 3,
        reps: match.reps ?? 10,
        weight: match.weight ?? 0,
        weightUnit: match.weightUnit || 'kg',
        muscleTargets: match.muscleTargets || [],
        untilFailure: !!match.untilFailure,
        imageUrl: match.imageUrl || s.imageUrl || '',
        placeholderUsed: match.placeholderUsed || false,
        category: match.category || 'workout',
        duration: match.duration ?? 0,
        durationUnit: match.durationUnit || 'sec',
      });
      setIsDuration(match.duration > 0);
    } else if (s.isCustom) {
      setForm({
        name: s.name,
        sets: s.sets,
        reps: s.reps ?? 10,
        weight: s.weight,
        weightUnit: s.weightUnit,
        muscleTargets: s.muscleTargets,
        untilFailure: s.untilFailure,
        imageUrl: s.imageUrl || '',
        placeholderUsed: s.placeholderUsed || false,
        category: s.category || 'workout',
        duration: s.duration ?? 0,
        durationUnit: s.durationUnit || 'sec',
      });
      setIsDuration(s.duration > 0);
    } else {
      setForm(f => ({ ...f, name: s.name, imageUrl: s.imageUrl || '', placeholderUsed: false }));
      setIsDuration(false);
    }
    setSuggestions([]);
  }

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
    const name = form.name.trim();
    const match = findMatchingExercise(name, splitDays, pastExercises);

    const finalMuscleTargets = (form.muscleTargets && form.muscleTargets.length > 0)
      ? form.muscleTargets
      : (match ? match.muscleTargets || [] : []);

    const finalWeight = (form.weight !== undefined && form.weight !== 0)
      ? +form.weight
      : (match ? match.weight ?? 0 : 0);

    const finalWeightUnit = form.weightUnit || (match ? match.weightUnit || 'kg' : 'kg');

    const numReps = +form.reps;
    const isFailure = form.untilFailure || numReps === 0;

    onConfirm({
      ...form,
      name,
      sets: +form.sets,
      reps: isDuration ? 0 : (isFailure ? 0 : numReps),
      untilFailure: isDuration ? false : isFailure,
      duration: isDuration ? (+form.duration || 60) : 0,
      durationUnit: isDuration ? (form.durationUnit || 'sec') : 'sec',
      weight: finalWeight,
      weightUnit: finalWeightUnit,
      muscleTargets: finalMuscleTargets,
      imageUrl: form.imageUrl || (match ? match.imageUrl || '' : ''),
    });
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Exercise</div>
        <form onSubmit={submit}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set('name', capitalizeWords(e.target.value))}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Exercise name"
              autoFocus
              autoComplete="off"
              style={{ width: '100%', margin: 0 }}
            />
            {suggestions.length > 0 && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'var(--bg2)', border: '1px solid var(--border)', 
                borderRadius: 8, zIndex: 150, overflow: 'hidden', marginTop: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    style={{ 
                      display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                      textAlign: 'left', padding: '8px 12px', fontSize: 13, 
                      background: 'none', border: 'none', color: 'var(--text)', 
                      cursor: 'pointer', borderBottom: '1px solid var(--border)' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <ExerciseThumbnail imageUrl={s.imageUrl} name={s.name} size={28} />
                    <span style={{ flex: 1, textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{s.name}</span>
                    {s.isCustom && (
                      <span style={{ 
                        fontSize: 8, fontWeight: 800, color: 'var(--accent)', 
                        background: 'rgba(232,255,90,0.08)', border: '1px solid rgba(232,255,90,0.2)',
                        padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        Your History
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <PickerPill label="Reps-based" selected={!isDuration} onClick={() => { setIsDuration(false); setForm(f => ({ ...f, duration: 0 })); }} small />
            <PickerPill label="Duration-based" selected={isDuration} onClick={() => { setIsDuration(true); setForm(f => ({ ...f, reps: 0, untilFailure: false })); }} small />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDuration ? '1fr 1.5fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>sets</div>
              <input className="input" type="number" min="0" step="1" value={form.sets} onChange={(e) => set('sets', e.target.value)} />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>{isDuration ? 'duration' : 'reps'}</div>
              {isDuration ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="input" style={{ flex: 1, minWidth: 0, margin: 0 }} type="number" min="1" step="1" value={form.duration || ''} onChange={(e) => set('duration', e.target.value)} />
                  <select className="select" style={{ padding: '0 8px', height: 44, borderRadius: 8, margin: 0 }} value={form.durationUnit || 'sec'} onChange={(e) => set('durationUnit', e.target.value)}>
                    <option value="sec">sec</option>
                    <option value="min">min</option>
                  </select>
                </div>
              ) : form.untilFailure ? (
                <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>TO FAILURE</div>
              ) : (
                <input className="input" type="number" min="0" step="1" value={form.reps} onChange={(e) => set('reps', e.target.value)} />
              )}
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>weight</div>
              <input className="input" type="number" min="0" step="0.5" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </div>
          </div>

          {!isDuration && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <PickerPill label="Specific reps" selected={!form.untilFailure} onClick={() => set('untilFailure', false)} small />
              <PickerPill label="Until failure" selected={form.untilFailure} onClick={() => set('untilFailure', true)} small />
            </div>
          )}

          <div style={{ ...LABEL, marginBottom: 4 }}>Category</div>
          <select className="select" style={{ width: '100%', marginBottom: 12 }} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="workout">Main Workout</option>
            <option value="warmup">Warm-up</option>
            <option value="cooldown">Cool Down</option>
          </select>

          <select className="select" style={{ width: '100%', marginBottom: 16 }} value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>

          {/* Muscle target picker */}
          <div style={{ ...LABEL, marginBottom: 10 }}>
            Targets{' '}
            <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </div>
          <MuscleTargetPicker selected={form.muscleTargets} onToggle={toggleTarget} />

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Add</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 5 15 8 12 11" />
      <path d="M3 8h12" />
      <polyline points="4 11 1 8 4 5" />
    </svg>
  );
}

function SwapExerciseModal({ splitDays, currentExName, onConfirm, onClose }) {
  const { storage, storageKey } = useStorage();
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: [], untilFailure: false, duration: 0, durationUnit: 'sec' });
  const [isDuration, setIsDuration] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  const pastExercises = useMemo(() => {
    const list = [];
    const seen = new Set();
    (logs || []).forEach((log) => {
      (log.exercises || []).forEach((ex) => {
        if (!ex.name) return;
        const lowerName = ex.name.trim().toLowerCase();
        if (!seen.has(lowerName)) {
          seen.add(lowerName);
          list.push({
            name: ex.name.trim(),
            imageUrl: ex.imageUrl || '',
            muscleTargets: ex.muscleTargets || [],
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            weightUnit: ex.weightUnit || 'kg',
            untilFailure: ex.untilFailure || false,
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit || 'sec',
            isCustom: true
          });
        }
      });
    });
    return list;
  }, [logs]);

  useEffect(() => {
    const q = form.name.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        const dbMatches = await api.suggestExercises(q);
        const combined = [...userMatches];
        dbMatches.forEach(db => {
          const dbName = typeof db === 'string' ? db : db.name;
          const dbImg = typeof db === 'string' ? null : db.imageUrl;
          if (!combined.some(c => c.name.toLowerCase() === dbName.toLowerCase())) {
            combined.push({
              name: dbName,
              imageUrl: dbImg,
              isCustom: false
            });
          }
        });
        setSuggestions(combined.slice(0, 10));
      } catch {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        setSuggestions(userMatches.slice(0, 10));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name, pastExercises]);

  function handleSelectSuggestion(s) {
    const match = findMatchingExercise(s.name, splitDays, pastExercises);
    if (match) {
      setForm({
        name: s.name,
        sets: match.sets ?? 3,
        reps: match.reps ?? 10,
        weight: match.weight ?? 0,
        weightUnit: match.weightUnit || 'kg',
        muscleTargets: match.muscleTargets || [],
        untilFailure: !!match.untilFailure,
        imageUrl: match.imageUrl || s.imageUrl || '',
        placeholderUsed: match.placeholderUsed || false,
        duration: match.duration ?? 0,
        durationUnit: match.durationUnit || 'sec',
      });
      setIsDuration(match.duration > 0);
    } else if (s.isCustom) {
      setForm({
        name: s.name,
        sets: s.sets,
        reps: s.reps ?? 10,
        weight: s.weight,
        weightUnit: s.weightUnit,
        muscleTargets: s.muscleTargets,
        untilFailure: s.untilFailure,
        imageUrl: s.imageUrl || '',
        placeholderUsed: s.placeholderUsed || false,
        duration: s.duration ?? 0,
        durationUnit: s.durationUnit || 'sec',
      });
      setIsDuration(s.duration > 0);
    } else {
      setForm(f => ({ ...f, name: s.name, imageUrl: s.imageUrl || '', placeholderUsed: false }));
      setIsDuration(false);
    }
    setSuggestions([]);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const name = form.name.trim();
    const match = findMatchingExercise(name, splitDays, pastExercises);

    const finalMuscleTargets = (form.muscleTargets && form.muscleTargets.length > 0)
      ? form.muscleTargets
      : (match ? match.muscleTargets || [] : []);

    const finalWeight = (form.weight !== undefined && form.weight !== 0)
      ? +form.weight
      : (match ? match.weight ?? 0 : 0);

    const finalWeightUnit = form.weightUnit || (match ? match.weightUnit || 'kg' : 'kg');

    const numReps = +form.reps;
    const isFailure = form.untilFailure || numReps === 0;

    onConfirm({
      ...form,
      name,
      sets: +form.sets,
      reps: isDuration ? 0 : (isFailure ? 0 : numReps),
      untilFailure: isDuration ? false : isFailure,
      duration: isDuration ? (+form.duration || 60) : 0,
      durationUnit: isDuration ? (form.durationUnit || 'sec') : 'sec',
      weight: finalWeight,
      weightUnit: finalWeightUnit,
      muscleTargets: finalMuscleTargets,
      imageUrl: form.imageUrl || (match ? match.imageUrl || '' : ''),
    });
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Swap Exercise</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
          Swapping: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{currentExName}</span>
        </div>
        <form onSubmit={submit}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: capitalizeWords(e.target.value) }))}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Search or enter new exercise name"
              autoFocus
              autoComplete="off"
              style={{ width: '100%', margin: 0 }}
            />
            {suggestions.length > 0 && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'var(--bg2)', border: '1px solid var(--border)', 
                borderRadius: 8, zIndex: 150, overflow: 'hidden', marginTop: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    style={{ 
                      display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                      textAlign: 'left', padding: '8px 12px', fontSize: 13, 
                      background: 'none', border: 'none', color: 'var(--text)', 
                      cursor: 'pointer', borderBottom: '1px solid var(--border)' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <ExerciseThumbnail imageUrl={s.imageUrl} name={s.name} size={28} />
                    <span style={{ flex: 1, textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{s.name}</span>
                    {s.isCustom && (
                      <span style={{ 
                        fontSize: 8, fontWeight: 800, color: 'var(--accent)', 
                        background: 'rgba(232,255,90,0.08)', border: '1px solid rgba(232,255,90,0.2)',
                        padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        Your History
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button type="button" className={`btn ${!isDuration ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(false); setForm(f => ({ ...f, duration: 0 })); }}>Reps-based</button>
            <button type="button" className={`btn ${isDuration ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(true); setForm(f => ({ ...f, reps: 0, untilFailure: false })); }}>Duration-based</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDuration ? '1fr 1.5fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>sets</div>
              <input className="input" type="number" min="0" step="1" value={form.sets} onChange={(e) => setForm(f => ({ ...f, sets: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{isDuration ? 'duration' : 'reps'}</div>
              {isDuration ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="input" style={{ flex: 1, minWidth: 0, margin: 0 }} type="number" min="1" step="1" value={form.duration || ''} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} />
                  <select className="select" style={{ padding: '0 8px', height: 44, borderRadius: 8, margin: 0 }} value={form.durationUnit || 'sec'} onChange={(e) => setForm(f => ({ ...f, durationUnit: e.target.value }))}>
                    <option value="sec">sec</option>
                    <option value="min">min</option>
                  </select>
                </div>
              ) : form.untilFailure ? (
                <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>TO FAILURE</div>
              ) : (
                <input className="input" type="number" min="0" step="1" value={form.reps} onChange={(e) => setForm(f => ({ ...f, reps: e.target.value }))} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>weight</div>
              <input className="input" type="number" min="0" step="0.5" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
          </div>

          {!isDuration && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button type="button" className={`btn ${!form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: false }))}>Specific reps</button>
              <button type="button" className={`btn ${form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: true }))}>Until failure</button>
            </div>
          )}

          <select className="select" style={{ width: '100%', marginBottom: 16 }} value={form.weightUnit} onChange={(e) => setForm(f => ({ ...f, weightUnit: e.target.value }))}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Swap</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ─── Edit Exercise Modal ─── */
function EditExerciseModal({ ex, splitId, dayId, splitDays, onConfirm, onClose, onUpdate }) {
  const { storage, storageKey } = useStorage();
  const [form, setForm] = useState({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps ?? 10,
    weight: ex.weight,
    weightUnit: ex.weightUnit,
    muscleTargets: ex.muscleTargets || [],
    untilFailure: ex.untilFailure || false,
    category: ex.category || 'workout',
    duration: ex.duration ?? 0,
    durationUnit: ex.durationUnit || 'sec',
  });
  const [isDuration, setIsDuration] = useState(ex.duration > 0);
  const [suggestions, setSuggestions] = useState([]);
  const [currentImageUrl, setCurrentImageUrl] = useState(ex.imageUrl || '');
  const [imgFetching, setImgFetching] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  const pastExercises = useMemo(() => {
    const list = [];
    const seen = new Set();
    (logs || []).forEach((log) => {
      (log.exercises || []).forEach((ex) => {
        if (!ex.name) return;
        const lowerName = ex.name.trim().toLowerCase();
        if (!seen.has(lowerName)) {
          seen.add(lowerName);
          list.push({
            name: ex.name.trim(),
            imageUrl: ex.imageUrl || '',
            muscleTargets: ex.muscleTargets || [],
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            weightUnit: ex.weightUnit || 'kg',
            untilFailure: ex.untilFailure || false,
            category: ex.category || 'workout',
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit || 'sec',
            isCustom: true
          });
        }
      });
    });
    return list;
  }, [logs]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function showToast(msg, type = 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleTarget(target) {
    set('muscleTargets',
      form.muscleTargets.includes(target)
        ? form.muscleTargets.filter((t) => t !== target)
        : [...form.muscleTargets, target]
    );
  }

  function handleSelectSuggestion(s) {
    const match = findMatchingExercise(s.name, splitDays, pastExercises);
    if (match) {
      setForm({
        name: s.name,
        sets: match.sets ?? 3,
        reps: match.reps ?? 10,
        weight: match.weight ?? 0,
        weightUnit: match.weightUnit || 'kg',
        muscleTargets: match.muscleTargets || [],
        untilFailure: !!match.untilFailure,
        category: match.category || 'workout',
        duration: match.duration ?? 0,
        durationUnit: match.durationUnit || 'sec',
      });
      setCurrentImageUrl(match.imageUrl || s.imageUrl || '');
      setIsDuration(match.duration > 0);
    } else if (s.isCustom) {
      setForm({
        name: s.name,
        sets: s.sets,
        reps: s.reps ?? 10,
        weight: s.weight,
        weightUnit: s.weightUnit,
        muscleTargets: s.muscleTargets,
        untilFailure: s.untilFailure,
        category: s.category || 'workout',
        duration: s.duration ?? 0,
        durationUnit: s.durationUnit || 'sec',
      });
      setCurrentImageUrl(s.imageUrl);
      setIsDuration(s.duration > 0);
    } else {
      setForm(f => ({ ...f, name: s.name, imageUrl: s.imageUrl || '', placeholderUsed: false }));
      setIsDuration(false);
    }
    setSuggestions([]);
  }

  useEffect(() => {
    const q = form.name.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        const dbMatches = await api.suggestExercises(q);
        const combined = [...userMatches];
        dbMatches.forEach(db => {
          const dbName = typeof db === 'string' ? db : db.name;
          const dbImg = typeof db === 'string' ? null : db.imageUrl;
          if (!combined.some(c => c.name.toLowerCase() === dbName.toLowerCase())) {
            combined.push({
              name: dbName,
              imageUrl: dbImg,
              isCustom: false
            });
          }
        });
        setSuggestions(combined.slice(0, 10));
      } catch {
        const userMatches = pastExercises.filter(e => 
          e.name.toLowerCase().includes(q.toLowerCase())
        );
        setSuggestions(userMatches.slice(0, 10));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.name, pastExercises]);

  useEffect(() => {
    if (!currentImageUrl && !ex.placeholderUsed && ex.name) {
      handleFetchImage();
    }
  }, []);

  async function handleFetchImage() {
    if (!form.name.trim()) return;
    setImgFetching(true);
    try {
      const result = await api.fetchExerciseImage(form.name.trim());
      if (result.success && result.imageUrl) {
        const updated = await storage.updateExercise(splitId, dayId, ex._id, {
          imageUrl: result.imageUrl, imageSource: 'auto', placeholderUsed: false,
        });
        setCurrentImageUrl(result.imageUrl);
        onUpdate(updated);
      } else {
        showToast('No image found for this exercise');
        await storage.updateExercise(splitId, dayId, ex._id, { placeholderUsed: true });
      }
    } catch {
      showToast('Could not fetch image');
    } finally {
      setImgFetching(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('JPG, PNG, or WebP only');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Max file size is 2MB');
      return;
    }

    setImgUploading(true);
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (imageData.length > 300000) {
        showToast('Image too large after encoding. Try a smaller image.');
        return;
      }

      const updated = await api.uploadExerciseImage(splitId, dayId, ex._id, imageData);
      setCurrentImageUrl(imageData);
      onUpdate(updated);
    } catch {
      showToast('Upload failed. Try again.');
    } finally {
      setImgUploading(false);
    }
  }

  async function handleClearImage() {
    try {
      const updated = await api.clearExerciseImage(splitId, dayId, ex._id);
      setCurrentImageUrl('');
      onUpdate(updated);
    } catch {
      showToast('Failed to remove image');
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const name = form.name.trim();
    const match = findMatchingExercise(name, splitDays, pastExercises);

    const finalMuscleTargets = (form.muscleTargets && form.muscleTargets.length > 0)
      ? form.muscleTargets
      : (match ? match.muscleTargets || [] : []);

    const finalWeight = (form.weight !== undefined && form.weight !== 0)
      ? +form.weight
      : (match ? match.weight ?? 0 : 0);

    const finalWeightUnit = form.weightUnit || (match ? match.weightUnit || 'kg' : 'kg');

    const numReps = +form.reps;
    const isFailure = form.untilFailure || numReps === 0;

    onConfirm({
      ...form,
      name,
      sets: +form.sets,
      reps: isDuration ? 0 : (isFailure ? 0 : numReps),
      untilFailure: isDuration ? false : isFailure,
      duration: isDuration ? (+form.duration || 60) : 0,
      durationUnit: isDuration ? (form.durationUnit || 'sec') : 'sec',
      weight: finalWeight,
      weightUnit: finalWeightUnit,
      muscleTargets: finalMuscleTargets,
    });
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Edit Exercise</div>
        <form onSubmit={submit}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ ...LABEL, marginBottom: 4 }}>Exercise Name</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: capitalizeWords(e.target.value) }))}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Exercise name"
              autoFocus
              autoComplete="off"
              style={{ width: '100%', margin: 0 }}
            />
            {suggestions.length > 0 && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'var(--bg2)', border: '1px solid var(--border)', 
                borderRadius: 8, zIndex: 150, overflow: 'hidden', marginTop: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                    style={{ 
                      display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                      textAlign: 'left', padding: '8px 12px', fontSize: 13, 
                      background: 'none', border: 'none', color: 'var(--text)', 
                      cursor: 'pointer', borderBottom: '1px solid var(--border)' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <ExerciseThumbnail imageUrl={s.imageUrl} name={s.name} size={28} />
                    <span style={{ flex: 1, textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{s.name}</span>
                    {s.isCustom && (
                      <span style={{ 
                        fontSize: 8, fontWeight: 800, color: 'var(--accent)', 
                        background: 'rgba(232,255,90,0.08)', border: '1px solid rgba(232,255,90,0.2)',
                        padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        Your History
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button type="button" className={`btn ${!isDuration ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(false); setForm(f => ({ ...f, duration: 0 })); }}>Reps-based</button>
            <button type="button" className={`btn ${isDuration ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(true); setForm(f => ({ ...f, reps: 0, untilFailure: false })); }}>Duration-based</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDuration ? '1fr 1.5fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>sets</div>
              <input className="input" type="number" min="0" step="1" value={form.sets} onChange={(e) => setForm(f => ({ ...f, sets: e.target.value }))} />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>{isDuration ? 'duration' : 'reps'}</div>
              {isDuration ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="input" style={{ flex: 1, minWidth: 0, margin: 0 }} type="number" min="1" step="1" value={form.duration || ''} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} />
                  <select className="select" style={{ padding: '0 8px', height: 44, borderRadius: 8, margin: 0 }} value={form.durationUnit || 'sec'} onChange={(e) => setForm(f => ({ ...f, durationUnit: e.target.value }))}>
                    <option value="sec">sec</option>
                    <option value="min">min</option>
                  </select>
                </div>
              ) : form.untilFailure ? (
                <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>TO FAILURE</div>
              ) : (
                <input className="input" type="number" min="0" step="1" value={form.reps} onChange={(e) => setForm(f => ({ ...f, reps: e.target.value }))} />
              )}
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 4 }}>weight</div>
              <input className="input" type="number" min="0" step="0.5" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
          </div>

          {!isDuration && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button type="button" className={`btn ${!form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: false }))}>Specific reps</button>
              <button type="button" className={`btn ${form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: true }))}>Until failure</button>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LABEL, marginBottom: 4 }}>Category</div>
            <select className="select" style={{ width: '100%', margin: 0 }} value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="workout">Main Workout</option>
              <option value="warmup">Warm-up</option>
              <option value="cooldown">Cool Down</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LABEL, marginBottom: 4 }}>Unit</div>
            <select className="select" style={{ width: '100%', margin: 0 }} value={form.weightUnit} onChange={(e) => setForm(f => ({ ...f, weightUnit: e.target.value }))}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LABEL, marginBottom: 4 }}>Targets (optional)</div>
            <MuscleTargetPicker selected={form.muscleTargets} onToggle={toggleTarget} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...LABEL, marginBottom: 8 }}>Exercise Image</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ExerciseThumbnail imageUrl={currentImageUrl} name={form.name} size={72} />
                {currentImageUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    title="Remove image"
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--red)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                    }}
                  >
                    <XSmallIcon />
                  </button>
                )}
                {(imgFetching || imgUploading) && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}
                  onClick={handleFetchImage}
                  disabled={imgFetching || imgUploading}
                >
                  <SearchImageIcon />
                  {imgFetching ? 'Searching…' : 'Fetch from library'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imgFetching || imgUploading}
                >
                  <UploadIcon />
                  {imgUploading ? 'Uploading…' : currentImageUrl ? 'Replace image' : 'Upload custom'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          {toast && <Toast message={toast.msg} type={toast.type} />}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ─── Exercise edit row ─── */
function ExerciseEditRow({ ex, index, splitId, dayId, splitDays, onUpdate, onDelete, dragHandleProps }) {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [editing, setEditing] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(ex.imageUrl || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [syncPrompt, setSyncPrompt] = useState(null);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const swapMutation = useMutation({
    mutationFn: (updatedData) => storage.updateExercise(splitId, dayId, ex._id, updatedData),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      onUpdate(updated);
      setShowSwapModal(false);
    },
  });

  useEffect(() => {
    if (!currentImageUrl && !ex.placeholderUsed && ex.name) {
      api.fetchExerciseImage(ex.name).then(result => {
        if (result.success && result.imageUrl) {
          storage.updateExercise(splitId, dayId, ex._id, {
            imageUrl: result.imageUrl, imageSource: 'auto', placeholderUsed: false
          }).then(updated => {
            setCurrentImageUrl(result.imageUrl);
            onUpdate(updated);
          });
        } else {
          storage.updateExercise(splitId, dayId, ex._id, { placeholderUsed: true });
        }
      }).catch(() => {});
    }
  }, []);

  async function handleSave(updatedForm) {
    const oldWeight = ex.weight ?? 0;
    const newWeight = +updatedForm.weight;
    const oldUnit = ex.weightUnit || 'kg';
    const newUnit = updatedForm.weightUnit || 'kg';

    const oldSets = ex.sets ?? 3;
    const newSets = +updatedForm.sets;

    const numReps = +updatedForm.reps;
    const isFailure = updatedForm.untilFailure || numReps === 0;
    const oldReps = ex.reps ?? 10;
    const newReps = isFailure ? 0 : numReps;

    const oldUntilFailure = !!ex.untilFailure;
    const newUntilFailure = isFailure;

    try {
      const updated = await storage.updateExercise(splitId, dayId, ex._id, {
        ...updatedForm,
        sets: newSets,
        reps: newReps,
        untilFailure: newUntilFailure,
        weight: newWeight,
      });
      onUpdate(updated);
      setEditing(false);

      const oldWConverted = convertWeight(oldWeight, oldUnit, newUnit);
      const weightChanged = Math.abs(newWeight - oldWConverted) >= 0.01;
      const setsChanged = newSets !== oldSets;
      const repsChanged = newReps !== oldReps || newUntilFailure !== oldUntilFailure;

      const oldMuscleTargets = ex.muscleTargets || [];
      const newMuscleTargets = updatedForm.muscleTargets || [];
      const tagsChanged = oldMuscleTargets.length !== newMuscleTargets.length ||
        !oldMuscleTargets.every((t) => newMuscleTargets.includes(t)) ||
        !newMuscleTargets.every((t) => oldMuscleTargets.includes(t));

      const oldCategory = ex.category || 'workout';
      const newCategory = updatedForm.category || 'workout';
      const categoryChanged = oldCategory !== newCategory;

      if ((weightChanged || setsChanged || repsChanged || tagsChanged || categoryChanged) && !isSyncExcluded(ex.name)) {
        const otherDays = (splitDays || [])
          .filter((d) => d._id !== dayId && !d.isRest)
          .flatMap((d) =>
            (d.exercises || [])
              .filter((e) => e.name.toLowerCase() === ex.name.toLowerCase())
              .map((e) => ({ dayName: d.name, dayId: d._id, exId: e._id }))
          );
        let otherSplits = [];
        try {
          otherSplits = await storage.getSyncMatches(ex.name, splitId);
        } catch (err) {
          console.error(err);
        }
        if (otherDays.length > 0 || otherSplits.length > 0) {
          setSyncPrompt({
            otherDays,
            otherSplits,
            oldWeight,
            oldUnit,
            newWeight,
            newUnit,
            oldSets,
            newSets,
            oldReps: oldUntilFailure ? 0 : oldReps,
            newReps: newUntilFailure ? 0 : newReps,
            oldUntilFailure,
            newUntilFailure,
            oldMuscleTargets,
            newMuscleTargets,
            oldCategory,
            newCategory,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSync() {
    if (!syncPrompt) return;
    const payload = {};
    if (syncPrompt.newWeight !== undefined) payload.weight = syncPrompt.newWeight;
    if (syncPrompt.newUnit !== undefined) payload.weightUnit = syncPrompt.newUnit;
    if (syncPrompt.newSets !== undefined) payload.sets = syncPrompt.newSets;
    if (syncPrompt.newReps !== undefined) payload.reps = syncPrompt.newReps;
    if (syncPrompt.newUntilFailure !== undefined) payload.untilFailure = syncPrompt.newUntilFailure;
    if (syncPrompt.newMuscleTargets !== undefined) payload.muscleTargets = syncPrompt.newMuscleTargets;
    if (syncPrompt.newCategory !== undefined) payload.category = syncPrompt.newCategory;

    for (const { dayId: dId, exId } of syncPrompt.otherDays) {
      await storage.updateExercise(splitId, dId, exId, payload);
    }
    for (const { splitId: sId, dayId: dId, exId } of (syncPrompt.otherSplits || [])) {
      await storage.updateExercise(sId, dId, exId, payload);
    }
    queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
    setSyncPrompt(null);
  }

  const weightLabel = ex.weight > 0 ? ` · ${ex.weight}${ex.weightUnit}` : '';
  const repsLabel = ex.duration > 0
    ? `${ex.duration}${ex.durationUnit || 'sec'}`
    : ((ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Until Failure' : `${ex.reps} reps`);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
      <div
        {...dragHandleProps}
        style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center', touchAction: 'none', padding: '2px 2px' }}
        title="Drag to reorder"
      >
        <GripIcon />
      </div>
      <ExerciseThumbnail imageUrl={currentImageUrl || ex.imageUrl} name={ex.name} size={48} />
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
      <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => setShowSwapModal(true)} title="Switch/Swap"><SwapIcon /></button>
      <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => setEditing(true)} title="Edit"><EditPencil /></button>
      <button className="btn-icon" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={() => setDeleteConfirm(true)} title="Delete"><TrashIcon /></button>
      
      {editing && (
        <EditExerciseModal
          ex={ex}
          splitId={splitId}
          dayId={dayId}
          splitDays={splitDays}
          onConfirm={handleSave}
          onClose={() => setEditing(false)}
          onUpdate={(updated) => {
            setCurrentImageUrl(updated.imageUrl || '');
            onUpdate(updated);
          }}
        />
      )}

      {syncPrompt && (
        <WeightSyncModal
          exName={ex.name}
          oldWeight={syncPrompt.oldWeight}
          oldUnit={syncPrompt.oldUnit}
          newWeight={syncPrompt.newWeight}
          newUnit={syncPrompt.newUnit}
          oldSets={syncPrompt.oldSets}
          newSets={syncPrompt.newSets}
          oldReps={syncPrompt.oldReps}
          newReps={syncPrompt.newReps}
          oldUntilFailure={syncPrompt.oldUntilFailure}
          newUntilFailure={syncPrompt.newUntilFailure}
          oldMuscleTargets={syncPrompt.oldMuscleTargets}
          newMuscleTargets={syncPrompt.newMuscleTargets}
          oldCategory={syncPrompt.oldCategory}
          newCategory={syncPrompt.newCategory}
          otherDays={syncPrompt.otherDays}
          otherSplits={syncPrompt.otherSplits}
          onSync={handleSync}
          onSkip={() => setSyncPrompt(null)}
          onExclude={() => { excludeFromSync(ex.name); setSyncPrompt(null); }}
        />
      )}
      {showSwapModal && (
        <SwapExerciseModal
          splitDays={splitDays}
          currentExName={ex.name}
          onConfirm={(updatedData) => swapMutation.mutate(updatedData)}
          onClose={() => setShowSwapModal(false)}
        />
      )}
      {deleteConfirm && (
        <ConfirmModal
          message={`Delete "${ex.name}"?`}
          onConfirm={() => { setDeleteConfirm(false); onDelete(ex._id); }}
          onClose={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

/* ─── Sortable wrapper for exercise row ─── */
function SortableExerciseEditRow({ ex, index, splitId, dayId, splitDays, onUpdate, onDelete }) {
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
        splitDays={splitDays}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function CategoryHeader({ type }) {
  const config = {
    warmup: {
      label: 'Warm-up',
      subtitle: 'Dynamic prep & muscle activation',
      color: '#ff9f43',
      bgColor: 'rgba(255,159,67,0.06)',
      borderColor: 'rgba(255,159,67,0.15)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    workout: {
      label: 'Main Workout',
      subtitle: 'Primary strength & hypertrophy sets',
      color: 'var(--accent)',
      bgColor: 'rgba(232,255,90,0.04)',
      borderColor: 'rgba(232,255,90,0.12)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6.5 6.5 11 11M21 21l-3-3M3 3l3 3M18.5 5.5l3-3M5.5 18.5l-3 3M8.5 4.5l2-2M17.5 13.5l2-2M13.5 17.5l-2 2M4.5 8.5l-2 2" />
        </svg>
      )
    },
    cooldown: {
      label: 'Cool Down',
      subtitle: 'Stretching, mobility & recovery',
      color: 'var(--blue)',
      bgColor: 'rgba(90,240,255,0.04)',
      borderColor: 'rgba(90,240,255,0.12)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
          <path d="M12 2v10M12 12l-4 4M12 12h10M12 12v10" />
        </svg>
      )
    }
  };

  const current = config[type] || config.workout;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      padding: '10px 16px',
      background: current.bgColor,
      borderTop: `1px solid ${current.borderColor}`,
      borderBottom: `1px solid ${current.borderColor}`,
      marginTop: 18,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: current.color }}>
        {current.icon}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {current.label}
        </span>
      </div>
      <div style={{
        fontSize: 10,
        color: 'var(--text2)',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>
        {current.subtitle}
      </div>
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
  const [deleteToast, setDeleteToast] = useState(null);

  useEffect(() => {
    setExercises(day.exercises || []);
  }, [day]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEx = exercises.find((e) => e._id === active.id);
    const overEx = exercises.find((e) => e._id === over.id);
    if (!activeEx || !overEx) return;

    const activeCat = activeEx.category || 'workout';
    const overCat = overEx.category || 'workout';

    if (activeCat !== overCat) return;

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
    setDeleteToast('Exercise deleted. Restore it from Version History on the split menu.');
    setTimeout(() => setDeleteToast(null), 4000);
  }

  async function toggleRest() {
    const next = !isRest;
    setIsRest(next);
    const updated = await storage.updateDay(split._id, day._id, { isRest: next });
    onDayUpdated(updated);
    queryClient.invalidateQueries({ queryKey: ['splits'] });
  }

  async function handleEditDaySave({ name, tag }) {
    setModal(null);
    const updated = await storage.updateDay(split._id, day._id, { name, tag });
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
            <button className="btn-icon" onClick={() => setModal('rename')} title="Edit day"><EditPencil /></button>
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
      {deleteToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#1e3a0f', color: '#fff', padding: '10px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 200,
          maxWidth: 320, textAlign: 'center',
        }}>
          {deleteToast}
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
                {(() => {
                  const warmups = exercises.filter((e) => (e.category || 'workout') === 'warmup');
                  const workouts = exercises.filter((e) => (e.category || 'workout') === 'workout');
                  const cooldowns = exercises.filter((e) => (e.category || 'workout') === 'cooldown');

                  return (
                    <>
                      {warmups.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <CategoryHeader type="warmup" />
                          <SortableContext items={warmups.map((e) => e._id)} strategy={verticalListSortingStrategy}>
                            {warmups.map((ex) => (
                              <SortableExerciseEditRow
                                key={ex._id}
                                ex={ex}
                                index={exercises.indexOf(ex)}
                                splitId={split._id}
                                dayId={day._id}
                                splitDays={split.days}
                                onUpdate={handleUpdateExercise}
                                onDelete={handleDeleteExercise}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      )}

                      {workouts.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <CategoryHeader type="workout" />
                          <SortableContext items={workouts.map((e) => e._id)} strategy={verticalListSortingStrategy}>
                            {workouts.map((ex) => (
                              <SortableExerciseEditRow
                                key={ex._id}
                                ex={ex}
                                index={exercises.indexOf(ex)}
                                splitId={split._id}
                                dayId={day._id}
                                splitDays={split.days}
                                onUpdate={handleUpdateExercise}
                                onDelete={handleDeleteExercise}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      )}

                      {cooldowns.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <CategoryHeader type="cooldown" />
                          <SortableContext items={cooldowns.map((e) => e._id)} strategy={verticalListSortingStrategy}>
                            {cooldowns.map((ex) => (
                              <SortableExerciseEditRow
                                key={ex._id}
                                ex={ex}
                                index={exercises.indexOf(ex)}
                                splitId={split._id}
                                dayId={day._id}
                                splitDays={split.days}
                                onUpdate={handleUpdateExercise}
                                onDelete={handleDeleteExercise}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      )}
                    </>
                  );
                })()}
              </DndContext>
            )}
          </div>
        </>
      )}

      {modal === 'rename' && (
        <EditDayModal initialName={day.name} initialTag={day.tag} onConfirm={handleEditDaySave} onClose={() => setModal(null)} />
      )}
      {modal === 'addEx' && (
        <AddExerciseModal onConfirm={handleAddExercise} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ─── Split editor panel ─── */
function SplitEditorInner({ split, onBack, onSplitUpdated }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [days, setDays] = useState(
    [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8))
  );
  const [activeDayId, setActiveDayId] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleteToast, setDeleteToast] = useState(null);

  useEffect(() => {
    setDays([...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8)));
  }, [split]);

  const activeDay = days.find((d) => d._id === activeDayId);
  const splitWithCurrentDays = { ...split, days };

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
    setDeleteToast('Day deleted. Restore it from Version History on the split menu.');
    setTimeout(() => setDeleteToast(null), 4000);
  }

  if (activeDay) {
    return (
      <DayEditor
        day={activeDay}
        split={splitWithCurrentDays}
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

      {deleteToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#1e3a0f', color: '#fff', padding: '10px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 200,
          maxWidth: 320, textAlign: 'center',
        }}>
          {deleteToast}
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

/* ─── SplitEditor — exported for use by SplitsPage ─── */
export default function SplitEditor({ splitId, onBack }) {
  const { storage, storageKey } = useStorage();

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const split = splits.find((s) => s._id === splitId);

  function handleSplitUpdated() {
    // local state update handled inside SplitEditorInner; query syncs on next invalidation
  }

  if (isLoading) return <div className="spinner" />;
  if (!split) return <div className="empty-state">Split not found.</div>;

  return (
    <SplitEditorInner
      split={split}
      onBack={onBack}
      onSplitUpdated={handleSplitUpdated}
    />
  );
}
