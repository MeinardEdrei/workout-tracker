import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import * as api from '../api/index.js';
import DailyShareCard from '../components/DailyShareCard';
import { MusclePill } from '../components/MusclePill';
import ExerciseThumbnail from '../components/ExerciseThumbnail';
import { createPortal } from 'react-dom';
import AiChatBubble from '../components/AiChatBubble';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TODAY_DOW = new Date().getDay();
const TODAY_STR = new Date().toISOString().slice(0, 10);

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="2,7 6,11 12,3" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2"/>
      <polyline points="8,1 8,10"/><polyline points="5,4 8,1 11,4"/>
    </svg>
  );
}

async function captureAndShare(ref, filename, title) {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(ref.current, { backgroundColor: '#0a0a0a', scale: 2, useCORS: true, logging: false });
  canvas.toBlob(async (blob) => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

function CompletionScreen({ log, onClose, onShare, sharing }) {
  const vol = log.totalVolume > 0
    ? log.totalVolume >= 1000 ? `${(log.totalVolume / 1000).toFixed(1)}k kg` : `${log.totalVolume} kg`
    : null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300, animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 40px', animation: 'slideUp 0.25s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💪</div>
          <div style={{ fontSize: 26, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--accent)' }}>Workout Done!</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>{log.dayName}{log.dayTag ? ` · ${log.dayTag}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Exercises</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{log.exercises.length}</div>
          </div>
          {vol && (
            <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{vol}</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-accent" style={{ flex: 1, gap: 8 }} onClick={onShare} disabled={sharing}>
            <ShareIcon />{sharing ? 'Sharing…' : 'Share Card'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Local AI Markdown Parser ─── */
function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--accent)', fontWeight: 700 }}>{part}</strong> : part);
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const cleanLine = line.trim();
    if (cleanLine.startsWith('###')) {
      return <h4 key={i} style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginTop: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{cleanLine.replace('###', '').trim()}</h4>;
    }
    if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, margin: '3px 0', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
          <span>{parseBold(cleanLine.substring(1).trim())}</span>
        </div>
      );
    }
    if (cleanLine.length === 0) return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ fontSize: 13, color: 'var(--text2)', margin: '3px 0', lineHeight: 1.4 }}>{parseBold(cleanLine)}</p>;
  });
}

/* ─── Heuristic Rule-Based local Analysis Engine ─── */
function generateOnDeviceCritique(log, allLogs) {
  const exercises = log.exercises || [];
  const numEx = exercises.length;
  const totalVolume = log.totalVolume || 0;
  
  // Find past logs for this split/day
  const pastLogs = (allLogs || []).filter(l => l._id !== log._id && l.date < log.date);
  
  let primaryFocus = "general fitness";
  const lowerName = log.dayName ? log.dayName.toLowerCase() : log.name.toLowerCase();
  const lowerTag = log.dayTag ? log.dayTag.toLowerCase() : (log.tag ? log.tag.toLowerCase() : '');
  if (lowerName.includes("push") || lowerTag.includes("chest") || lowerTag.includes("push")) {
    primaryFocus = "push muscles (chest, shoulders, triceps)";
  } else if (lowerName.includes("pull") || lowerTag.includes("back") || lowerTag.includes("pull")) {
    primaryFocus = "pull muscles (back, biceps)";
  } else if (lowerName.includes("leg") || lowerTag.includes("quads") || lowerTag.includes("legs") || lowerTag.includes("lower")) {
    primaryFocus = "legs (quadriceps, hamstrings, calves)";
  } else if (lowerName.includes("upper") || lowerTag.includes("upper")) {
    primaryFocus = "upper body";
  }

  const progressionTips = [];
  exercises.forEach(ex => {
    let prevEx = null;
    for (const pastLog of pastLogs) {
      const found = pastLog.exercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
      if (found) {
        prevEx = found;
        break;
      }
    }
    
    if (prevEx) {
      const currentWeight = ex.weight || 0;
      const prevWeight = prevEx.weight || 0;
      const currentReps = ex.reps || 0;
      const prevReps = prevEx.reps || 0;
      const unit = ex.weightUnit || 'kg';
      
      if (currentWeight > prevWeight) {
        progressionTips.push(`🎉 **Progression on ${ex.name}:** Increased weight from **${prevWeight}${unit}** to **${currentWeight}${unit}**!`);
      } else if (currentWeight === prevWeight && currentReps > prevReps) {
        progressionTips.push(`📈 **Progression on ${ex.name}:** Reps increased from **${prevReps}** to **${currentReps}** at **${currentWeight}${unit}**!`);
      } else if (currentWeight < prevWeight) {
        progressionTips.push(`ℹ️ **De-load on ${ex.name}:** Lifted **${currentWeight}${unit}** (previously **${prevWeight}${unit}**).`);
      }
    }
  });

  const previousLog = pastLogs.find(l => (l.dayName || '').toLowerCase() === (log.dayName || log.name || '').toLowerCase());
  let volumeComparison = "";
  if (previousLog && previousLog.totalVolume) {
    const diff = totalVolume - previousLog.totalVolume;
    if (diff > 0) {
      volumeComparison = `This is an increase of **${diff} kg** (+${((diff / previousLog.totalVolume) * 100).toFixed(1)}%) in workload compared to your last session!`;
    } else if (diff < 0) {
      volumeComparison = `Workload decreased by **${Math.abs(diff)} kg** compared to last session. Focus on rest and nutrition to recharge.`;
    }
  }

  const tips = [];
  if (numEx < 3) {
    tips.push("Your volume is low today. Try adding 1-2 accessory movements to target minor muscle groups.");
  } else if (numEx > 6) {
    tips.push("High exercise count! Verify that your intensity is high throughout. Reduce to 4-5 movements if you hit a wall early.");
  } else {
    tips.push("Excellent exercise selection! Keeping it to 3-6 exercises ensures optimal energy distribution.");
  }

  return `### Workout Workload
You trained **${primaryFocus}** doing **${numEx} exercises**${totalVolume > 0 ? ` with a total volume of **${totalVolume} kg**` : ''}. ${volumeComparison}

### Progression Highlights
${progressionTips.length > 0 ? progressionTips.map(tip => `- ${tip}`).join('\n') : '- No historical data found for these exercises yet. Keep logging to track your progression!'}

### Coach Tips
- ${tips[0]}
- Prioritize dynamic recovery: drink plenty of water and target 7-8 hours of sleep tonight for optimal recovery.`;
}

