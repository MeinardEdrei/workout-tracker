import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import * as api from '../api/index.js';
import { capitalizeWords } from '../utils/textFormat';
import DailyShareCard from '../components/DailyShareCard';
import { MusclePill } from '../components/MusclePill';
import ExerciseThumbnail from '../components/ExerciseThumbnail';
import { createPortal } from 'react-dom';
import AiChatBubble from '../components/AiChatBubble';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TODAY_DOW = new Date().getDay();
const TODAY_STR = new Date().toISOString().slice(0, 10);

function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'kg' && toUnit === 'lbs') return weight * 2.20462;
  if (fromUnit === 'lbs' && toUnit === 'kg') return weight / 2.20462;
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

function getExercisePRs(logs, currentDateStr = '') {
  const prs = {};
  (logs || []).forEach((log) => {
    if (currentDateStr && log.date === currentDateStr) return;
    (log.exercises || []).forEach((ex) => {
      if (!ex.name || !ex.weight) return;
      const key = ex.name.trim().toLowerCase();
      const unit = ex.weightUnit || 'kg';
      const wKg = convertWeight(ex.weight, unit, 'kg');
      
      if (!prs[key] || wKg > prs[key].maxWeightKg) {
        prs[key] = {
          maxWeight: ex.weight,
          unit: unit,
          maxWeightKg: wKg,
          date: log.date,
        };
      }
    });
  });
  return prs;
}

