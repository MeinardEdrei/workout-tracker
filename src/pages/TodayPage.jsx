import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import * as api from '../api/index.js';
import DailyShareCard from '../components/DailyShareCard';
import { MusclePill } from '../components/MusclePill';
import ExerciseThumbnail from '../components/ExerciseThumbnail';

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

/* ─── Heuristic Rule-Based Mock Critique Generator ─── */
function generateMockCritique(log) {
  const exercises = log.exercises || [];
  const numEx = exercises.length;
  const totalVolume = log.totalVolume || 0;
  
  let primaryFocus = "general fitness";
  const lowerName = log.dayName.toLowerCase();
  const lowerTag = log.dayTag.toLowerCase();
  if (lowerName.includes("push") || lowerTag.includes("chest") || lowerTag.includes("push")) {
    primaryFocus = "push muscles (chest, shoulders, triceps)";
  } else if (lowerName.includes("pull") || lowerTag.includes("back") || lowerTag.includes("pull")) {
    primaryFocus = "pull muscles (back, biceps)";
  } else if (lowerName.includes("leg") || lowerTag.includes("quads") || lowerTag.includes("legs") || lowerTag.includes("lower")) {
    primaryFocus = "legs (quadriceps, hamstrings, calves)";
  } else if (lowerName.includes("upper") || lowerTag.includes("upper")) {
    primaryFocus = "upper body";
  }

  const tips = [];
  if (numEx < 3) {
    tips.push("Your volume is on the lower side. Consider adding 1-2 accessory movements to target secondary muscle groups.");
  } else if (numEx > 6) {
    tips.push("High exercise count! Make sure your training intensity remains high. Reduce to 4-5 high-quality movements if you feel fatigue setting in early.");
  } else {
    tips.push("Perfect volume selection! A structure of 3-6 compound and isolation exercises is ideal for maximizing muscle protein synthesis while keeping fatigue manageable.");
  }

  const heavyEx = exercises.find(e => e.weight > 60);
  if (heavyEx) {
    tips.push(`Strong lifting on **${heavyEx.name}** at ${heavyEx.weight}${heavyEx.weightUnit}. Try to apply progressive overload in your next session by aiming for 1 more repetition with the same weight.`);
  } else {
    tips.push("Focus on progressive overload: tracking your weights and ensuring you increase resistance or repetitions incrementally week-over-week is key for growth.");
  }

  return `### Workout Summary
Great effort today! You trained **${primaryFocus}** doing **${numEx} exercises** with a calculated training volume of **${totalVolume} kg**.

### Coach Critique & Next Steps
- ${tips[0]}
- ${tips[1]}
- Ensure you have a post-workout meal with adequate protein and fast-digesting carbohydrates to kickstart muscle recovery. Keep up the consistency!`;
}