/* ─── Local Chat Heuristics ─── */
function generateLocalCoachResponse(query, log, allLogs) {
  const q = query.toLowerCase();
  const exercises = log.exercises || [];
  const numEx = exercises.length;
  
  if (q.includes("too much") || q.includes("volume") || q.includes("heavy") || q.includes("excessive")) {
    if (numEx > 5) {
      return `### Split Volume Critique
Your split **${log.splitName || 'workout'}** has **${numEx} exercises** logged today. If you run this split 5-6 times a week, it borders on high volume.
- **Is it too much?** For most natural lifters, yes, if every single set is taken to absolute failure.
- **Recommendation:** Reduce to 4-5 high-quality compound movements and focus on lifting heavier with intense effort on fewer sets.
- **Tip:** Limit total working sets to 12-18 sets per workout to prevent central nervous system fatigue.`;
    } else {
      return `### Split Volume Critique
Your workout today is **${numEx} exercises**, which is a highly balanced volume!
- **Is it too much?** No, it falls right in the hypertrophy sweet spot (10-15 working sets total).
- **Recommendation:** Keep doing this volume. If you feel good, focus on adding weight or reps (progressive overload) rather than adding more exercises.`;
    }
  }
  
  if (q.includes("better") || q.includes("alternative") || q.includes("change") || q.includes("improve") || q.includes("optimize")) {
    const splitName = (log.splitName || '').toLowerCase();
    if (splitName.includes("ppl") || splitName.includes("push")) {
      return `### Better Alternatives for PPL
Push/Pull/Legs is one of the best splits, but it requires high commitment (6 days/week to hit muscles 2x).
- **Alternative:** If you can only train 3-4 days, switch to an **Upper/Lower** split.
- **How to improve:** Alternate focus weeks (e.g. week 1 heavy compound strength, week 2 high-rep hypertrophy).`;
    } else if (splitName.includes("upper") || splitName.includes("lower")) {
      return `### Better Alternatives for Upper/Lower
Your Upper/Lower split is highly scientific and efficient.
- **Alternative:** If you want to train 5-6 days, a **PPL** or **Arnold Split** might give you more fun/variety.
- **How to improve:** Run Upper A (chest focus), Upper B (shoulder focus) to ensure no muscle is neglected.`;
    } else {
      return `### How to Improve Your Split
For natural lifters, frequency is key. 
- **Better Alternative:** If you are running a single-muscle "Bro Split" (one muscle once a week), switching to a 4-day **Upper/Lower** or a 3/6-day **Push/Pull/Legs** is a better alternative.
- **Rule of Thumb:** Ensure you hit every muscle group at least **2 times per week** for optimal protein synthesis.`;
    }
  }
  
  if (q.includes("others") || q.includes("what do others") || q.includes("popular") || q.includes("routine")) {
    return `### What Other Lifters Do
For a split like yours, standard practice in the lifting community is:
- **Frequency:** Training 4 to 5 days a week, keeping sessions under 60 minutes.
- **Split Structure:**
  - **Upper/Lower:** Mon/Tue (Upper/Lower), Thu/Fri (Upper/Lower).
  - **PPL:** Push/Pull/Legs/Rest/Repeat.
- **Focus:** Committing to compound lifts first, and using isolation moves as "finishers" at the end of the session.`;
  }
  
  return `### Coach Tips
That's a good question! To give you a specific recommendation, what part of your recovery or exercise order are you trying to optimize?
- **Progression:** Focus on beating your log numbers (reps/weight) week-by-week.
- **Recovery:** Drink 3L of water and get 8 hours of sleep.
- Feel free to ask more specific questions about volume, alternatives, or training frequency!`;
}