function ExerciseHistoryModal({ exName, logs, onClose }) {
  const history = useMemo(() => {
    const key = (exName || '').trim().toLowerCase();
    const records = [];
    (logs || []).forEach((log) => {
      (log.exercises || []).forEach((e) => {
        if ((e.name || '').trim().toLowerCase() === key) {
          records.push({
            date: log.date,
            sets: e.sets || 0,
            reps: e.reps || 0,
            weight: e.weight || 0,
            weightUnit: e.weightUnit || 'kg',
            untilFailure: e.untilFailure,
            notes: e.notes || '',
            category: e.category,
          });
        }
      });
    });
    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [exName, logs]);

  const maxWKg = useMemo(() => {
    return history.reduce((max, r) => {
      const wKg = convertWeight(r.weight, r.weightUnit, 'kg');
      return wKg > max ? wKg : max;
    }, 0);
  }, [history]);

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="modal-title" style={{ fontSize: 17, margin: 0, textTransform: 'uppercase' }}>
            {exName} History
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {history.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
            No past workout logs recorded for this exercise yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
            {history.map((rec, idx) => {
              const wKg = convertWeight(rec.weight, rec.weightUnit, 'kg');
              const isPr = maxWKg > 0 && Math.abs(wKg - maxWKg) < 0.01;
              const rLabel = (rec.untilFailure || rec.reps === 0) ? 'Failure' : `${rec.reps}`;
              
              return (
                <div key={idx} style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isPr ? 'rgba(232, 255, 90, 0.04)' : 'var(--bg3)',
                  border: `1px solid ${isPr ? 'rgba(232, 255, 90, 0.2)' : 'var(--border2)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                      {rec.date}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                      {rec.sets} sets × {rLabel} {rec.weight > 0 ? `@ ${rec.weight}${rec.weightUnit}` : ''}
                    </div>
                    {rec.weight > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                        Est. 1RM: {Math.round(rec.weight * (1 + ((rec.untilFailure || rec.reps === 0 ? 10 : rec.reps) || 1) / 30) * 10) / 10}{rec.weightUnit}
                      </div>
                    )}
                    {rec.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', marginTop: 2 }}>
                        "{rec.notes}"
                      </div>
                    )}
                  </div>
                  {isPr && rec.weight > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: 'var(--accent)',
                      background: 'rgba(232, 255, 90, 0.12)', border: '1px solid rgba(232, 255, 90, 0.25)',
                      padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}>
                      🏆 Max
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

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

function WeightSyncModal({ 
  exName, 
  oldWeight, oldUnit, newWeight, newUnit, 
  oldSets, newSets, oldReps, newReps, oldUntilFailure, newUntilFailure, 
  oldMuscleTargets = [], newMuscleTargets = [],
  oldCategory, newCategory,
  otherDays, onSync, onSkip 
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
          </strong>
          . Sync these changes there too?
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

function ExerciseRow({ ex, index, splitId, dayId, splitDays, onToggle, readOnly, isCompleted, dateStr, logs, onShowToast }) {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightVal, setWeightVal] = useState(String(ex.weight ?? 0));
  const [weightUnit, setWeightUnit] = useState(ex.weightUnit || 'kg');
  const [syncPrompt, setSyncPrompt] = useState(null);
  const [editingSetsReps, setEditingSetsReps] = useState(false);
  const [setsVal, setSetsVal] = useState(String(ex.sets ?? 3));
  const [repsVal, setRepsVal] = useState(String(ex.reps ?? 0));
  const [durationVal, setDurationVal] = useState(String(ex.duration ?? 0));
  const [durationUnitVal, setDurationUnitVal] = useState(ex.durationUnit || 'sec');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(ex.notes || '');

  useEffect(() => {
    setWeightVal(String(ex.weight ?? 0));
    setWeightUnit(ex.weightUnit || 'kg');
    setSetsVal(String(ex.sets ?? 3));
    setRepsVal(String(ex.reps ?? 0));
    setDurationVal(String(ex.duration ?? 0));
    setDurationUnitVal(ex.durationUnit || 'sec');
    setNotesVal(ex.notes || '');
  }, [ex]);

  const notesMutation = useMutation({
    mutationFn: (notes) => storage.updateExercise(splitId, dayId, ex._id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setEditingNotes(false);
    },
  });

  const prInfo = useMemo(() => {
    const historicalPrs = getExercisePRs(logs, dateStr);
    const key = (ex.name || '').trim().toLowerCase();
    const prevPr = historicalPrs[key];
    if (!prevPr || !(ex.weight > 0)) return null;

    const currentWKg = convertWeight(ex.weight, ex.weightUnit || 'kg', 'kg');
    if (currentWKg > prevPr.maxWeightKg + 0.01) {
      const prevWInCurrentUnit = convertWeight(prevPr.maxWeightKg, 'kg', ex.weightUnit || 'kg');
      const diff = ex.weight - prevWInCurrentUnit;
      const diffFormatted = Math.abs(diff).toFixed(1).replace(/\.0$/, '');
      return {
        isPr: true,
        diff: diff > 0.01 ? `+${diffFormatted}${ex.weightUnit}` : null,
        prevWeight: prevPr.maxWeight,
        prevUnit: prevPr.unit,
      };
    }
    return null;
  }, [logs, dateStr, ex.name, ex.weight, ex.weightUnit]);

  const swapMutation = useMutation({
    mutationFn: (updatedData) => storage.updateExercise(splitId, dayId, ex._id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setShowSwapModal(false);
    },
  });
  const effectiveChecked = isCompleted ? true : (ex.lastCheckedDate === TODAY_STR ? ex.checked : false);

  const toggleMutation = useMutation({
    mutationFn: () => storage.toggleExercise(splitId, dayId, ex._id),
    onSuccess: (updated) => {
      onToggle(updated);
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      if (updated.checked && prInfo?.isPr && onShowToast) {
        onShowToast(`🏆 NEW PR! ${ex.name} @ ${ex.weight}${ex.weightUnit}`);
      }
    },
  });

  const weightMutation = useMutation({
    mutationFn: ({ weight, unit }) => storage.updateExercise(splitId, dayId, ex._id, { weight: +weight, weightUnit: unit }),
    onSuccess: (_, { weight, unit }) => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setEditingWeight(false);

      const newW = +weight;
      const oldW = ex.weight ?? 0;
      const newUnit = unit;
      const oldUnit = ex.weightUnit || 'kg';
      
      const oldWConverted = convertWeight(oldW, oldUnit, newUnit);
      if (Math.abs(newW - oldWConverted) < 0.01) return;

      // Find other days that have the same exercise name
      const otherDays = (splitDays || [])
        .filter((d) => d._id !== dayId && !d.isRest)
        .flatMap((d) =>
          (d.exercises || [])
            .filter((e) => e.name.toLowerCase() === ex.name.toLowerCase())
            .map((e) => ({ dayName: d.name, dayId: d._id, exId: e._id }))
        );

      if (otherDays.length > 0) {
        setSyncPrompt({ 
          otherDays, 
          oldWeight: oldW, 
          oldUnit: oldUnit,
          newWeight: newW, 
          newUnit: newUnit,
          oldSets: ex.sets ?? 3,
          newSets: ex.sets ?? 3,
          oldReps: ex.reps ?? 10,
          newReps: ex.reps ?? 10,
          oldUntilFailure: !!ex.untilFailure,
          newUntilFailure: !!ex.untilFailure,
        });
      }
    },
  });

  const setsRepsMutation = useMutation({
    mutationFn: ({ sets, reps, duration, durationUnit }) => {
      const payload = { sets: +sets };
      if (duration !== undefined) {
        payload.duration = +duration;
        payload.durationUnit = durationUnit || 'sec';
        payload.reps = 0;
        payload.untilFailure = false;
      } else {
        const numReps = +reps;
        payload.reps = numReps;
        payload.untilFailure = numReps === 0;
        payload.duration = 0;
      }
      return storage.updateExercise(splitId, dayId, ex._id, payload);
    },
    onSuccess: (_, { sets, reps, duration, durationUnit }) => {
      queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
      setEditingSetsReps(false);

      const newSets = +sets;
      const newReps = reps !== undefined ? +reps : 0;
      const newUntilFailure = reps !== undefined && newReps === 0;
      const newDuration = duration !== undefined ? +duration : 0;
      const newDurationUnit = durationUnit || 'sec';

      const oldSets = ex.sets ?? 3;
      const oldReps = ex.reps ?? 10;
      const oldUntilFailure = !!ex.untilFailure;
      const oldDuration = ex.duration ?? 0;
      const oldDurationUnit = ex.durationUnit || 'sec';

      const durationChanged = oldDuration !== newDuration || oldDurationUnit !== newDurationUnit;
      const repsChanged = newReps !== oldReps || newUntilFailure !== oldUntilFailure;

      if (newSets === oldSets && !repsChanged && !durationChanged) return;

      const otherDays = (splitDays || [])
        .filter((d) => d._id !== dayId && !d.isRest)
        .flatMap((d) =>
          (d.exercises || [])
            .filter((e) => e.name.toLowerCase() === ex.name.toLowerCase())
            .map((e) => ({ dayName: d.name, dayId: d._id, exId: e._id }))
        );

      if (otherDays.length > 0) {
        setSyncPrompt({
          otherDays,
          oldWeight: ex.weight ?? 0,
          oldUnit: ex.weightUnit || 'kg',
          newWeight: ex.weight ?? 0,
          newUnit: ex.weightUnit || 'kg',
          oldSets,
          newSets,
          oldReps: oldUntilFailure ? 0 : oldReps,
          newReps: newUntilFailure ? 0 : newReps,
          oldUntilFailure,
          newUntilFailure,
          oldDuration,
          newDuration,
          oldDurationUnit,
          newDurationUnit,
        });
      }
    },
  });

  async function handleSync() {
    if (!syncPrompt) return;
    const payload = {};
    if (syncPrompt.newWeight !== undefined) payload.weight = syncPrompt.newWeight;
    if (syncPrompt.newUnit !== undefined) payload.weightUnit = syncPrompt.newUnit;
    if (syncPrompt.newSets !== undefined) payload.sets = syncPrompt.newSets;
    if (syncPrompt.newReps !== undefined) payload.reps = syncPrompt.newReps;
    if (syncPrompt.newUntilFailure !== undefined) payload.untilFailure = syncPrompt.newUntilFailure;
    if (syncPrompt.newDuration !== undefined) payload.duration = syncPrompt.newDuration;
    if (syncPrompt.newDurationUnit !== undefined) payload.durationUnit = syncPrompt.newDurationUnit;

    for (const { dayId: dId, exId } of syncPrompt.otherDays) {
      await storage.updateExercise(splitId, dId, exId, payload);
    }
    queryClient.invalidateQueries({ queryKey: ['splits', storageKey] });
    setSyncPrompt(null);
  }

  const repsLabel = (ex.untilFailure || !ex.reps || ex.reps === 0) ? '∞' : ex.reps;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
          {prInfo && (
            <span
              style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                color: 'var(--accent)',
                background: 'rgba(232, 255, 90, 0.1)',
                border: '1px solid rgba(232, 255, 90, 0.25)',
                padding: '2px 7px', borderRadius: 10,
                display: 'inline-flex', alignItems: 'center', gap: 3,
                textTransform: 'uppercase',
              }}
              title={`Previous PR: ${prInfo.prevWeight}${prInfo.prevUnit}`}
            >
              🏆 PR {prInfo.diff ? `(${prInfo.diff})` : ''}
            </span>
          )}
        </div>
        {editingSetsReps ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <input
              type="number" min="1" max="99"
              value={setsVal}
              onChange={(e) => setSetsVal(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (ex.duration > 0) {
                    setsRepsMutation.mutate({ sets: setsVal, duration: durationVal, durationUnit: durationUnitVal });
                  } else {
                    setsRepsMutation.mutate({ sets: setsVal, reps: repsVal });
                  }
                }
                if (e.key === 'Escape') {
                  setEditingSetsReps(false);
                  setSetsVal(String(ex.sets ?? 3));
                  setRepsVal(String(ex.reps ?? 0));
                  setDurationVal(String(ex.duration ?? 0));
                  setDurationUnitVal(ex.durationUnit || 'sec');
                }
              }}
              style={{ width: 38, padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>×</span>
            {ex.duration > 0 ? (
              <>
                <input
                  type="number" min="1" max="999"
                  value={durationVal}
                  onChange={(e) => setDurationVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setsRepsMutation.mutate({ sets: setsVal, duration: durationVal, durationUnit: durationUnitVal });
                    }
                    if (e.key === 'Escape') {
                      setEditingSetsReps(false);
                      setSetsVal(String(ex.sets ?? 3));
                      setDurationVal(String(ex.duration ?? 0));
                      setDurationUnitVal(ex.durationUnit || 'sec');
                    }
                  }}
                  style={{ width: 44, padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none' }}
                />
                <select
                  value={durationUnitVal}
                  onChange={(e) => setDurationUnitVal(e.target.value)}
                  style={{ padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="sec">sec</option>
                  <option value="min">min</option>
                </select>
              </>
            ) : (
              <input
                type="number" min="0" max="999"
                value={repsVal}
                onChange={(e) => setRepsVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setsRepsMutation.mutate({ sets: setsVal, reps: repsVal });
                  if (e.key === 'Escape') {
                    setEditingSetsReps(false);
                    setSetsVal(String(ex.sets ?? 3));
                    setRepsVal(String(ex.reps ?? 0));
                  }
                }}
                style={{ width: 38, padding: '3px 5px', borderRadius: 5, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', outline: 'none' }}
              />
            )}
            <button
              onClick={() => {
                if (ex.duration > 0) {
                  setsRepsMutation.mutate({ sets: setsVal, duration: durationVal, durationUnit: durationUnitVal });
                } else {
                  setsRepsMutation.mutate({ sets: setsVal, reps: repsVal });
                }
              }}
              disabled={setsRepsMutation.isPending}
              style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#0a0a0a', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditingSetsReps(false);
                setSetsVal(String(ex.sets ?? 3));
                setRepsVal(String(ex.reps ?? 0));
                setDurationVal(String(ex.duration ?? 0));
                setDurationUnitVal(ex.durationUnit || 'sec');
              }}
              style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 2, flexWrap: 'wrap', gap: 4 }}>
            <div
              onClick={() => !readOnly && setEditingSetsReps(true)}
              title={readOnly ? '' : 'Tap to edit sets & reps/duration'}
              style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', cursor: readOnly ? 'default' : 'pointer', display: 'inline-block' }}
            >
              {ex.duration > 0 ? (
                <span>{ex.sets} × {ex.duration}{ex.durationUnit || 'sec'}</span>
              ) : (
                <span>{ex.sets} × {repsLabel}</span>
              )}
            </div>
            {!readOnly && (
              <>
                <button
                  onClick={() => setShowSwapModal(true)}
                  style={{
                    color: 'var(--text3)',
                    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    padding: '2px 5px', borderRadius: 4,
                    border: '1.5px solid var(--border2)', background: 'var(--bg3)',
                    display: 'inline-flex', alignItems: 'center', gap: 3
                  }}
                >
                  <SwapIcon /> Swap
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  style={{
                    color: 'var(--text3)',
                    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    padding: '2px 5px', borderRadius: 4,
                    border: '1.5px solid var(--border2)', background: 'var(--bg3)',
                    display: 'inline-flex', alignItems: 'center', gap: 3
                  }}
                  title="View exercise history"
                >
                  📊 History
                </button>
                <button
                  onClick={() => setEditingNotes(v => !v)}
                  style={{
                    color: ex.notes ? 'var(--accent)' : 'var(--text3)',
                    fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    padding: '2px 5px', borderRadius: 4,
                    border: ex.notes ? '1.5px solid rgba(232,255,90,0.3)' : '1.5px solid var(--border2)',
                    background: ex.notes ? 'rgba(232,255,90,0.06)' : 'var(--bg3)',
                    display: 'inline-flex', alignItems: 'center', gap: 3
                  }}
                  title="Add or edit notes"
                >
                  📝 Note
                </button>
              </>
            )}
          </div>
        )}
        {editingNotes ? (
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            <input
              type="text"
              placeholder="Add note (e.g. seat 4, slow eccentric)..."
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  notesMutation.mutate(notesVal);
                }
              }}
              style={{ flex: 1, padding: '3px 7px', fontSize: 11, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', outline: 'none' }}
            />
            <button onClick={() => notesMutation.mutate(notesVal)} style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--accent)', color: '#0a0a0a', fontWeight: 800, fontSize: 11, border: 'none', cursor: 'pointer' }}>✓</button>
          </div>
        ) : ex.notes ? (
          <div
            onClick={() => !readOnly && setEditingNotes(true)}
            style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', marginTop: 4, cursor: readOnly ? 'default' : 'pointer', background: 'rgba(255,255,255,0.02)', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)' }}
            title={readOnly ? '' : 'Tap to edit note'}
          >
            📝 "{ex.notes}"
          </div>
        ) : null}
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
          oldUnit={syncPrompt.oldUnit}
          newWeight={syncPrompt.newWeight}
          newUnit={syncPrompt.newUnit}
          oldSets={syncPrompt.oldSets}
          newSets={syncPrompt.newSets}
          oldReps={syncPrompt.oldReps}
          newReps={syncPrompt.newReps}
          oldUntilFailure={syncPrompt.oldUntilFailure}
          newUntilFailure={syncPrompt.newUntilFailure}
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
              onChange={(e) => {
                const nextUnit = e.target.value;
                const prevUnit = weightUnit;
                setWeightUnit(nextUnit);
                
                // Convert current input weight value if it's a valid number
                const num = parseFloat(weightVal);
                if (!isNaN(num) && num > 0) {
                  const converted = convertWeight(num, prevUnit, nextUnit);
                  // Round to 1 decimal place or nearest 0.5 for clean presentation
                  const rounded = Math.round(converted * 2) / 2;
                  setWeightVal(String(rounded));
                }
              }}
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

      {showHistoryModal && (
        <ExerciseHistoryModal
          exName={ex.name}
          logs={logs}
          onClose={() => setShowHistoryModal(false)}
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

/* ─── Generic Confirmation Modal ─── */
function ConfirmModal({ message, onConfirm, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Confirm</div>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={onConfirm}>Finish</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SwapIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 5 15 8 12 11" />
      <path d="M3 8h12" />
      <polyline points="4 11 1 8 4 5" />
    </svg>
  );
}

function SwapExerciseModal({ splitDays, currentExName, onConfirm, onClose }) {
  const { storage, storageKey } = useStorage();
  const [form, setForm] = useState({ name: '', sets: 3, reps: 10, weight: 0, weightUnit: 'kg', muscleTargets: [], untilFailure: false });
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
      });
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
      });
    } else {
      setForm(f => ({ ...f, name: s.name, imageUrl: s.imageUrl || '', placeholderUsed: false }));
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
      reps: isFailure ? 0 : numReps,
      untilFailure: isFailure,
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>sets</div>
              <input className="input" type="number" min="0" step="1" value={form.sets} onChange={(e) => setForm(f => ({ ...f, sets: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>reps</div>
              {form.untilFailure ? (
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

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button type="button" className={`btn ${!form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: false }))}>Specific reps</button>
            <button type="button" className={`btn ${form.untilFailure ? 'btn-accent' : ''}`} style={{ flex: 1, fontSize: 11, padding: '6px 0' }} onClick={() => setForm(f => ({ ...f, untilFailure: true }))}>Until failure</button>
          </div>

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

function DayCard({ day, splitId, splitDays, splitName, isToday, defaultOpen, dateStr, logForDate, logs, onShowToast }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);
  const [completedLog, setCompletedLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);


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
  const readOnly = (isPast && !isRetaking) || isCompleted || !isToday;

  const displayExercises = isCompleted
    ? logForDate.exercises.map(logEx => {
        const defaultEx = (day.exercises || []).find(e => e.name.toLowerCase() === logEx.name.toLowerCase());
        return {
          ...logEx,
          _id: defaultEx?._id || logEx.name,
          imageUrl: defaultEx?.imageUrl,
          muscleTargets: defaultEx?.muscleTargets || [],
          checked: true,
          lastCheckedDate: dateStr,
          category: logEx.category || defaultEx?.category || 'workout'
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
      setIsRetaking(false);
      setCompletedLog(saved);
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
    onError: (e) => alert('Failed to save workout: ' + e.message),
  });

  function handleFinish() {
    const done = exercises.filter((e) => e.lastCheckedDate === TODAY_STR && e.checked);
    saveLogMutation.mutate({
      date: dateStr, splitName, dayName: day.name, dayTag: day.tag || '',
      exercises: done.map((e) => ({
        name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, weightUnit: e.weightUnit,
        untilFailure: e.untilFailure, notes: e.notes || '', muscleTargets: e.muscleTargets || [],
        category: e.category || 'workout',
        duration: e.duration ?? 0,
        durationUnit: e.durationUnit || 'sec'
      }))
    });
    setShowConfirmFinish(false);
  }

  async function handleShare() {
    setSharing(true);
    try { await captureAndShare(shareCardRef, `workout-${dateStr}.png`, `${day.name} — Workout Complete`); }
    finally { setSharing(false); }
  }


  return (
    <>
      <div style={{ margin: '0 16px 12px', borderRadius: 10, border: `1px solid ${(isToday || isRetaking) ? 'var(--accent)' : 'var(--border)'}`, overflow: 'hidden', background: 'var(--bg2)' }}>
        <button
          onClick={() => !day.isRest && setOpen((o) => !o)}
          style={{ width: '100%', background: isToday ? 'rgba(232,255,90,0.04)' : 'transparent', border: 'none', cursor: day.isRest ? 'default' : 'pointer', padding: '16px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {isToday && (
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', background: 'var(--accent)', color: '#0a0a0a', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', display: 'inline-block', marginBottom: 6 }}>TODAY</div>
            )}
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1, color: (isToday || isRetaking) ? 'var(--accent)' : day.isRest ? 'var(--text3)' : 'var(--text)' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isRetaking && total > 0 && (
                      <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-mono)', color: checkedCount === total ? 'var(--green)' : checkedCount > 0 ? 'var(--accent)' : 'var(--text3)' }}>
                        {checkedCount}<span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>/{total}</span>
                      </span>
                    )}
                    {isRetaking ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(232,255,90,0.1)', border: '1.5px solid var(--accent)', padding: '4px 8px', borderRadius: 4 }}>Retaking</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 4 }}>Skipped</span>
                    )}
                  </div>
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
              (() => {
                const warmups = displayExercises.filter((e) => (e.category || 'workout') === 'warmup');
                const workouts = displayExercises.filter((e) => (e.category || 'workout') === 'workout');
                const cooldowns = displayExercises.filter((e) => (e.category || 'workout') === 'cooldown');

                return (
                  <>
                    {warmups.length > 0 && (
                      <div>
                        <CategoryHeader type="warmup" />
                        {warmups.map((ex, i) => (
                          <ExerciseRow key={ex._id || i} ex={ex} index={displayExercises.indexOf(ex)} splitId={splitId} dayId={day._id} splitDays={splitDays} onToggle={handleToggle} readOnly={readOnly} isCompleted={isCompleted} dateStr={dateStr} logs={logs} onShowToast={onShowToast} />
                        ))}
                      </div>
                    )}

                    {workouts.length > 0 && (
                      <div>
                        <CategoryHeader type="workout" />
                        {workouts.map((ex, i) => (
                          <ExerciseRow key={ex._id || i} ex={ex} index={displayExercises.indexOf(ex)} splitId={splitId} dayId={day._id} splitDays={splitDays} onToggle={handleToggle} readOnly={readOnly} isCompleted={isCompleted} dateStr={dateStr} logs={logs} onShowToast={onShowToast} />
                        ))}
                      </div>
                    )}

                    {cooldowns.length > 0 && (
                      <div>
                        <CategoryHeader type="cooldown" />
                        {cooldowns.map((ex, i) => (
                          <ExerciseRow key={ex._id || i} ex={ex} index={displayExercises.indexOf(ex)} splitId={splitId} dayId={day._id} splitDays={splitDays} onToggle={handleToggle} readOnly={readOnly} isCompleted={isCompleted} dateStr={dateStr} logs={logs} onShowToast={onShowToast} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()
            )}
            {(isToday || isRetaking) && !isCompleted && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                {checkedCount > 0 ? (
                  <button className="btn btn-accent" style={{ flex: 1, fontSize: 14, padding: '12px' }} onClick={() => setShowConfirmFinish(true)} disabled={saveLogMutation.isPending}>
                    {saveLogMutation.isPending ? 'Saving…' : `✓ Finish Workout (${checkedCount} done)`}
                  </button>
                ) : null}
                {isRetaking && (
                  <button className="btn btn-ghost" style={{ flex: checkedCount > 0 ? 0.4 : 1, fontSize: 14, padding: '12px' }} onClick={() => setIsRetaking(false)}>
                    Cancel
                  </button>
                )}
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
            
            {isPast && !isCompleted && !isRetaking && (
              <div style={{ 
                padding: '16px', 
                borderTop: '1px solid var(--border)', 
                background: 'rgba(255,255,255,0.01)',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text3)',
                marginTop: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12
              }}>
                <div>This day has passed. Exercises are in view-only mode.</div>
                <button 
                  className="btn btn-accent" 
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRetaking(true);
                  }}
                >
                  Retake Workout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {completedLog && <DailyShareCard log={completedLog} cardRef={shareCardRef} />}
      {completedLog && <CompletionScreen log={completedLog} onClose={() => setCompletedLog(null)} onShare={handleShare} sharing={sharing} />}
      {showConfirmFinish && (
        <ConfirmModal
          message={`Finish this workout? You have completed ${checkedCount} of ${total} exercises.`}
          onConfirm={handleFinish}
          onClose={() => setShowConfirmFinish(false)}
        />
      )}
    </>
  );
}

function ConsistencyCard({ logs, activeSplit }) {
  const stats = useMemo(() => {
    if (!activeSplit) return { streakWeeks: 0, streakDays: 0, thisWeekDone: 0, thisWeekTarget: 0, weekDays: [] };
    const targetDays = (activeSplit.days || []).filter(d => !d.isRest).length || 1;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + diffToMon);
    
    const logsByDate = new Map();
    (logs || []).forEach(l => logsByDate.set(l.date, true));
    
    let thisWeekDone = 0;
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const isDone = logsByDate.has(dateStr);
      if (isDone) thisWeekDone++;
      weekDays.push({ label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], isDone, isToday: dateStr === TODAY_STR });
    }

    function getISOWeekString(dateObj) {
      const d = new Date(dateObj);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      return `${d.getFullYear()}-W${1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)}`;
    }

    const logsByWeek = new Map();
    (logs || []).forEach(l => {
      const ws = getISOWeekString(new Date(l.date));
      logsByWeek.set(ws, (logsByWeek.get(ws) || 0) + 1);
    });

    let streakWeeks = 0;
    let checkDate = new Date(now);
    let checkWeekStr = getISOWeekString(checkDate);
    
    if ((logsByWeek.get(checkWeekStr) || 0) > 0) {
      streakWeeks++;
    }
    
    checkDate.setDate(checkDate.getDate() - 7);
    checkWeekStr = getISOWeekString(checkDate);
    while ((logsByWeek.get(checkWeekStr) || 0) > 0) {
      streakWeeks++;
      checkDate.setDate(checkDate.getDate() - 7);
      checkWeekStr = getISOWeekString(checkDate);
    }
    
    let streakDays = 0;
    let dDay = new Date(now);
    let checkDayStr = TODAY_STR;
    if (logsByDate.has(checkDayStr)) {
      streakDays++;
    }
    dDay.setDate(dDay.getDate() - 1);
    checkDayStr = dDay.toISOString().slice(0, 10);
    while (logsByDate.has(checkDayStr)) {
      streakDays++;
      dDay.setDate(dDay.getDate() - 1);
      checkDayStr = dDay.toISOString().slice(0, 10);
    }

    return { streakWeeks, streakDays, thisWeekDone, thisWeekTarget: targetDays, weekDays };
  }, [logs, activeSplit]);

  const streakDisplay = stats.streakWeeks > 0 
    ? `🔥 ${stats.streakWeeks} WEEK STREAK` 
    : `🔥 ${stats.streakDays} DAY STREAK`;

  return (
    <div style={{ margin: '0 16px 16px', padding: '16px', background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>
          {streakDisplay}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
          {stats.thisWeekDone} / {stats.thisWeekTarget} workouts
        </div>
      </div>
      
      <div style={{ width: '100%', height: 6, background: 'var(--bg3)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ 
          width: `${Math.min(100, (stats.thisWeekDone / stats.thisWeekTarget) * 100)}%`, 
          height: '100%', 
          background: 'var(--accent)', 
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {stats.weekDays.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: d.isToday ? 'var(--text)' : 'var(--text3)', fontWeight: d.isToday ? 800 : 500 }}>
              {d.label}
            </div>
            <div style={{ 
              width: 24, height: 24, borderRadius: '50%', 
              background: d.isDone ? 'rgba(68,255,136,0.1)' : 'var(--bg3)',
              border: `1px solid ${d.isDone ? 'var(--green)' : d.isToday ? 'var(--border2)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {d.isDone && (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <polyline points="2,7 6,11 12,3" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { storage, storageKey } = useStorage();
  const queryClient = useQueryClient();
  const savingDatesRef = useRef(new Set());
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }
  const { data: splits = [], isLoading, error } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
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
    if (isLoading || isLoadingLogs || !activeSplit || days.length === 0) return;

    let logsInvalidated = false;
    days.forEach((day, i) => {
      if (day.isRest) return;
      const dateStr = getDateForIndex(i);
      if (dateStr >= TODAY_STR) return; // Only past days

      const logForDate = logs.find((l) => l.date === dateStr);
      if (logForDate) {
        savingDatesRef.current.delete(dateStr);
        return; // Already completed
      }

      if (savingDatesRef.current.has(dateStr)) return;

      const checkedExs = (day.exercises || []).filter(
        (e) => e.checked && e.lastCheckedDate === dateStr
      );

      if (checkedExs.length > 0) {
        savingDatesRef.current.add(dateStr);
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
            weightUnit: e.weightUnit,
            category: e.category || 'workout'
          }))
        }).then(() => {
          if (!logsInvalidated) {
            logsInvalidated = true;
            queryClient.invalidateQueries({ queryKey: ['logs'] });
          }
        }).catch(err => {
          console.error("Auto-completion failed:", err);
          savingDatesRef.current.delete(dateStr);
        });
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
${targetExs.map(e => `- ${e.name}: ${e.sets}×${(e.untilFailure || !e.reps || e.reps === 0) ? 'failure' : e.reps} reps${e.weight ? ` @ ${e.weight}${e.weightUnit}` : ''}`).join('\n')}`
      : `Analyze this ${todayLog ? 'completed' : 'planned'} workout. Keep it under 100 words with bullet points.

Split: ${activeSplit.name} | Day: ${todayDay.name}
Exercises: ${targetExs.map(e => `${e.name} ${e.sets}×${(e.untilFailure || !e.reps || e.reps === 0) ? 'failure' : e.reps}`).join(', ')}`;

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
      
      <ConsistencyCard logs={logs} activeSplit={activeSplit} />

      <div style={{ paddingTop: 0 }}>
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
                onShowToast={showToast}
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
      {toast && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'var(--bg2)', border: '1.5px solid var(--accent)',
          borderRadius: 30, padding: '10px 20px', color: 'var(--text)',
          fontSize: 13, fontWeight: 700, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.2s ease'
        }}>
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
        </div>
      )}
    </div>
  );
}
