import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { useAuth } from '../context/AuthContext';
import SplitShareModal from '../components/SplitShareModal';

const API = import.meta.env.VITE_API_URL || '';

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
function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, flexShrink: 0,
      border: '1.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    }} />
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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

/* ─── External Gemini API Helper ─── */
async function callExternalGeminiApi(apiKey, systemPrompt, chatHistory, userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const contents = chatHistory.map(m => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: m.text.replace(/\*✨.*\*/g, '').trim() }]
  }));
  
  contents.push({
    role: 'user',
    parts: [{ text: userText.trim() }]
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error("Empty response from Gemini API.");
  }
  return reply.trim();
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

/* ─── Heuristic Rule-Based local Split Analysis Engine ─── */
function generateSplitsPageLocalResponse(query, splits) {
  const q = query.toLowerCase();
  const activeSplit = splits.find(s => s.isActive) || splits[0] || null;

  if (q.includes("critique") || q.includes("is my split") || q.includes("review") || q.includes("opinion") || q.includes("good")) {
    if (!activeSplit) {
      return `### Split Critique
You don't have any active split. Please create and activate a split so I can critique it!`;
    }

    const trainingDays = (activeSplit.days || []).filter(d => !d.isRest);
    const restDays = (activeSplit.days || []).filter(d => d.isRest);
    const numTraining = trainingDays.length;
    const numRest = restDays.length;

    let response = `### Critique of Active Split: **${activeSplit.name}**\n`;
    response += `- **Weekly Structure:** You have **${numTraining} training days** and **${numRest} rest days** defined in this split.\n`;

    if (numTraining === 0) {
      response += `- ⚠️ This split has no training days yet! Tap Edit to add some days and exercises.\n`;
      return response;
    }

    // Frequency analysis
    if (numTraining <= 3) {
      response += `- **Frequency (Moderate):** A ${numTraining}-day split is highly manageable and great for recovery. Ensure you focus on multi-joint compound movements (Squats, Deadlifts, Bench Press) to get the most out of each session.\n`;
    } else if (numTraining === 4) {
      response += `- **Frequency (Optimal):** 4 days is the golden standard for intermediate lifters (e.g. Upper/Lower split). It provides the perfect balance of training stimulus and 3 full days of rest.\n`;
    } else if (numTraining === 5) {
      response += `- **Frequency (High):** 5 training days per week is ideal for advanced lifters or those running specialized splits (e.g. Upper/Lower/Push/Pull/Legs). Ensure your nutrition and sleep are dialed in.\n`;
    } else {
      response += `- **Frequency (Very High):** ${numTraining} training days leaves very little room for recovery. Monitor your joints and fatigue levels closely; consider adding a scheduled rest day.\n`;
    }

    // Rest days check
    if (numRest === 0) {
      response += `- ⚠️ **Warning:** No rest days are explicitly marked in this split. Muscles grow during recovery, not in the gym! Try adding at least 1-2 rest days per week.\n`;
    }

    // Exercise count analysis
    const totalExs = trainingDays.reduce((acc, d) => acc + (d.exercises || []).length, 0);
    const avgExs = totalExs / numTraining;
    if (avgExs > 6) {
      response += `- **Volume (High):** You average **${avgExs.toFixed(1)} exercises** per training day. This might lead to junk volume. Try trimming down to 4-5 high-intensity exercises per workout.\n`;
    } else if (avgExs < 3) {
      response += `- **Volume (Low):** You average **${avgExs.toFixed(1)} exercises** per training day. Consider adding 1-2 accessory movements to target minor muscle groups (arms, calves, abs).\n`;
    } else {
      response += `- **Volume (Optimal):** Your average of **${avgExs.toFixed(1)} exercises** per workout is ideal for maintaining high intensity throughout the session.\n`;
    }

    return response;
  }

  if (q.includes("better") || q.includes("alternative")) {
    if (!activeSplit) {
      return `### Split Recommendations
Since you don't have an active split, here are the standard recommendations:
- **Beginners:** 3-Day Full Body split.
- **Intermediate (4 Days/week):** Upper/Lower split (2x upper, 2x lower).
- **Advanced (5-6 Days/week):** Push/Pull/Legs (PPL) split.`;
    }

    const name = activeSplit.name.toLowerCase();
    if (name.includes("ppl") || name.includes("push") || name.includes("pull")) {
      return `### Alternatives to your PPL Split
Your active split **${activeSplit.name}** resembles a Push/Pull/Legs routine.
- **Why change?** PPL requires 6 days/week to hit each muscle twice. If you miss days, your frequency drops.
- **Better Alternative:** Switch to a **4-Day Upper/Lower** split. You get 3 rest days and still hit every muscle group twice a week.
- **Bro Split Alternative:** Avoid switching to a "bro split" (chest day, back day, etc.) as training muscles only once a week is suboptimal for muscle growth.`;
    } else if (name.includes("upper") || name.includes("lower")) {
      return `### Alternatives to your Upper/Lower Split
Your active split **${activeSplit.name}** resembles an Upper/Lower routine.
- **Why change?** You want more variety or want to train 5-6 days a week.
- **Better Alternative:** Try a **Push/Pull/Legs (PPL)** split (6 days/week) or **Upper/Lower/PPL** (5 days/week). This allows more direct focus on specific muscle groups in each session.`;
    } else {
      return `### How to Optimize Your Split
For your split **${activeSplit.name}**, here are key guidelines:
- **Frequency:** Make sure you target each muscle group at least 2 times per week. If your split only targets them once, it's a "bro split".
- **Switch to Upper/Lower:** A 4-day Upper/Lower split is highly recommended if you want to optimize your time.
- **Switch to PPL:** A 6-day Push/Pull/Legs split is best if you love being in the gym daily and want to isolate muscle groups.`;
    }
  }

  if (q.includes("rest") || q.includes("recovery") || q.includes("program rest")) {
    return `### How to Program Rest Days
Rest days are when your body repairs micro-tears in muscle fibers, leading to growth and strength gains.
- **Rule of Thumb:** Never train more than 3 consecutive days without a rest day.
- **Optimal Schedule:** 
  - For a 4-day split: Train 2 days, Rest 1, Train 2, Rest 2 (e.g., Upper/Lower/Rest/Upper/Lower/Rest/Rest).
  - For a PPL split: Push/Pull/Legs/Rest/Push/Pull/Legs/Rest.
- **Indicators you need rest:** Persistent joint soreness, drop in lifting strength, trouble sleeping, or general lack of motivation.`;
  }

  if (q.includes("popular") || q.includes("others") || q.includes("what do others")) {
    return `### Popular Gym Splits
Here is what the lifting community widely uses:
1. **Push/Pull/Legs (PPL):**
   - *Frequency:* 3 or 6 days/week.
   - *Pros:* Excellent muscle group synergy (e.g. chest & triceps work together).
2. **Upper/Lower:**
   - *Frequency:* 4 days/week.
   - *Pros:* Great recovery, allows high intensity on major compound movements.
3. **Arnold Split (Chest/Back, Shoulders/Arms, Legs):**
   - *Frequency:* 6 days/week.
   - *Pros:* High arm/shoulder frequency, agonist/antagonist supersets (chest/back) save time.
4. **Full Body:**
   - *Frequency:* 3 days/week.
   - *Pros:* High frequency per muscle, perfect for athletes and beginners.`;
  }

  return `### AI Split Coach Tips
I'm here to help you program the perfect training routine! E.g.
- Ask: **"Is my split too much volume?"** to analyze exercises count.
- Ask: **"What's a better alternative?"** to explore other structures.
- Ask: **"How to program rest?"** to optimize your recovery.`;
}

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const { user, isLoggedIn, logout } = useAuth();
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const signInTimer = useRef(null);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['splits'] });

  const [expandedSplitIds, setExpandedSplitIds] = useState([]);
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('ai_splits_chat_history');
    if (saved) return JSON.parse(saved);
    return [{
      sender: 'coach',
      text: "### AI Split Advisor\nWelcome! I can help you analyze your training splits, balance your workload, schedule rest days, or recommend alternative programs.\n\nHere are some things you can ask me:\n- **Is my split too much volume?**\n- **What's a better alternative for my split?**\n- **What do others usually do for this type of split?**\n- **How should I program rest days?**"
    }];
  });
  const [inputText, setInputText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loadingAi]);

  function toggleExpandSplit(splitId) {
    setExpandedSplitIds((prev) => 
      prev.includes(splitId) 
        ? prev.filter(id => id !== splitId) 
        : [...prev, splitId]
    );
  }

  async function handleSendAdvisorReply(textToSend) {
    const text = textToSend || inputText;
    if (!text.trim() || loadingAi) return;

    const updatedHistory = [...chatHistory, { sender: 'user', text: text.trim() }];
    setChatHistory(updatedHistory);
    setInputText('');
    setLoadingAi(true);

    const splitsText = splits.map(s => {
      const sortedDays = [...(s.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
      const daysStr = sortedDays.map(d => {
        if (d.isRest) return `- ${d.name}: Rest Day`;
        const exList = (d.exercises || []).map(e => `${e.name} (${e.sets}x${e.reps}${e.weight > 0 ? ` @ ${e.weight}${e.weightUnit}` : ''})`).join(', ');
        return `- ${d.name} (${d.tag || 'No tag'}): ${exList || 'No exercises yet'}`;
      }).join('\n');
      return `Split Name: ${s.name}${s.isActive ? ' (ACTIVE SPLIT)' : ''}\nDays:\n${daysStr}`;
    }).join('\n\n');

    try {
      let reply = '';
      const hasAi = window.ai;
      const externalApiKey = localStorage.getItem('user_gemini_api_key');

      if (externalApiKey) {
        const systemPrompt = `You are a professional strength coach and fitness programmer. Analyze the user's training splits and answer their question (whether it is about their splits, general fitness, or any general topics). Keep your answer under 150 words and format with clear markdown bullet points.

Here are the user's current workout splits:
${splitsText}`;

        reply = await callExternalGeminiApi(externalApiKey, systemPrompt, chatHistory, text.trim());
      } else if (hasAi) {
        const promptText = `You are a professional strength coach and fitness programmer. Analyze the user's training splits and answer their question. Keep your answer under 120 words and format with clear markdown bullet points.

Here are the user's current workout splits:
${splitsText}

Chat History:
${chatHistory.map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text.replace(/\*✨.*\*/, '')}`).join('\n')}
User: ${text.trim()}
Coach:`;

        let session = null;
        if (window.ai.languageModel) {
          session = await window.ai.languageModel.create({
            systemPrompt: "You are a professional strength coach. You analyze workout splits and provide helpful, encouraging, and actionable recommendations in under 120 words using markdown bullet points."
          });
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
        const withTag = reply.trim() + (externalApiKey ? '\n\n*✨ Powered by Gemini (API Key)*' : '\n\n*✨ Powered by Gemini Nano (Offline)*');
        const finalHistory = [...updatedHistory, { sender: 'coach', text: withTag }];
        setChatHistory(finalHistory);
        localStorage.setItem('ai_splits_chat_history', JSON.stringify(finalHistory));
      } else {
        const localReply = generateSplitsPageLocalResponse(text.trim(), splits) + '\n\n*✨ Powered by Local Analysis Engine*';
        const finalHistory = [...updatedHistory, { sender: 'coach', text: localReply }];
        setChatHistory(finalHistory);
        localStorage.setItem('ai_splits_chat_history', JSON.stringify(finalHistory));
      }
    } catch (err) {
      console.error("Gemini AI failed, falling back to local analysis:", err);
      const localReply = generateSplitsPageLocalResponse(text.trim(), splits) + '\n\n*✨ Powered by Local Analysis Engine*';
      const finalHistory = [...updatedHistory, { sender: 'coach', text: localReply }];
      setChatHistory(finalHistory);
      localStorage.setItem('ai_splits_chat_history', JSON.stringify(finalHistory));
    } finally {
      setLoadingAi(false);
    }
  }

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

  function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    setSignInFailed(false);
    signInTimer.current = setTimeout(() => {
      setSigningIn(false);
      setSignInFailed(true);
    }, 5000);
    fetch(`${API}/api/auth/google/url`)
      .then((r) => r.json())
      .then(({ url }) => {
        clearTimeout(signInTimer.current);
        window.location.href = url;
      })
      .catch(() => {
        clearTimeout(signInTimer.current);
        setSigningIn(false);
        window.location.href = `${API}/api/auth/google`;
      });
  }

  return (
    <div>
      {/* Sign-in status toast */}
      {signingIn && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--text3)', padding: '8px 14px', borderRadius: 20,
          fontSize: 12, fontWeight: 500, zIndex: 200, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 7,
          animation: 'fadeIn 0.15s ease',
        }}>
          <InlineSpinner /> Opening Google Sign In…
        </div>
      )}

      {/* Sign-in timeout error toast */}
      {signInFailed && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg2)', border: '1px solid var(--red)',
          color: 'var(--text)', padding: '10px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, zIndex: 300, maxWidth: 300,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.15s ease',
        }}>
          <span style={{ flex: 1 }}>Sign in failed. Please try again.</span>
          <button onClick={() => setSignInFailed(false)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      {/* Override the global 80px right padding — auth lives inside this header */}
      <div className="page-header" style={{ padding: '16px 20px' }}>
        {/* Left: title + count */}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Splits</h1>
          <div className="page-subtitle">{splits.length} programs</div>
        </div>

        {/* Right: auth control + primary action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Auth: avatar (logged in) or ghost sign-in button (guest) */}
          {isLoggedIn ? (
            <div style={{ position: 'relative' }}>
              {/* 44×44 tap target: 30px avatar + 7px padding on each side */}
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 7, borderRadius: '50%', display: 'flex',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Account menu"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--accent)', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#0a0a0a',
                  }}>
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 150,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '8px 0', minWidth: 180,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.12s ease',
                  }}>
                    <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      style={{
                        width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left', color: 'var(--red)',
                        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Ghost sign-in — intentionally secondary to + New */
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border2)',
                color: 'var(--text3)', cursor: signingIn ? 'default' : 'pointer',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                opacity: signingIn ? 0.5 : 1, transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {signingIn ? (
                <><InlineSpinner /> Redirecting…</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign in
                </>
              )}
            </button>
          )}

          {/* Primary action: always accent, always prominent */}
          <button className="btn btn-accent" onClick={() => setModal({ type: 'add' })}>
            <PlusIcon /> New
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="empty-state">No splits yet.<br />Tap New to create one.</div>
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {splits.map((split) => {
            const isExpanded = expandedSplitIds.includes(split._id);
            const sortedDays = [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
            return (
              <div
                key={split._id}
                style={{
                  marginBottom: 10,
                  borderRadius: 10,
                  border: `1px solid ${split.isActive ? 'var(--accent)' : 'var(--border)'}`,
                  background: split.isActive ? 'rgba(232,255,90,0.04)' : 'var(--bg2)',
                  opacity: actionLoading === split._id ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                  overflow: 'hidden'
                }}
              >
                {/* Header Row (Click to toggle expand) */}
                <div
                  onClick={() => toggleExpandSplit(split._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate(split);
                    }}
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
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{split.days?.length || 0} days</span>
                      {split.isActive && <span style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', fontSize: 10, textTransform: 'uppercase' }}>● Active</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => setModal({ type: 'rename', split })} title="Rename">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5Z" />
                      </svg>
                    </button>
                    <button className="btn-icon" onClick={() => setShareModal(split)} title="Share">
                      <ShareIcon />
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setModal({ type: 'delete', split })} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
                        <line x1="6.5" y1="7" x2="6.5" y2="11" /><line x1="9.5" y1="7" x2="9.5" y2="11" />
                      </svg>
                    </button>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.15s', cursor: 'pointer', marginLeft: 4 }} onClick={() => toggleExpandSplit(split._id)}>
                      <polyline points="4,6 8,10 12,6" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(0,0,0,0.2)' }}>
                    {sortedDays.length === 0 ? (
                      <div style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No days added yet. Tap Edit in Today page to configure.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sortedDays.map((day) => (
                          <div 
                            key={day._id}
                            style={{ 
                              padding: '10px 12px', 
                              background: 'var(--bg3)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 8 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: day.isRest ? 0 : 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                                  {day.name}
                                </span>
                                {day.isRest && (
                                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text3)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', border: '1px solid var(--border)' }}>
                                    REST
                                  </span>
                                )}
                              </div>
                              {day.tag && (
                                <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(232,255,90,0.08)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(232,255,90,0.15)' }}>
                                  {day.tag}
                                </span>
                              )}
                            </div>
                            
                            {!day.isRest && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(day.exercises || []).map((ex, idx) => (
                                  <div 
                                    key={ex._id || idx}
                                    style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      fontSize: 13,
                                      color: 'var(--text2)',
                                      padding: '2px 0'
                                    }}
                                  >
                                    <span style={{ color: 'var(--text)' }}>{idx + 1}. {ex.name}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontSize: 12 }}>
                                      {ex.sets}×{ex.untilFailure ? 'Failure' : ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}${ex.weightUnit}` : ''}
                                    </span>
                                  </div>
                                ))}
                                {(day.exercises || []).length === 0 && (
                                  <div style={{ color: 'var(--text3)', fontSize: 12, fontStyle: 'italic' }}>No exercises in this day</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Split Advisor */}
      {!isLoading && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            margin: '24px 0 12px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(232,255,90,0.03) 0%, rgba(0,0,0,0.4) 100%)',
            border: '1px solid rgba(232,255,90,0.15)',
            borderRadius: 10,
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
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Split Advisor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                  title="API Settings"
                >
                  🔑 {apiKey ? 'Configured' : 'Setup Key'}
                </button>
                <button 
                  onClick={() => {
                    const welcome = [{
                      sender: 'coach',
                      text: "### AI Split Advisor\nWelcome! I can help you analyze your training splits, balance your workload, schedule rest days, or recommend alternative programs.\n\nHere are some things you can ask me:\n- **Is my split too much volume?**\n- **What's a better alternative for my split?**\n- **What do others usually do for this type of split?**\n- **How should I program rest days?**"
                    }];
                    setChatHistory(welcome);
                    localStorage.setItem('ai_splits_chat_history', JSON.stringify(welcome));
                  }}
                  disabled={loadingAi}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                >
                  🔄 Restart
                </button>
              </div>
            </div>

            {/* API Key Setup Panel */}
            {showSettings && (
              <div style={{
                padding: 12,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Gemini API Settings</div>
                <div style={{ color: 'var(--text2)', marginBottom: 8, lineHeight: 1.3 }}>
                  Provide a free API key to unlock full, random Q&A capabilities without Chrome setup.
                  <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', marginLeft: 4, textDecoration: 'underline' }}>
                    Get free key here
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    type="password"
                    placeholder="Paste AI Studio API Key..."
                    value={apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiKey(val);
                      if (val.trim()) {
                        localStorage.setItem('user_gemini_api_key', val.trim());
                      } else {
                        localStorage.removeItem('user_gemini_api_key');
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text)',
                      padding: '6px 10px',
                      fontSize: 12
                    }}
                  />
                  <button 
                    onClick={() => {
                      setApiKey('');
                      localStorage.removeItem('user_gemini_api_key');
                    }}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--red)',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Messages list */}
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, paddingRight: 4 }}>
              {chatHistory.map((msg, idx) => {
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
                  Advisor is analyzing splits...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies presets */}
            {!loadingAi && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <button 
                  onClick={() => handleSendAdvisorReply("Critique my active split")}
                  style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                >
                  Critique active split
                </button>
                <button 
                  onClick={() => handleSendAdvisorReply("What is a better alternative for my split?")}
                  style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                >
                  What's a better split?
                </button>
                <button 
                  onClick={() => handleSendAdvisorReply("How should I program rest days?")}
                  style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                >
                  How to program rest?
                </button>
                <button 
                  onClick={() => handleSendAdvisorReply("What are the most popular training splits?")}
                  style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 10px', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(232,255,90,0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(232,255,90,0.05)'; }}
                >
                  Popular splits
                </button>
              </div>
            )}

            {/* Chat Input Field */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendAdvisorReply(); }}
              style={{ display: 'flex', gap: 6 }}
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about your splits..."
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
        </div>
      )}

      {modal?.type === 'add' && <SplitModal title="New Split" onConfirm={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === 'rename' && <SplitModal title="Rename Split" initial={modal.split.name} onConfirm={handleRename} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && <ConfirmModal message={`Delete "${modal.split.name}"? This cannot be undone.`} onConfirm={handleDelete} onClose={() => setModal(null)} />}
      {shareModal && <SplitShareModal split={shareModal} onClose={() => setShareModal(null)} />}
    </div>
  );
}