function WeightSyncModal({ exName, oldWeight, newWeight, unit, otherDays, onSync, onSkip }) {
  const delta = newWeight - oldWeight;
  const isIncrease = delta > 0;
  const direction = isIncrease ? 'increase' : 'decrease';
  const directionColor = isIncrease ? 'var(--green)' : '#f87171';

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <div className="modal">
        <div className="modal-title" style={{ fontSize: 16 }}>Sync Weight Change?</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>{exName}</strong>
          {' '}changed from{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{oldWeight}{unit}</span>
          {' → '}
          <span style={{ fontFamily: 'var(--font-mono)', color: directionColor, fontWeight: 700 }}>{newWeight}{unit}</span>
          {' '}
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: isIncrease ? 'rgba(68,255,136,0.12)' : 'rgba(248,113,113,0.12)',
            color: directionColor, padding: '2px 6px', borderRadius: 4,
          }}>
            {isIncrease ? `+${delta}${unit} increase` : `${delta}${unit} decrease`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          This exercise also appears in{' '}
          <strong style={{ color: 'var(--text2)' }}>
            {otherDays.map((d) => d.dayName).join(', ')}
          </strong>
          . Sync the new weight there too?
        </div>
        <div className="modal-actions">
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

function ExerciseRow({ ex, index, splitId, dayId, splitDays, onToggle, readOnly, isCompleted }) {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightVal, setWeightVal] = useState(String(ex.weight ?? 0));
  const [weightUnit, setWeightUnit] = useState(ex.weightUnit || 'kg');
  const [syncPrompt, setSyncPrompt] = useState(null);
  const [editingSetsReps, setEditingSetsReps] = useState(false);
  const [setsVal, setSetsVal] = useState(String(ex.sets ?? 3));
  const [repsVal, setRepsVal] = useState(String(ex.reps ?? 0));
  const effectiveChecked = isCompleted ? true : (ex.lastCheckedDate === TODAY_STR ? ex.checked : false);

  const toggleMutation = useMutation({
    mutationFn: () => storage.toggleExercise(splitId, dayId, ex._id),
    onSuccess: (updated) => {
      onToggle(updated);
      queryClient.invalidateQueries({ queryKey: ['splits'] });
    },
  });

  const weightMutation = useMutation({
    mutationFn: ({ weight, unit }) => storage.updateExercise(splitId, dayId, ex._id, { weight: +weight, weightUnit: unit }),
    onSuccess: (_, { weight, unit }) => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setEditingWeight(false);

      const newW = +weight;
      const oldW = ex.weight ?? 0;
      if (newW === oldW) return;

      // Find other days that have the same exercise name
      const otherDays = (splitDays || [])
        .filter((d) => d._id !== dayId && !d.isRest)
        .flatMap((d) =>
          (d.exercises || [])
            .filter((e) => e.name.toLowerCase() === ex.name.toLowerCase())
            .map((e) => ({ dayName: d.name, dayId: d._id, exId: e._id }))
        );

      if (otherDays.length > 0) {
        setSyncPrompt({ otherDays, oldWeight: oldW, newWeight: newW, unit });
      }
    },
  });

  const setsRepsMutation = useMutation({
    mutationFn: ({ sets, reps }) => storage.updateExercise(splitId, dayId, ex._id, { sets: +sets, reps: +reps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setEditingSetsReps(false);
    },
  });

  async function handleSync() {
    if (!syncPrompt) return;
    for (const { dayId: dId, exId } of syncPrompt.otherDays) {
      await storage.updateExercise(splitId, dId, exId, { weight: syncPrompt.newWeight, weightUnit: syncPrompt.unit });
    }
    queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
    setSyncPrompt(null);
  }

  const repsLabel = ex.untilFailure ? '∞' : (ex.reps > 0 ? ex.reps : 'max');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderBottom: '1px solid var(--border)',
      opacity: (toggleMutation.isPending) ? 0.5 : 1,
      transition: 'opacity 0.15s',
      background: effectiveChecked ? 'rgba(255,255,255,0.01)' : 'transparent',
    }}>
      {/* Circular checkbox */}
      <div
        onClick={() => !readOnly && !toggleMutation.isPending && toggleMutation.mutate()}
        style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${effectiveChecked ? 'var(--accent)' : 'var(--border2)'}`,
          background: effectiveChecked ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: readOnly ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {effectiveChecked && <CheckIcon />}
      </div>

      {/* Thumbnail */}
      <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.name} size={48} />

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '0.02em', textTransform: 'uppercase',
          textDecoration: effectiveChecked ? 'line-through' : 'none',
          color: effectiveChecked ? 'var(--text3)' : 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ex.name}
        </div>
        {editingSetsReps ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <input
              type="number" min="1" max="99"
              value={setsVal}
              onChange={(e) => setSetsVal(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') setsRepsMutation.mutate({ sets: setsVal, reps: repsVal });
                if (e.key === 'Escape') { setEditingSetsReps(false); setSetsVal(String(ex.sets ?? 3)); setRepsVal(String(ex.reps ?? 0)); }
              }}
              style={{ width: 38, padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>×</span>
            <input
              type="number" min="0" max="999"
              value={repsVal}
              onChange={(e) => setRepsVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setsRepsMutation.mutate({ sets: setsVal, reps: repsVal });
                if (e.key === 'Escape') { setEditingSetsReps(false); setSetsVal(String(ex.sets ?? 3)); setRepsVal(String(ex.reps ?? 0)); }
              }}
              style={{ width: 38, padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none' }}
            />
            <button onClick={() => setsRepsMutation.mutate({ sets: setsVal, reps: repsVal })} disabled={setsRepsMutation.isPending}
              style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#0a0a0a', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>✓</button>
            <button onClick={() => { setEditingSetsReps(false); setSetsVal(String(ex.sets ?? 3)); setRepsVal(String(ex.reps ?? 0)); }}
              style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <div
            onClick={() => !readOnly && !ex.untilFailure && setEditingSetsReps(true)}
            title={readOnly || ex.untilFailure ? '' : 'Tap to edit sets & reps'}
            style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2, cursor: (readOnly || ex.untilFailure) ? 'default' : 'pointer', display: 'inline-block' }}
          >
            {ex.sets} × {repsLabel}
          </div>
        )}
        {ex.muscleTargets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
            {ex.muscleTargets.slice(0, 3).map((t) => <MusclePill key={t} target={t} />)}
          </div>
        )}
      </div>

      {syncPrompt && (
        <WeightSyncModal
          exName={ex.name}
          oldWeight={syncPrompt.oldWeight}
          newWeight={syncPrompt.newWeight}
          unit={syncPrompt.unit}
          otherDays={syncPrompt.otherDays}
          onSync={handleSync}
          onSkip={() => setSyncPrompt(null)}
        />
      )}

      {/* Weight — tappable to edit */}
      {editingWeight ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="number" min="0" step="0.5"
              value={weightVal}
              onChange={(e) => setWeightVal(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') weightMutation.mutate({ weight: weightVal, unit: weightUnit });
                if (e.key === 'Escape') { setEditingWeight(false); setWeightVal(String(ex.weight ?? 0)); }
              }}
              style={{
                width: 62, padding: '5px 8px', borderRadius: 6,
                border: '1.5px solid var(--accent)',
                background: 'var(--bg3)', color: 'var(--text)',
                fontSize: 14, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none',
              }}
            />
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              style={{
                padding: '5px 4px', borderRadius: 6, border: '1px solid var(--border2)',
                background: 'var(--bg3)', color: 'var(--text2)', fontSize: 11, outline: 'none',
              }}
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => weightMutation.mutate({ weight: weightVal, unit: weightUnit })}
              disabled={weightMutation.isPending}
              style={{ padding: '3px 12px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#0a0a0a', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}
            >✓</button>
            <button
              onClick={() => { setEditingWeight(false); setWeightVal(String(ex.weight ?? 0)); setWeightUnit(ex.weightUnit || 'kg'); }}
              style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >✕</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !readOnly && setEditingWeight(true)}
          title={readOnly ? '' : 'Tap to update weight'}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            cursor: readOnly ? 'default' : 'pointer', flexShrink: 0, minWidth: 44,
          }}
        >
          <div style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono)',
            color: ex.weight > 0 ? 'var(--accent)' : 'var(--text3)',
            letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            {ex.weight > 0 ? ex.weight : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            {ex.weight > 0 ? ex.weightUnit : (readOnly ? '' : 'tap')}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Gemini raw API call (returns full response JSON) ─── */
async function callGeminiRaw(apiKey, systemPrompt, contents, tools = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };
  if (tools.length > 0) body.tools = tools;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

function extractText(geminiResponse) {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join('').trim();
}

function extractFunctionCall(geminiResponse) {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];
  const fc = parts.find(p => p.functionCall);
  return fc ? fc.functionCall : null;
}

function historyToContents(chatHistory) {
  return chatHistory.map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: m.text.replace(/\*✨.*\*/g, '').trim() }],
  }));
}

/* ─── Legacy helper kept for handleAiCritique ─── */
async function callExternalGeminiApi(apiKey, systemPrompt, chatHistory, userText, useSearch = false) {
  const contents = historyToContents(chatHistory);
  contents.push({ role: 'user', parts: [{ text: userText.trim() }] });
  const tools = useSearch ? [{ google_search: {} }] : [];
  const data = await callGeminiRaw(apiKey, systemPrompt, contents, tools);
  const reply = extractText(data);
  if (!reply) throw new Error('Empty response from Gemini API.');
  return reply;
}

/* ─── Prompts ─── */
const FLEXIBLE_SYSTEM_PROMPT = `You are a smart, knowledgeable AI assistant and personal coach with Google Search access. You can answer anything — fitness, nutrition, sports science, general knowledge, current events, research, and more.

