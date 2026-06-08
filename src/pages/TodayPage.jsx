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

function DayCard({ day, splitId, splitName, isToday, defaultOpen, dateStr, logForDate, logs }) {
  const queryClient = useQueryClient();
  const { storage } = useStorage();
  const [open, setOpen] = useState(defaultOpen);
  const [exercises, setExercises] = useState(day.exercises || []);
  const [completedLog, setCompletedLog] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);

  // AI-related state
  const cacheKey = logForDate ? logForDate._id : day._id;
  const [critique, setCritique] = useState(() => localStorage.getItem('ai_critique_' + cacheKey) || '');
  const [loadingAi, setLoadingAi] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('ai_chat_history_' + cacheKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputText, setInputText] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setExercises(day.exercises || []);
  }, [day.exercises]);

  // Sync critique and chat history when logForDate or day._id changes
  useEffect(() => {
    setCritique(localStorage.getItem('ai_critique_' + cacheKey) || '');
    const saved = localStorage.getItem('ai_chat_history_' + cacheKey);
    setChatHistory(saved ? JSON.parse(saved) : []);
  }, [logForDate, day._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, critique, loadingAi]);

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

  async function handleAiCritique() {
    setLoadingAi(true);

    const targetExs = logForDate ? logForDate.exercises : (day.exercises || []);
    const promptText = `You are a professional strength coach. Analyze the user's ${logForDate ? 'completed' : 'planned'} workout split and today's day, and provide a brief critique and actionable recommendation for this session. Keep it under 100 words and format with clear markdown bullet points.

Workout split: ${splitName}
Workout day: ${day.name} (${day.tag || 'No tag'})
Exercises ${logForDate ? 'completed' : 'planned'}:
${targetExs.map(e => `- ${e.name}: ${e.sets} sets x ${e.reps} reps ${e.weight ? `@ ${e.weight}${e.weightUnit}` : ''}`).join('\n')}`;

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
        }
      }

      if (result && result.trim()) {
        const withTag = result.trim() + '\n\n*✨ Powered by Gemini Nano (Offline)*';
        localStorage.setItem('ai_critique_' + cacheKey, withTag);
        setCritique(withTag);
      } else {
        const localResult = generateOnDeviceCritique(logForDate || { ...day, date: dateStr, splitName }, logs) + '\n\n*✨ Powered by Local Analysis Engine*';
        localStorage.setItem('ai_critique_' + cacheKey, localResult);
        setCritique(localResult);
      }
    } catch (err) {
      console.error("Local AI failed, falling back to local analysis:", err);
      const localResult = generateOnDeviceCritique(logForDate || { ...day, date: dateStr, splitName }, logs) + '\n\n*✨ Powered by Local Analysis Engine*';
      localStorage.setItem('ai_critique_' + cacheKey, localResult);
      setCritique(localResult);
    } finally {
      setLoadingAi(false);
    }
  }

  async function handleSendReply(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim() || loadingAi) return;

    const updatedHistory = [...chatHistory, { sender: 'user', text: text.trim() }];
    setChatHistory(updatedHistory);
    setInputText('');
    setLoadingAi(true);

    const isLocalEngine = critique.includes('Local Analysis Engine');
    const targetExs = logForDate ? logForDate.exercises : (day.exercises || []);

    try {
      let reply = '';
      if (window.ai && !isLocalEngine) {
        // Chat using Chrome Gemini Nano Prompt API
        const promptText = `You are a professional strength coach. Answer the user's question about their workout or split. Keep your answer under 120 words and format with clear markdown bullet points.

Workout split: ${splitName}
Workout day: ${day.name} (${day.tag || 'No tag'})
Exercises: ${targetExs.map(e => e.name).join(', ')}

Chat History:
Coach: ${critique.replace(/\*✨.*\*/, '')}
${chatHistory.map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n')}
User: ${text.trim()}
Coach:`;

        let session = null;
        if (window.ai.languageModel) {
          session = await window.ai.languageModel.create();
        } else if (window.ai.assistant) {
          session = await window.ai.assistant.create();
        } else if (window.ai.createTextSession) {
          session = await window.ai.createTextSession();
        }

        if (session) {
          reply = await session.prompt(promptText);
          session.destroy?.();
        }
      }

      if (reply && reply.trim()) {
        const finalHistory = [...updatedHistory, { sender: 'coach', text: reply.trim() }];
        setChatHistory(finalHistory);
        localStorage.setItem('ai_chat_history_' + cacheKey, JSON.stringify(finalHistory));
      } else {
        // Fallback to local heuristic responder
        const localReply = generateLocalCoachResponse(text.trim(), logForDate || { ...day, date: dateStr, splitName }, logs);
        const finalHistory = [...updatedHistory, { sender: 'coach', text: localReply }];
        setChatHistory(finalHistory);
        localStorage.setItem('ai_chat_history_' + cacheKey, JSON.stringify(finalHistory));
      }
    } catch (err) {
      console.error(err);
      const localReply = generateLocalCoachResponse(text.trim(), logForDate || { ...day, date: dateStr, splitName }, logs);
      const finalHistory = [...updatedHistory, { sender: 'coach', text: localReply }];
      setChatHistory(finalHistory);
      localStorage.setItem('ai_chat_history_' + cacheKey, JSON.stringify(finalHistory));
    } finally {
      setLoadingAi(false);
    }
  }

  // Combine initial critique and replies into a single chat window
  const chatMessages = critique ? [
    { sender: 'coach', text: critique },
    ...chatHistory
  ] : [];

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
            
            {/* AI Chat / Critique block */}
            {critique ? (
              <div style={{
                margin: '12px 16px',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(232,255,90,0.03) 0%, rgba(0,0,0,0.4) 100%)',
                border: '1px solid rgba(232,255,90,0.15)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 60,
                  height: 60,
                  background: 'var(--accent)',
                  opacity: 0.05,
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }} />

                {/* Chat Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(232,255,90,0.1)', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Coach Chat</span>
                  </div>
                  <button 
                    onClick={handleAiCritique} 
                    disabled={loadingAi}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                  >
                    {loadingAi ? 'Analyzing…' : '🔄 Restart'}
                  </button>
                </div>

                {/* Messages list */}
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, paddingRight: 4 }}>
                  {chatMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div 
                        key={idx}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          background: isUser ? 'var(--bg4)' : 'rgba(255,255,255,0.01)',
                          border: isUser ? '1px solid var(--border2)' : '1px solid rgba(255,255,255,0.04)',
                          padding: '10px 14px',
                          borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
                          maxWidth: '88%',
                          fontSize: 13,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {renderMarkdown(msg.text)}
                        </div>
                      </div>
                    );
                  })}
                  
                  {loadingAi && (
                    <div style={{
                      alignSelf: 'flex-start',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      padding: '10px 14px',
                      borderRadius: '12px 12px 12px 0',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--text3)'
                    }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8,
                        border: '1.5px solid var(--text3)', borderTopColor: 'transparent',
                        borderRadius: '50%', animation: 'spin 0.6s linear infinite'
                      }} />
                      Coach is writing...
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies presets */}
                {!loadingAi && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <button 
                      onClick={() => handleSendReply("Is my split too much volume?")}
                      style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                    >
                      Is this split too much?
                    </button>
                    <button 
                      onClick={() => handleSendReply("What is a better alternative for this split?")}
                      style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                    >
                      What's a better split?
                    </button>
                    <button 
                      onClick={() => handleSendReply("What do others usually do for this type of split?")}
                      style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                    >
                      What do others do?
                    </button>
                  </div>
                )}

                {/* Chat Input Field */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}
                  style={{ display: 'flex', gap: 6 }}
                >
                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask follow-up questions..."
                    style={{
                      flex: 1,
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--text)',
                      padding: '8px 12px',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() || loadingAi}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--accent)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#0a0a0a',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                      opacity: (!inputText.trim() || loadingAi) ? 0.5 : 1
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ padding: '12px 16px 0' }}>
                <button 
                  className="btn" 
                  onClick={handleAiCritique}
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
                logs={logs}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