function ExerciseRow({ ex, index, splitId, dayId, onToggle, readOnly, isCompleted }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const effectiveChecked = isCompleted ? true : (ex.lastCheckedDate === TODAY_STR ? ex.checked : false);

  const toggleMutation = useMutation({
    mutationFn: () => storage.toggleExercise(splitId, dayId, ex._id),
    onSuccess: (updated) => {
      onToggle(updated);
      queryClient.invalidateQueries({ queryKey: ['splits'] });
    },
  });

  const weightLabel = ex.weight > 0 ? `${ex.weight}${ex.weightUnit}` : '';
  const repsLabel = ex.untilFailure ? 'Until Failure' : ex.reps > 0 ? `${ex.reps} reps` : 'max reps';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', opacity: toggleMutation.isPending ? 0.5 : 1, transition: 'opacity 0.15s' }}>
      <label 
        className={`checkbox-wrap ${effectiveChecked ? 'checked' : ''} ${readOnly ? 'readonly' : ''}`}
        onClick={() => !readOnly && !toggleMutation.isPending && toggleMutation.mutate()}
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
      >
        <div className="checkbox-box">{effectiveChecked && <CheckIcon />}</div>
      </label>
      <ExerciseThumbnail imageUrl={ex.imageUrl} name={ex.name} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.01em', textDecoration: effectiveChecked ? 'line-through' : 'none', color: effectiveChecked ? 'var(--text3)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {index + 1}. {ex.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {ex.sets}×{repsLabel}{weightLabel ? ` · ${weightLabel}` : ''}
        </div>
        {ex.muscleTargets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
            {ex.muscleTargets.map((t) => <MusclePill key={t} target={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DayCard({ day, splitId, splitName, isToday, defaultOpen, dateStr, logForDate }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);
  const [completedLog, setCompletedLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);

  // AI-related state
  const [critique, setCritique] = useState(() => logForDate ? (localStorage.getItem('ai_critique_' + logForDate._id) || '') : '');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    setExercises(day.exercises || []);
  }, [day.exercises]);

  // Sync critique state when logForDate changes (e.g., when marking completed or loading logs)
  useEffect(() => {
    if (logForDate) {
      setCritique(localStorage.getItem('ai_critique_' + logForDate._id) || '');
    } else {
      setCritique('');
    }
  }, [logForDate]);

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

  async function handleAiCritique(useMock = false) {
    if (!logForDate) return;
    setLoadingAi(true);
    setAiError('');
    setShowInstructions(false);

    const promptText = `You are a professional strength coach. Analyze the user's workout and provide a brief critique and actionable recommendation for their next workout. Keep it under 100 words and format with clear markdown bullet points.

Workout split: ${logForDate.splitName}
Workout day: ${logForDate.dayName} (${logForDate.dayTag})
Exercises completed:
${logForDate.exercises.map(e => `- ${e.name}: ${e.sets} sets x ${e.reps} reps @ ${e.weight}${e.weightUnit}`).join('\n')}`;

    if (useMock) {
      setTimeout(() => {
        const result = generateMockCritique(logForDate);
        localStorage.setItem('ai_critique_' + logForDate._id, result);
        setCritique(result);
        setLoadingAi(false);
      }, 1000);
      return;
    }

    try {
      let result = '';
      const hasAi = window.ai;
      
      if (hasAi) {
        let session = null;
        if (window.ai.languageModel) {
          session = await window.ai.languageModel.create({
            systemPrompt: "You are a professional gym coach. You analyze workout logs and provide helpful, encouraging, and actionable recommendations in under 120 words using markdown bullet points."
          });
        } else if (window.ai.assistant) {
          session = await window.ai.assistant.create();
        } else if (window.ai.createTextSession) {
          session = await window.ai.createTextSession();
        }

        if (session) {
          result = await session.prompt(promptText);
          session.destroy?.();
        } else {
          throw new Error("Local model Prompt API is supported but could not initialize.");
        }
      } else {
        throw new Error("Native window.ai Prompt API is not supported in this browser.");
      }

      if (result && result.trim()) {
        localStorage.setItem('ai_critique_' + logForDate._id, result.trim());
        setCritique(result.trim());
      } else {
        throw new Error("Local model returned empty response.");
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || "Failed to initialize local AI.");
      setShowInstructions(true);
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <>
      <div style={{ margin: '0 16px 12px', borderRadius: 10, border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, overflow: 'hidden', background: 'var(--bg2)' }}>
        <button
          onClick={() => !day.isRest && setOpen((o) => !o)}
          style={{ width: '100%', background: isToday ? 'rgba(232,255,90,0.05)' : 'transparent', border: 'none', cursor: day.isRest ? 'default' : 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {isToday && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', background: 'var(--accent)', color: '#0a0a0a', padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>TODAY</span>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.01em', color: isToday ? 'var(--accent)' : 'var(--text)', textTransform: 'uppercase' }}>{day.name}</div>
              {day.tag && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1, fontWeight: 500 }}>{day.tag}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {day.isRest ? <span className="tag">Rest</span> : (
              <>
                {isCompleted ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.05em', textTransform: 'uppercase', background: 'rgba(68,255,136,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                    Completed
                  </span>
                ) : isPast ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: 4 }}>
                    Skipped
                  </span>
                ) : (
                  total > 0 && <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: checkedCount === total ? 'var(--green)' : 'var(--text2)' }}>{checkedCount}/{total}</span>
                )}
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
                <ExerciseRow key={ex._id || i} ex={ex} index={i} splitId={splitId} dayId={day._id} onToggle={handleToggle} readOnly={readOnly} isCompleted={isCompleted} />
              ))
            )}
            {checkedCount > 0 && isToday && !isCompleted && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-accent" style={{ width: '100%', fontSize: 14, padding: '12px' }} onClick={handleFinish} disabled={saveLogMutation.isPending}>
                  {saveLogMutation.isPending ? 'Saving…' : `✓ Finish Workout (${checkedCount} done)`}
                </button>
              </div>
            )}
            
            {/* Completed Workout section details */}
            {isCompleted && (
              <>
                {/* AI Critique block */}
                {critique ? (
                  <div style={{
                    margin: '12px 16px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(232,255,90,0.03) 0%, rgba(0,0,0,0.4) 100%)',
                    border: '1px solid rgba(232,255,90,0.15)',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 60,
                      height: 60,
                      background: 'var(--accent)',
                      opacity: 0.06,
                      filter: 'blur(20px)',
                      borderRadius: '50%'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>✨</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Coach Insights</span>
                      </div>
                      <button 
                        onClick={() => handleAiCritique(false)} 
                        disabled={loadingAi}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                      >
                        {loadingAi ? 'Analyzing…' : '🔄 Recalculate'}
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {renderMarkdown(critique)}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px 0' }}>
                    <button 
                      className="btn" 
                      onClick={() => handleAiCritique(false)}
                      disabled={loadingAi}
                      style={{
                        width: '100%',
                        background: 'rgba(232,255,90,0.08)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(232,255,90,0.2)',
                        fontSize: 13,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        borderRadius: 8,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.15)'; e.target.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.08)'; e.target.style.borderColor = 'rgba(232,255,90,0.2)'; }}
                    >
                      {loadingAi ? (
                        <>
                          <span style={{
                            display: 'inline-block', width: 12, height: 12, marginRight: 6,
                            border: '1.5px solid var(--accent)', borderTopColor: 'transparent',
                            borderRadius: '50%', animation: 'spin 0.6s linear infinite'
                          }} />
                          Analyzing workout locally...
                        </>
                      ) : (
                        <>
                          <span>✨</span> Get AI Coach Critique & Insights
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Instructions panel */}
                {showInstructions && (
                  <div style={{
                    margin: '12px 16px 0',
                    padding: '14px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⚠️</span> Chrome On-Device AI Not Setup
                    </div>
                    <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.4, marginBottom: 10 }}>
                      This app uses Google Chrome's built-in <strong>Gemini Nano</strong> model to run AI 100% offline. Follow these quick steps to enable it:
                    </p>
                    <ol style={{ paddingLeft: 18, color: 'var(--text2)', fontSize: 11, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      <li>Open <code>chrome://flags/#optimization-guide-on-device-model</code> and set to <strong>Enabled BypassPrefRequirement</strong>.</li>
                      <li>Open <code>chrome://flags/#prompt-api-for-gemini-nano</code> and set to <strong>Enabled</strong>.</li>
                      <li>Relaunch Chrome.</li>
                      <li>Go to <code>chrome://components</code> and check for updates under <strong>Optimization Guide On Device Model</strong> to download the local model.</li>
                    </ol>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn btn-accent" 
                        style={{ flex: 1, fontSize: 11, padding: '6px 10px' }} 
                        onClick={() => handleAiCritique(true)}
                      >
                        Run Mock AI (Demo)
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        style={{ fontSize: 11, padding: '6px 10px' }} 
                        onClick={() => setShowInstructions(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

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
              </>
            )}
            
            {isPast && !isCompleted && (
              <div style={{ 
                padding: '12px 16px', 
                borderTop: '1px solid var(--border)', 
                background: 'rgba(255,255,255,0.01)',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text3)'
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
  const { data: splits = [], isLoading, error } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs', storageKey],
    queryFn: storage.getLogs,
  });

  if (isLoading) return <div className="spinner" />;
  if (error) return <div className="empty-state">Error: {error.message}</div>;

  const activeSplit = splits.find((s) => s.isActive) || splits[0] || null;

  if (!activeSplit) return (
    <div>
      <div className="page-header"><h1 className="page-title">Today</h1></div>
      <div className="empty-state">No active split.<br />Go to Splits tab to activate one.</div>
    </div>
  );

  const days = [...(activeSplit.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
  const dayNameMatch = DAY_NAMES[TODAY_DOW].toLowerCase();
  let todayIndex = days.findIndex((d) => d.name.toLowerCase().startsWith(dayNameMatch));
  if (todayIndex === -1) todayIndex = TODAY_DOW % days.length;

  function getDateForIndex(index) {
    const d = new Date();
    d.setDate(d.getDate() + (index - todayIndex));
    return d.toISOString().slice(0, 10);
  }

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
      <div style={{ paddingTop: 16 }}>
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
                splitName={activeSplit.name} 
                isToday={i === todayIndex} 
                defaultOpen={i === todayIndex && !day.isRest}
                dateStr={dateStr}
                logForDate={logForDate}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