The user's full workout split and recent history are provided in context. Use that data to give highly specific, personalised advice. When the user asks you to change something in their split (sets, reps, weight, etc.), use the update_exercise tool — but only when explicitly asked to make a change. Always be conversational and thorough. Format with markdown bullet points where it helps.`;

const RESTRICTED_SYSTEM_PROMPT = `You are a professional gym coach. Provide helpful, encouraging, actionable recommendations in under 120 words using markdown bullet points. Keep responses focused on the workout.`;

/* ─── Function declarations exposed to Gemini ─── */
const SPLIT_FUNCTIONS = [{
  functionDeclarations: [{
    name: 'update_exercise',
    description: 'Update sets, reps, weight, or other properties of an exercise in the user\'s split. Only call this when the user explicitly asks to make a change.',
    parameters: {
      type: 'object',
      properties: {
        dayName: { type: 'string', description: 'Exact day name as in the split (e.g. "Monday", "Thursday", "Upper A")' },
        exerciseName: { type: 'string', description: 'Name of the exercise to update' },
        sets: { type: 'number', description: 'New number of sets' },
        reps: { type: 'number', description: 'New number of reps per set' },
        weight: { type: 'number', description: 'New weight value' },
        weightUnit: { type: 'string', enum: ['kg', 'lbs'] },
        untilFailure: { type: 'boolean', description: 'Set to true if reps should be until failure' },
      },
      required: ['dayName', 'exerciseName'],
    },
  }],
}];

