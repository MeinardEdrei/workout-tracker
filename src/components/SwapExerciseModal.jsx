import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { useBackClose } from '../hooks/useBackClose';
import ExerciseThumbnail from './ExerciseThumbnail';
import { findMatchingExercise, getLastExercisePerformance } from '../utils/exerciseHistory';
import { searchExerciseLibrary } from '../utils/exerciseLibrary';
import { workingSets } from '../utils/sets';
import { capitalizeWords, formatLastUsed } from '../utils/textFormat';

// Swap an exercise for another, picking from your history or the library.
// With todayOption, it can apply just to today's session instead of the plan;
// onConfirm(data, isPermanent).
export default function SwapExerciseModal({ splitDays, currentExName, onConfirm, onClose, todayOption = false }) {
  useBackClose(true, onClose);
  const { storage, storageKey } = useStorage();
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: [], untilFailure: false, duration: 0, durationUnit: 'sec', notes: '' });
  const [isDuration, setIsDuration] = useState(false);
  const [isPermanent, setIsPermanent] = useState(!todayOption);
  const [suggestions, setSuggestions] = useState([]);

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  const pastExercises = useMemo(() => {
    const list = [];
    const seen = new Set();
    const sortedLogs = [...(logs || [])].sort((a, b) => (b.date > a.date ? 1 : -1));
    sortedLogs.forEach((log) => {
      (log.exercises || []).forEach((ex) => {
        if (!ex.name) return;
        const lowerName = ex.name.trim().toLowerCase();
        if (!seen.has(lowerName)) {
          seen.add(lowerName);
          let resolvedWeight = ex.weight || 0;
          let resolvedReps = ex.reps || 10;
          if (ex.setLogs && ex.setLogs.length > 0) {
            const setsWithWeight = workingSets(ex.setLogs).filter((s) => s.weight > 0);
            if (setsWithWeight.length > 0) {
              resolvedWeight = setsWithWeight[setsWithWeight.length - 1].weight;
            }
            const setsWithReps = workingSets(ex.setLogs).filter((s) => s.reps > 0);
            if (setsWithReps.length > 0) {
              resolvedReps = setsWithReps[0].reps;
            }
          }
          list.push({
            name: ex.name.trim(),
            imageUrl: ex.imageUrl || '',
            muscleTargets: ex.muscleTargets || [],
            sets: ex.sets || 3,
            reps: resolvedReps,
            weight: resolvedWeight,
            weightUnit: ex.weightUnit || 'kg',
            untilFailure: ex.untilFailure || false,
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit || 'sec',
            notes: ex.notes || '',
            date: log.date || '',
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
        const dbMatches = await searchExerciseLibrary(q);
        const combined = [...userMatches];
        dbMatches.forEach(db => {
          const dbName = typeof db === 'string' ? db : db.name;
          const dbImg = typeof db === 'string' ? null : db.imageUrl;
          if (!combined.some(c => c.name.toLowerCase() === dbName.toLowerCase())) {
            combined.push({
              name: dbName,
              imageUrl: dbImg,
              muscleTargets: typeof db === 'string' ? [] : (db.muscleTargets || []),
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
    const perf = getLastExercisePerformance(s.name, logs, splitDays);
    const finalMuscleTargets = (match && match.muscleTargets && match.muscleTargets.length > 0)
      ? match.muscleTargets
      : (perf?.muscleTargets?.length ? perf.muscleTargets : (s.muscleTargets && s.muscleTargets.length > 0 ? s.muscleTargets : []));

    const resolvedWeight = (match && match.weight > 0)
      ? match.weight
      : (perf?.weight > 0 ? perf.weight : (s.weight > 0 ? s.weight : 0));
    const resolvedUnit = match?.weightUnit || perf?.weightUnit || s.weightUnit || 'kg';
    const resolvedReps = match?.reps ?? perf?.reps ?? s.reps ?? 10;
    const resolvedSets = match?.sets ?? perf?.sets ?? s.sets ?? 3;
    const resolvedDuration = match?.duration ?? perf?.duration ?? s.duration ?? 0;
    const resolvedDurationUnit = match?.durationUnit || perf?.durationUnit || s.durationUnit || 'sec';
    // Notes (seat height, grip…) belong to the exercise you're swapping to.
    const finalNotes = (match && match.notes !== undefined) ? match.notes : (perf?.notes || s.notes || '');

    if (match) {
      setForm({
        name: s.name,
        sets: resolvedSets,
        reps: resolvedReps,
        weight: resolvedWeight,
        weightUnit: resolvedUnit,
        muscleTargets: finalMuscleTargets,
        untilFailure: !!match.untilFailure,
        imageUrl: match.imageUrl || s.imageUrl || '',
        placeholderUsed: match.placeholderUsed || false,
        duration: resolvedDuration,
        durationUnit: resolvedDurationUnit,
        notes: finalNotes,
      });
      setIsDuration(resolvedDuration > 0);
    } else if (s.isCustom) {
      setForm({
        name: s.name,
        sets: resolvedSets,
        reps: resolvedReps,
        weight: resolvedWeight,
        weightUnit: resolvedUnit,
        muscleTargets: finalMuscleTargets,
        untilFailure: s.untilFailure,
        imageUrl: s.imageUrl || '',
        placeholderUsed: s.placeholderUsed || false,
        duration: resolvedDuration,
        durationUnit: resolvedDurationUnit,
        notes: finalNotes,
      });
      setIsDuration(resolvedDuration > 0);
    } else {
      setForm(f => ({
        ...f,
        name: s.name,
        sets: resolvedSets,
        reps: resolvedReps,
        weight: resolvedWeight,
        weightUnit: resolvedUnit,
        muscleTargets: finalMuscleTargets,
        imageUrl: s.imageUrl || perf?.imageUrl || '',
        placeholderUsed: false,
        duration: resolvedDuration,
        durationUnit: resolvedDurationUnit,
        notes: finalNotes,
      }));
      setIsDuration(resolvedDuration > 0);
    }
    setSuggestions([]);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const name = form.name.trim();
    const match = findMatchingExercise(name, splitDays, pastExercises);
    const perf = getLastExercisePerformance(name, logs, splitDays);

    const finalMuscleTargets = (form.muscleTargets && form.muscleTargets.length > 0)
      ? form.muscleTargets
      : (match ? match.muscleTargets || [] : (perf?.muscleTargets || []));

    const finalWeight = (form.weight !== undefined && +form.weight !== 0)
      ? +form.weight
      : (match && match.weight > 0 ? match.weight : (perf?.weight ?? 0));

    const finalWeightUnit = form.weightUnit || match?.weightUnit || perf?.weightUnit || 'kg';

    const numReps = (form.reps !== undefined && +form.reps !== 0)
      ? +form.reps
      : (match?.reps ?? perf?.reps ?? 10);
    const isFailure = form.untilFailure || numReps === 0;

    onConfirm({
      ...form,
      name,
      sets: +form.sets || 3,
      reps: isDuration ? 0 : (isFailure ? 0 : numReps),
      untilFailure: isDuration ? false : isFailure,
      duration: isDuration ? (+form.duration || 60) : 0,
      durationUnit: isDuration ? (form.durationUnit || 'sec') : 'sec',
      weight: finalWeight,
      weightUnit: finalWeightUnit,
      muscleTargets: finalMuscleTargets,
      imageUrl: form.imageUrl || match?.imageUrl || perf?.imageUrl || '',
      notes: form.notes || '',
    }, isPermanent);
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
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{s.name}</span>
                      {s.isCustom && formatLastUsed(s) && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>
                          Last: {formatLastUsed(s)}
                        </span>
                      )}
                    </span>
                    {s.isCustom && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: 'var(--accent)',
                        background: 'rgba(var(--accent-rgb), 0.08)', border: '1px solid rgba(var(--accent-rgb), 0.2)',
                        padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
                        flexShrink: 0
                      }}>
                        History
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button type="button" className={`btn ${!isDuration ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(false); setForm(f => ({ ...f, duration: 0 })); }}>Reps-based</button>
            <button type="button" className={`btn ${isDuration ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => { setIsDuration(true); setForm(f => ({ ...f, reps: 0, untilFailure: false })); }}>Duration-based</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isDuration ? '1fr 1.5fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>sets</div>
              <input className="input" type="number" inputMode="numeric" min="0" step="1" value={form.sets} onChange={(e) => setForm(f => ({ ...f, sets: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{isDuration ? 'duration' : 'reps'}</div>
              {isDuration ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="input" style={{ flex: 1, minWidth: 0, margin: 0 }} type="number" inputMode="numeric" min="1" step="1" value={form.duration || ''} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} />
                  <select className="select" style={{ padding: '0 8px', height: 44, borderRadius: 8, margin: 0 }} value={form.durationUnit || 'sec'} onChange={(e) => setForm(f => ({ ...f, durationUnit: e.target.value }))}>
                    <option value="sec">sec</option>
                    <option value="min">min</option>
                  </select>
                </div>
              ) : form.untilFailure ? (
                <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>TO FAILURE</div>
              ) : (
                <input className="input" type="number" inputMode="numeric" min="0" step="1" value={form.reps} onChange={(e) => setForm(f => ({ ...f, reps: e.target.value }))} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>weight</div>
              <input className="input" type="number" inputMode="decimal" min="0" step="0.5" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
          </div>

          {!isDuration && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button type="button" className={`btn ${!form.untilFailure ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: false }))}>Specific reps</button>
              <button type="button" className={`btn ${form.untilFailure ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: true }))}>Until failure</button>
            </div>
          )}

          <select className="select" style={{ width: '100%', marginBottom: 16 }} value={form.weightUnit} onChange={(e) => setForm(f => ({ ...f, weightUnit: e.target.value }))}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Note (optional)</div>
            <input className="input" value={form.notes || ''} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. seat 4, neutral grip..." style={{ width: '100%', margin: 0 }} />
          </div>

          {todayOption && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                <button type="button" className={`btn ${!isPermanent ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setIsPermanent(false)}>Just for today</button>
                <button type="button" className={`btn ${isPermanent ? 'btn-accent' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setIsPermanent(true)}>Change permanently</button>
              </div>
              {!isPermanent && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -10, marginBottom: 12 }}>
                  Only applies to today's session — {currentExName} stays in your plan for next time.
                </div>
              )}
            </>
          )}

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