/* ─── Build full split + log context string ─── */
function buildSplitContext(splitDays, logs, splitName) {
  const daysText = (splitDays || []).map(d => {
    if (d.isRest) return `  ${d.name}: Rest day`;
    const exLines = (d.exercises || []).map(e =>
      `    • ${e.name}: ${e.sets}×${e.untilFailure ? 'failure' : (e.reps ?? 'max')} reps${e.weight > 0 ? ` @ ${e.weight}${e.weightUnit}` : ''}`
    ).join('\n');
    return `  ${d.name}${d.tag ? ` (${d.tag})` : ''}:\n${exLines || '    (no exercises)'}`;
  }).join('\n');

  const recentText = [...(logs || [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(l => {
      const vol = l.totalVolume > 0 ? ` [${l.totalVolume}kg vol]` : '';
      const exStr = l.exercises.map(e => `${e.name}${e.weight > 0 ? ` @${e.weight}${e.weightUnit}` : ''}`).join(', ');
      return `  ${l.date} – ${l.dayName}${l.dayTag ? ` (${l.dayTag})` : ''}${vol}: ${exStr}`;
    }).join('\n');

  return `\n\n=== USER'S WORKOUT DATA ===
Active Split: ${splitName}

Full Split:
${daysText || '  (no days configured)'}

Recent Sessions (last 20):
${recentText || '  (no logs yet)'}
=== END WORKOUT DATA ===`;
}

/* ─── Permission modal for AI-requested changes ─── */
function ActionPermissionModal({ pendingAction, onAllow, onDeny }) {
  const { name, args } = pendingAction.functionCall;
  const changeLines = Object.entries(args)
    .filter(([k]) => k !== 'dayName' && k !== 'exerciseName')
    .map(([k, v]) => {
      const labels = { sets: 'Sets', reps: 'Reps', weight: 'Weight', weightUnit: 'Unit', untilFailure: 'Until failure' };
      return `${labels[k] || k} → ${v}`;
    });

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onDeny()}>
      <div className="modal">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
          ⚡ AI wants to make a change
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          {args.exerciseName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>on {args.dayName}</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {changeLines.length > 0 ? changeLines.map((l, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>{l}</div>
          )) : <div style={{ fontSize: 12, color: 'var(--text3)' }}>No specific changes detected</div>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.4 }}>
          Allow the AI to apply this change to your split?
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onDeny}>Deny</button>
          <button className="btn btn-accent" onClick={onAllow}>Allow</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DayCard({ day, splitId, splitDays, splitName, isToday, defaultOpen, dateStr, logForDate, logs }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);
  const [completedLog, setCompletedLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);


  useEffect(() => {
    setExercises(day.exercises || []);
  }, [day.exercises]);



  useEffect(() => {
    if (!open || logForDate) return;
    const needsImage = exercises.filter(e => !e.imageUrl && !e.placeholderUsed && e.name);
    if (!needsImage.length) return;
    (async () => {
      for (const ex of needsImage) {
        try {
          const result = await api.fetchExerciseImage(ex.name.trim());
          if (result.success && result.imageUrl) {
            await storage.updateExercise(splitId, day._id, ex._id, {
              imageUrl: result.imageUrl, imageSource: 'auto', placeholderUsed: false,
            });
            setExercises(prev => prev.map(e => e._id === ex._id ? { ...e, imageUrl: result.imageUrl } : e));
          } else {
            await storage.updateExercise(splitId, day._id, ex._id, { placeholderUsed: true });
          }
        } catch { /* silently skip */ }
      }
    })();
  }, [open]);

  function handleToggle(updated) {
    setExercises((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
  }

  const isCompleted = !!logForDate;
  const isPast = dateStr < TODAY_STR;
  const readOnly = isPast || isCompleted || !isToday;

  const displayExercises = isCompleted
    ? logForDate.exercises.map(logEx => {
        const defaultEx = (day.exercises || []).find(e => e.name.toLowerCase() === logEx.name.toLowerCase());
        return {
          ...logEx,
          _id: defaultEx?._id || logEx.name,
          imageUrl: defaultEx?.imageUrl,
          muscleTargets: defaultEx?.muscleTargets || [],
          checked: true,
          lastCheckedDate: dateStr
        };
      })
    : exercises;

  const checkedCount = isCompleted
    ? displayExercises.length
    : displayExercises.filter((e) => e.lastCheckedDate === TODAY_STR && e.checked).length;
  const total = isCompleted
    ? displayExercises.length
    : (day.exercises || []).length;

  const saveLogMutation = useMutation({
    mutationFn: (logData) => storage.saveLog(logData),
    onSuccess: (saved) => {
      setCompletedLog(saved);
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: (e) => alert('Failed to save workout: ' + e.message),
  });

  function handleFinish() {
    const done = exercises.filter((e) => e.lastCheckedDate === TODAY_STR && e.checked);
    saveLogMutation.mutate({ date: TODAY_STR, splitName, dayName: day.name, dayTag: day.tag || '', exercises: done.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, weightUnit: e.weightUnit })) });
  }

  async function handleShare() {
    setSharing(true);
    try { await captureAndShare(shareCardRef, `workout-${TODAY_STR}.png`, `${day.name} — Workout Complete`); }
    finally { setSharing(false); }
  }


  return (
    <>
      <div style={{ margin: '0 16px 12px', borderRadius: 10, border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, overflow: 'hidden', background: 'var(--bg2)' }}>
        <button
          onClick={() => !day.isRest && setOpen((o) => !o)}
          style={{ width: '100%', background: isToday ? 'rgba(232,255,90,0.04)' : 'transparent', border: 'none', cursor: day.isRest ? 'default' : 'pointer', padding: '16px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {isToday && (
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', background: 'var(--accent)', color: '#0a0a0a', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', display: 'inline-block', marginBottom: 6 }}>TODAY</div>
            )}
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1, color: isToday ? 'var(--accent)' : day.isRest ? 'var(--text3)' : 'var(--text)' }}>
              {day.name}
            </div>
            {day.tag && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 5, fontWeight: 500 }}>{day.tag}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {day.isRest ? (
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rest</span>
            ) : (
              <>
                {isCompleted ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(68,255,136,0.1)', padding: '4px 8px', borderRadius: 4 }}>✓ Done</span>
                ) : isPast ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 4 }}>Skipped</span>
                ) : total > 0 ? (
                  <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)', color: checkedCount === total ? 'var(--green)' : checkedCount > 0 ? 'var(--accent)' : 'var(--text3)' }}>
                    {checkedCount}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>/{total}</span>
                  </span>
                ) : null}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>
                  <polyline points="4,6 8,10 12,6" />
                </svg>
              </>
            )}
          </div>
        </button>

        {open && !day.isRest && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {displayExercises.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No exercises yet</div>
            ) : (
              displayExercises.map((ex, i) => (
                <ExerciseRow key={ex._id || i} ex={ex} index={i} splitId={splitId} dayId={day._id} splitDays={splitDays} onToggle={handleToggle} readOnly={readOnly} isCompleted={isCompleted} />
              ))
            )}
            {checkedCount > 0 && isToday && !isCompleted && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-accent" style={{ width: '100%', fontSize: 14, padding: '12px' }} onClick={handleFinish} disabled={saveLogMutation.isPending}>
                  {saveLogMutation.isPending ? 'Saving…' : `✓ Finish Workout (${checkedCount} done)`}
                </button>
              </div>
            )}
            
            {isCompleted && (
              <div style={{ 
                padding: '14px 16px', 
                borderTop: '1px solid var(--border)', 
                background: 'rgba(68,255,136,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                marginTop: 12
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workout Logged
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
                  This workout is locked. To modify it, delete its log in the Stats tab.
                </div>
              </div>
            )}
            
            {isPast && !isCompleted && (
              <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid var(--border)', 
                background: 'rgba(255,255,255,0.01)',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text3)',
                marginTop: 12
              }}>
                This day has passed. Exercises are in view-only mode.
              </div>
            )}
          </div>
        )}
      </div>

      {completedLog && <DailyShareCard log={completedLog} cardRef={shareCardRef} />}
      {completedLog && <CompletionScreen log={completedLog} onClose={() => setCompletedLog(null)} onShare={handleShare} sharing={sharing} />}
    </>
  );
}

export default function TodayPage() {
  const { storage, storageKey } = useStorage();
  const queryClient = useQueryClient();
  const { data: splits = [], isLoading, error } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  const activeSplit = splits.find((s) => s.isActive) || splits[0] || null;
  const days = activeSplit ? [...(activeSplit.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8)) : [];
  const dayNameMatch = DAY_NAMES[TODAY_DOW].toLowerCase();
  let todayIndex = days.findIndex((d) => d.name.toLowerCase().startsWith(dayNameMatch));
  if (todayIndex === -1) todayIndex = TODAY_DOW % days.length;

  function getDateForIndex(index) {
    const d = new Date();
    d.setDate(d.getDate() + (index - todayIndex));
    return d.toISOString().slice(0, 10);
  }

  useEffect(() => {
    if (isLoading || !activeSplit || days.length === 0) return;

    let logsInvalidated = false;
    days.forEach((day, i) => {
      if (day.isRest) return;
      const dateStr = getDateForIndex(i);
      if (dateStr >= TODAY_STR) return; // Only past days

      const logForDate = logs.find((l) => l.date === dateStr);
      if (logForDate) return; // Already completed

      const checkedExs = (day.exercises || []).filter(
        (e) => e.checked && e.lastCheckedDate === dateStr
      );

      if (checkedExs.length > 0) {
        storage.saveLog({
          date: dateStr,
          splitName: activeSplit.name,
          dayName: day.name,
          dayTag: day.tag || '',
          exercises: checkedExs.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            weightUnit: e.weightUnit
          }))
        }).then(() => {
          if (!logsInvalidated) {
            logsInvalidated = true;
            queryClient.invalidateQueries({ queryKey: ['logs'] });
          }
        }).catch(err => console.error("Auto-completion failed:", err));
      }
    });
  }, [splits, logs, isLoading, activeSplit, days, queryClient, storage]);

  // ── AI Coach state (lifted from DayCard) ─────────────────────────────────
  const todayDay = days[todayIndex] || null;
  const todayDateStr = todayDay ? (() => { const d = new Date(); return d.toISOString().slice(0, 10); })() : null;
  const todayLog = todayDay ? logs.find((l) => l.date === todayDateStr) : null;
  const aiCacheKey = todayLog ? todayLog._id : (todayDay ? todayDay._id : 'none');

  const [aiCritique, setAiCritique] = useState(() => localStorage.getItem('ai_critique_' + aiCacheKey) || '');
  const [aiChatHistory, setAiChatHistory] = useState(() => {
    const saved = localStorage.getItem('ai_chat_history_' + aiCacheKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoadingAi, setAiLoadingAi] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [aiShowSettings, setAiShowSettings] = useState(false);
  const [aiPendingAction, setAiPendingAction] = useState(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const aiMessagesEndRef = useRef(null);

  useEffect(() => {
    setAiCritique(localStorage.getItem('ai_critique_' + aiCacheKey) || '');
    const saved = localStorage.getItem('ai_chat_history_' + aiCacheKey);
    setAiChatHistory(saved ? JSON.parse(saved) : []);
  }, [aiCacheKey]);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatHistory, aiCritique, aiLoadingAi]);

  async function handleAiCritique() {
    if (!todayDay || !activeSplit) return;
    setAiLoadingAi(true);
    const targetExs = todayLog ? todayLog.exercises : (todayDay.exercises || []);
    const externalApiKey = localStorage.getItem('user_gemini_api_key');
    const splitContext = externalApiKey ? buildSplitContext(days, logs, activeSplit.name) : '';
    const critiquePrompt = externalApiKey
      ? `Analyze my ${todayLog ? 'completed' : 'planned'} workout session and give me a thorough, insightful critique. Reference my full split structure and history to give context-aware feedback. Mention progression, balance, and any research-backed tips.

Today's session — Day: ${todayDay.name}${todayDay.tag ? ` (${todayDay.tag})` : ''}
Exercises ${todayLog ? 'done' : 'planned'}:
${targetExs.map(e => `- ${e.name}: ${e.sets}×${e.reps || 'max'} reps${e.weight ? ` @ ${e.weight}${e.weightUnit}` : ''}`).join('\n')}`
      : `Analyze this ${todayLog ? 'completed' : 'planned'} workout. Keep it under 100 words with bullet points.

Split: ${activeSplit.name} | Day: ${todayDay.name}
Exercises: ${targetExs.map(e => `${e.name} ${e.sets}×${e.reps || 'max'}`).join(', ')}`;

    try {
      let result = '';
      if (externalApiKey) {
        result = await callExternalGeminiApi(externalApiKey, FLEXIBLE_SYSTEM_PROMPT + splitContext, [], critiquePrompt, true);
      } else if (window.ai) {
        let session = null;
        if (window.ai.languageModel) session = await window.ai.languageModel.create({ systemPrompt: RESTRICTED_SYSTEM_PROMPT });
        else if (window.ai.assistant) session = await window.ai.assistant.create();
        else if (window.ai.createTextSession) session = await window.ai.createTextSession();
        if (session) { result = await session.prompt(critiquePrompt); session.destroy?.(); }
      }
      if (result && result.trim()) {
        const tag = externalApiKey ? '\n\n*✨ Powered by Gemini + Google Search*' : '\n\n*✨ Powered by Gemini Nano (Offline)*';
        const withTag = result.trim() + tag;
        localStorage.setItem('ai_critique_' + aiCacheKey, withTag);
        setAiCritique(withTag);
      } else {
        const local = generateOnDeviceCritique(todayLog || { ...todayDay, date: todayDateStr, splitName: activeSplit.name }, logs) + '\n\n*✨ Powered by Local Analysis Engine*';
        localStorage.setItem('ai_critique_' + aiCacheKey, local);
        setAiCritique(local);
      }
    } catch {
      const local = generateOnDeviceCritique(todayLog || { ...todayDay, date: todayDateStr, splitName: activeSplit.name }, logs) + '\n\n*✨ Powered by Local Analysis Engine*';
      localStorage.setItem('ai_critique_' + aiCacheKey, local);
      setAiCritique(local);
    } finally {
      setAiLoadingAi(false);
    }
  }

  async function handleAiSendReply(textToSend) {
    const text = textToSend || aiInputText;
    if (!text.trim() || aiLoadingAi) return;
    const updatedHistory = [...aiChatHistory, { sender: 'user', text: text.trim() }];
    setAiChatHistory(updatedHistory);
    setAiInputText('');
    setAiLoadingAi(true);
    const externalApiKey = localStorage.getItem('user_gemini_api_key');
    const isLocalEngine = aiCritique.includes('Local Analysis Engine');
    try {
      let reply = '';
      if (externalApiKey) {
        const systemPrompt = FLEXIBLE_SYSTEM_PROMPT + buildSplitContext(days, logs, activeSplit.name);
        const contents = historyToContents(aiChatHistory);
        contents.push({ role: 'user', parts: [{ text: text.trim() }] });
        const data = await callGeminiRaw(externalApiKey, systemPrompt, contents, [...SPLIT_FUNCTIONS, { google_search: {} }]);
        const fc = extractFunctionCall(data);
        if (fc) {
          const modelParts = data.candidates?.[0]?.content?.parts || [];
          setAiPendingAction({ functionCall: fc, geminiContents: [...contents, { role: 'model', parts: modelParts }], updatedHistory, systemPrompt });
          setAiLoadingAi(false);
          return;
        }
        reply = extractText(data);
      } else if (window.ai && !isLocalEngine) {
        const targetExs = todayLog ? todayLog.exercises : (todayDay?.exercises || []);
        const promptText = `You are a gym coach. Answer concisely in under 120 words with bullet points.
Split: ${activeSplit.name} | Day: ${todayDay?.name} | Exercises: ${targetExs.map(e => e.name).join(', ')}
User: ${text.trim()}
Coach:`;
        let session = null;
        if (window.ai.languageModel) session = await window.ai.languageModel.create({ systemPrompt: RESTRICTED_SYSTEM_PROMPT });
        else if (window.ai.assistant) session = await window.ai.assistant.create();
        else if (window.ai.createTextSession) session = await window.ai.createTextSession();
        if (session) { reply = await session.prompt(promptText); session.destroy?.(); }
      }
      if (reply && reply.trim()) {
        const finalHistory = [...updatedHistory, { sender: 'coach', text: reply.trim() }];
        setAiChatHistory(finalHistory);
        localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
      } else {
        const local = generateLocalCoachResponse(text.trim(), todayLog || { ...todayDay, date: todayDateStr, splitName: activeSplit.name }, logs);
        const finalHistory = [...updatedHistory, { sender: 'coach', text: local }];
        setAiChatHistory(finalHistory);
        localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
      }
    } catch {
      const local = generateLocalCoachResponse(text.trim(), todayLog || { ...todayDay, date: todayDateStr, splitName: activeSplit.name }, logs);
      const finalHistory = [...updatedHistory, { sender: 'coach', text: local }];
      setAiChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
    } finally {
      setAiLoadingAi(false);
    }
  }

  async function handleAiActionApproved() {
    if (!aiPendingAction) return;
    const { functionCall, geminiContents, updatedHistory, systemPrompt } = aiPendingAction;
    setAiPendingAction(null);
    setAiLoadingAi(true);
    try {
      const targetDay = (days || []).find(d => d.name.toLowerCase() === functionCall.args.dayName?.toLowerCase() || d.name.toLowerCase().includes(functionCall.args.dayName?.toLowerCase()));
      if (!targetDay) throw new Error(`Day not found`);
      const targetEx = (targetDay.exercises || []).find(e => e.name.toLowerCase() === functionCall.args.exerciseName?.toLowerCase() || e.name.toLowerCase().includes(functionCall.args.exerciseName?.toLowerCase()));
      if (!targetEx) throw new Error(`Exercise not found`);
      const patch = {};
      const a = functionCall.args;
      if (a.sets !== undefined) patch.sets = +a.sets;
      if (a.reps !== undefined) patch.reps = +a.reps;
      if (a.weight !== undefined) patch.weight = +a.weight;
      if (a.weightUnit !== undefined) patch.weightUnit = a.weightUnit;
      if (a.untilFailure !== undefined) patch.untilFailure = a.untilFailure;
      await storage.updateExercise(activeSplit._id, targetDay._id, targetEx._id, patch);
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      const contentsWithResult = [...geminiContents, { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: `Updated ${a.exerciseName} on ${a.dayName}` } } }] }];
      const externalApiKey = localStorage.getItem('user_gemini_api_key');
      const data = await callGeminiRaw(externalApiKey, systemPrompt, contentsWithResult, [{ google_search: {} }]);
      const reply = extractText(data) || 'Done! The change has been applied.';
      const finalHistory = [...updatedHistory, { sender: 'coach', text: reply }];
      setAiChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
    } catch (err) {
      const finalHistory = [...updatedHistory, { sender: 'coach', text: `Sorry, could not apply that change: ${err.message}` }];
      setAiChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
    } finally {
      setAiLoadingAi(false);
    }
  }

  async function handleAiActionDenied() {
    if (!aiPendingAction) return;
    const { functionCall, geminiContents, updatedHistory, systemPrompt } = aiPendingAction;
    setAiPendingAction(null);
    setAiLoadingAi(true);
    try {
      const externalApiKey = localStorage.getItem('user_gemini_api_key');
      const contentsWithDenial = [...geminiContents, { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: 'User denied this change.' } } }] }];
      const data = await callGeminiRaw(externalApiKey, systemPrompt, contentsWithDenial, [{ google_search: {} }]);
      const reply = extractText(data) || 'Understood, no changes were made.';
      const finalHistory = [...updatedHistory, { sender: 'coach', text: reply }];
      setAiChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
    } catch {
      const finalHistory = [...updatedHistory, { sender: 'coach', text: 'Understood, no changes were made.' }];
      setAiChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + aiCacheKey, JSON.stringify(finalHistory));
    } finally {
      setAiLoadingAi(false);
    }
  }

  const aiMessages = aiCritique ? [{ sender: 'coach', text: aiCritique }, ...aiChatHistory] : [];
  const aiQuickReplies = aiApiKey ? [
    { label: 'How much protein today?', prompt: 'How much protein should I eat today?' },
    { label: 'Pre-workout foods?', prompt: 'Best pre-workout foods to eat?' },
    { label: 'Creatine?', prompt: 'How does creatine actually work?' },
    { label: 'Cardio on rest days?', prompt: 'Should I do cardio on rest days?' },
  ] : [
    { label: 'Too much volume?', prompt: 'Is this split too much volume?' },
    { label: 'Better split?', prompt: "What's a better split?" },
  ];

  if (isLoading) return <div className="spinner" />;
  if (error) return <div className="empty-state">Error: {error.message}</div>;

  if (!activeSplit) return (
    <div>
      <div className="page-header"><h1 className="page-title">Today</h1></div>
      <div className="empty-state">No active split.<br />Go to Splits tab to activate one.</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today</h1>
          <div className="page-subtitle">{DAY_NAMES[TODAY_DOW]}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{activeSplit.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            Active
          </div>
        </div>
      </div>
      <div style={{ paddingTop: 12 }}>
        {days.length === 0 ? (
          <div className="empty-state">This split has no days yet</div>
        ) : (
          days.map((day, i) => {
            const dateStr = getDateForIndex(i);
            const logForDate = logs.find((l) => l.date === dateStr);
            return (
              <DayCard
                key={day._id}
                day={day}
                splitId={activeSplit._id}
                splitDays={days}
                splitName={activeSplit.name}
                isToday={i === todayIndex}
                defaultOpen={i === todayIndex && !day.isRest}
                dateStr={dateStr}
                logForDate={logForDate}
                logs={logs}
              />
            );
          })
        )}
      </div>
      <AiChatBubble
        title="AI Coach"
        badge={aiApiKey ? 'Search Enabled' : undefined}
        messages={aiMessages}
        loadingAi={aiLoadingAi}
        inputText={aiInputText}
        onInputChange={setAiInputText}
        onSend={handleAiSendReply}
        onRestart={handleAiCritique}
        quickReplies={aiQuickReplies}
        apiKey={aiApiKey}
        onApiKeyChange={(val) => {
          setAiApiKey(val);
          if (val.trim()) localStorage.setItem('user_gemini_api_key', val.trim());
          else localStorage.removeItem('user_gemini_api_key');
        }}
        showSettings={aiShowSettings}
        onToggleSettings={() => setAiShowSettings((v) => !v)}
        messagesEndRef={aiMessagesEndRef}
        open={showAiChat}
        onToggle={() => setShowAiChat((v) => !v)}
        onInitialCritique={!aiCritique ? handleAiCritique : null}
      />
      {aiPendingAction && (
        <ActionPermissionModal
          pendingAction={aiPendingAction}
          onAllow={handleAiActionApproved}
          onDeny={handleAiActionDenied}
        />
      )}
    </div>
  );
}
