import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { useAuth } from '../context/AuthContext';
import SplitShareModal from '../components/SplitShareModal';
import SplitEditor from './EditPage';
import BrowseSplitsPage from './BrowseSplitsPage';
import LeaderboardPage from '../components/LeaderboardPage';
import { setSplitVisibility, reapplySplit as reapplySplitApi, getRanking } from '../api/index';
import { X, Trophy, ArrowRight, RotateCcw, Upload } from 'lucide-react';
import AiChatBubble from '../components/AiChatBubble';

const API = import.meta.env.VITE_API_URL || '';
const SHOW_AI_CHAT = false; // archived: unused feature, flip to re-enable

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
function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function formatSplitAsText(split) {
  const sortedDays = [...(split.days || [])].sort((a, b) => (a.dayOrder ?? 8) - (b.dayOrder ?? 8));
  let text = `🏋️ ${split.name}\n\n`;
  
  sortedDays.forEach((day, idx) => {
    text += `DAY ${idx + 1}: ${day.name.toUpperCase()}${day.tag ? ` (${day.tag})` : ''}\n`;
    if (day.isRest) {
      text += `• Rest Day\n\n`;
      return;
    }
    const exercises = day.exercises || [];
    if (exercises.length === 0) {
      text += `• No exercises\n\n`;
      return;
    }
    exercises.forEach((ex) => {
      const rStr = ex.duration > 0 ? `${ex.duration}${ex.durationUnit || 'sec'}` : (ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Failure' : `${ex.reps} reps`;
      const wStr = ex.weight > 0 ? ` @ ${ex.weight} ${ex.weightUnit || 'kg'}` : '';
      const catPrefix = ex.category === 'warmup' ? '[Warm-up] ' : ex.category === 'cooldown' ? '[Cool-down] ' : '';
      text += `• ${catPrefix}${ex.name} — ${ex.sets} sets × ${rStr}${wStr}\n`;
    });
    text += `\n`;
  });
  return text.trim();
}
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
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

const SPLIT_STYLES = [
  { key: 'full-body', label: 'Full Body', minDays: 1, maxDays: 3, pattern: ['Full Body'] },
  { key: 'upper-lower', label: 'Upper/Lower', minDays: 2, maxDays: 4, pattern: ['Upper', 'Lower'] },
  { key: 'push-pull-legs', label: 'Push/Pull/Legs', minDays: 3, maxDays: 6, pattern: ['Push', 'Pull', 'Legs'] },
  { key: 'bro-split', label: 'Bro Split', minDays: 5, maxDays: 5, pattern: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'] },
];

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Maps (days per week, style) -> an ordered list of day skeletons, spreading
// rest days as evenly as a simple rounding placement allows across the week.
// Each day is named after its actual weekday (not the style label) — dayOrder
// is derived purely from the literal name server/local-side (DAY_ORDER_MAP),
// so only "Monday".."Sunday" get correctly weekday-anchored ordering; the
// style label (e.g. "Push") goes in `tag` instead, exactly like a day a user
// builds by hand via AddDayModal (weekday pill + focus tag).
function generateDaySkeleton(daysPerWeek, styleKey) {
  const style = SPLIT_STYLES.find((s) => s.key === styleKey);
  if (!style) return [];
  const restCount = 7 - daysPerWeek;

  const restIndices = new Set();
  for (let r = 0; r < restCount; r++) {
    restIndices.add(Math.round((r + 0.5) * 7 / restCount));
  }
  for (let i = 0; i < 7 && restIndices.size < restCount; i++) {
    if (!restIndices.has(i)) restIndices.add(i);
  }

  let trainIdx = 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    if (restIndices.has(i)) {
      days.push({ name: WEEKDAY_NAMES[i], tag: '', isRest: true });
    } else {
      days.push({ name: WEEKDAY_NAMES[i], tag: style.pattern[trainIdx % style.pattern.length], isRest: false });
      trainIdx++;
    }
  }
  return days;
}

function NewSplitModal({ onConfirm, onClose, onBrowse }) {
  const [name, setName] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(null); // null = not chosen, 0 = "I'll set up days myself"
  const [style, setStyle] = useState(null);

  const availableStyles = daysPerWeek
    ? SPLIT_STYLES.filter((s) => daysPerWeek >= s.minDays && daysPerWeek <= s.maxDays)
    : [];

  function pickDaysPerWeek(n) {
    setDaysPerWeek(n);
    setStyle(null);
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const skeleton = daysPerWeek && style ? generateDaySkeleton(daysPerWeek, style) : [];
    onConfirm(name.trim(), skeleton);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Split</div>
        <form onSubmit={submit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Split name…" autoFocus />

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>
            Training days per week
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pickDaysPerWeek(n)}
                style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: `1px solid ${daysPerWeek === n ? 'var(--accent)' : 'var(--border2)'}`,
                  background: daysPerWeek === n ? 'rgba(232,255,90,0.12)' : 'transparent',
                  color: daysPerWeek === n ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pickDaysPerWeek(0)}
              style={{
                padding: '0 12px', height: 36, borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${daysPerWeek === 0 ? 'var(--accent)' : 'var(--border2)'}`,
                background: daysPerWeek === 0 ? 'rgba(232,255,90,0.12)' : 'transparent',
                color: daysPerWeek === 0 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
              }}
            >
              I'll set up days myself
            </button>
          </div>

          {!!daysPerWeek && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>
                Split style
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableStyles.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStyle(s.key)}
                    style={{
                      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      border: `1px solid ${style === s.key ? 'var(--accent)' : 'var(--border2)'}`,
                      background: style === s.key ? 'rgba(232,255,90,0.12)' : 'transparent',
                      color: style === s.key ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onBrowse}>
              Or browse a ready-made split
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Create</button>
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

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Diffs two `days` arrays by day name / exercise name (order-independent) so a version's
// changes read as "what would restoring this undo", not a raw structural comparison.
function diffSplitDays(fromDays = [], toDays = []) {
  const fromExByName = new Map();
  (fromDays || []).forEach((d) => (d.exercises || []).forEach((e) => fromExByName.set(e.name?.trim().toLowerCase(), { ex: e, dayName: d.name })));
  const toExByName = new Map();
  (toDays || []).forEach((d) => (d.exercises || []).forEach((e) => toExByName.set(e.name?.trim().toLowerCase(), { ex: e, dayName: d.name })));

  const added = [];
  const removed = [];
  const changed = [];
  const FIELDS = [
    { key: 'weight', label: 'Weight' },
    { key: 'sets', label: 'Sets' },
    { key: 'reps', label: 'Reps' },
    { key: 'category', label: 'Category' },
  ];

  toExByName.forEach((entry, key) => {
    if (!fromExByName.has(key)) added.push(entry);
  });
  fromExByName.forEach((entry, key) => {
    if (!toExByName.has(key)) removed.push(entry);
  });
  fromExByName.forEach((fromEntry, key) => {
    const toEntry = toExByName.get(key);
    if (!toEntry) return;
    const fieldChanges = FIELDS
      .filter((f) => (fromEntry.ex[f.key] ?? '') !== (toEntry.ex[f.key] ?? ''))
      .map((f) => ({ label: f.label, from: fromEntry.ex[f.key], to: toEntry.ex[f.key] }));
    if (fieldChanges.length > 0) changed.push({ name: toEntry.ex.name, dayName: toEntry.dayName, fieldChanges });
  });

  const fromDayNames = new Set((fromDays || []).map((d) => d.name));
  const toDayNames = new Set((toDays || []).map((d) => d.name));
  const addedDays = [...toDayNames].filter((n) => !fromDayNames.has(n));
  const removedDays = [...fromDayNames].filter((n) => !toDayNames.has(n));

  return { added, removed, changed, addedDays, removedDays };
}

function VersionDiff({
  diff,
  emptyLabel = 'No differences from the current split.',
  dayAddedLabel = 'Day added since',
  dayRemovedLabel = 'Day removed since',
  addedLabel = 'Added since',
  removedLabel = 'Removed since',
}) {
  const { added, removed, changed, addedDays, removedDays } = diff;
  const nothingChanged = !added.length && !removed.length && !changed.length && !addedDays.length && !removedDays.length;
  return (
    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg3)', fontSize: 12 }}>
      {nothingChanged && <div style={{ color: 'var(--text3)' }}>{emptyLabel}</div>}
      {addedDays.map((n) => <div key={`ad-${n}`} style={{ color: 'var(--green)' }}>+ {dayAddedLabel}: {n}</div>)}
      {removedDays.map((n) => <div key={`rd-${n}`} style={{ color: 'var(--red)' }}>− {dayRemovedLabel}: {n}</div>)}
      {added.map(({ ex, dayName }) => (
        <div key={`a-${ex.name}`} style={{ color: 'var(--green)' }}>+ {addedLabel}: {ex.name} ({dayName})</div>
      ))}
      {removed.map(({ ex, dayName }) => (
        <div key={`r-${ex.name}`} style={{ color: 'var(--red)' }}>− {removedLabel}: {ex.name} ({dayName})</div>
      ))}
      {changed.map((c) => (
        <div key={`c-${c.name}`} style={{ color: 'var(--text2)', marginTop: 2 }}>
          <strong style={{ color: 'var(--text)' }}>{c.name}</strong> ({c.dayName}):{' '}
          {c.fieldChanges.map((fc, i) => (
            <span key={fc.label}>
              {i > 0 ? ', ' : ''}{fc.label} {fc.from ?? '—'} → {fc.to ?? '—'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function SplitCompareModal({ splits, initialLeftId, onClose }) {
  const activeSplit = splits.find((s) => s.isActive);
  const defaultRight = (activeSplit && activeSplit._id !== initialLeftId)
    ? activeSplit._id
    : splits.find((s) => s._id !== initialLeftId)?._id || splits[1]?._id;

  const [leftId, setLeftId] = useState(initialLeftId || splits[0]?._id);
  const [rightId, setRightId] = useState(defaultRight);

  const left = splits.find((s) => s._id === leftId);
  const right = splits.find((s) => s._id === rightId);
  const diff = left && right ? diffSplitDays(left.days, right.days) : null;

  function summaryLine(split) {
    const dayCount = split.days?.length || 0;
    const exerciseCount = (split.days || []).reduce((sum, d) => sum + (d.exercises?.length || 0), 0);
    return `${split.name} — ${dayCount} day${dayCount === 1 ? '' : 's'} · ${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`;
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-title" style={{ fontSize: 16 }}>Compare Splits</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <select value={leftId || ''} onChange={(e) => setLeftId(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13 }}>
            {splits.filter((s) => s._id !== rightId).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={rightId || ''} onChange={(e) => setRightId(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13 }}>
            {splits.filter((s) => s._id !== leftId).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        {left && right && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
            <div>{summaryLine(left)}</div>
            <div>{summaryLine(right)}</div>
          </div>
        )}
        {diff && (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <VersionDiff
              diff={diff}
              emptyLabel="No differences between these splits."
              dayAddedLabel={`Only in "${right.name}"`}
              dayRemovedLabel={`Only in "${left.name}"`}
              addedLabel={`Only in "${right.name}"`}
              removedLabel={`Only in "${left.name}"`}
            />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SplitHistoryModal({ split, onRevert, isReverting, onClose }) {
  const { storage } = useStorage();
  const [expandedId, setExpandedId] = useState(null);
  const { data: versions, isLoading } = useQuery({
    queryKey: ['splitVersions', split._id],
    queryFn: () => storage.getSplitVersions(split._id),
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title" style={{ fontSize: 16 }}>Version History — {split.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
          Every edit is snapshotted automatically. Restore any past version below.
        </div>
        {isLoading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div>}
        {!isLoading && (!versions || versions.length === 0) && (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>No past versions yet — edits will start appearing here.</div>
        )}
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(versions || []).map((v) => {
            const expanded = expandedId === v._id;
            return (
              <div
                key={v._id}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{timeAgo(v.createdAt)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {v.dayCount} day{v.dayCount === 1 ? '' : 's'} · {v.exerciseCount} exercise{v.exerciseCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      onClick={() => setExpandedId(expanded ? null : v._id)}
                    >
                      {expanded ? 'Hide' : 'View changes'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                      disabled={isReverting}
                      onClick={() => onRevert(v._id)}
                    >
                      Restore
                    </button>
                  </div>
                </div>
                {expanded && <VersionDiff diff={diffSplitDays(v.days, split.days)} />}
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
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
  const [editingSplitId, setEditingSplitId] = useState(null);
  const [browsing, setBrowsing] = useState(false);
  const [viewingRanking, setViewingRanking] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState({ top: 0, right: 0, maxHeight: 400 });

  function openMenu(e, splitId) {
    const rect = e.currentTarget.getBoundingClientRect();
    const margin = 12;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;
    setMenuAnchor({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      right: window.innerWidth - rect.right,
      maxHeight: Math.max(160, (openUpward ? spaceAbove : spaceBelow) - 6),
    });
    setMenuOpenId(splitId);
  }
  const [signingIn, setSigningIn] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [compareModal, setCompareModal] = useState(false);
  const importInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const signInTimer = useRef(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleCopySplit(split) {
    const text = formatSplitAsText(split);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Split copied to clipboard as text!');
      }).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  }

  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Split copied to clipboard as text!');
    } catch {
      showToast('Failed to copy split', 'error');
    }
    document.body.removeChild(textArea);
  }

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['splits', storageKey],
    queryFn: storage.getSplits,
  });

  const { data: ranking = [] } = useQuery({
    queryKey: ['ranking', 'weekly_widget'],
    queryFn: () => getRanking('weekly'),
    enabled: isLoggedIn,
    staleTime: 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['splits'] });

  const [expandedSplitId, setExpandedSplitId] = useState(null);
  const [expandedDayIds, setExpandedDayIds] = useState(new Set());
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
    setExpandedSplitId((prev) => (prev === splitId ? null : splitId));
  }

  function toggleExpandDay(dayId) {
    setExpandedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
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
        const exList = (d.exercises || []).map(e => {
          const rStr = e.duration > 0 ? `${e.duration}${e.durationUnit || 'sec'}` : (e.untilFailure || !e.reps || e.reps === 0) ? 'Failure' : `${e.reps}`;
          return `${e.name} (${e.sets}x${rStr}${e.weight > 0 ? ` @ ${e.weight}${e.weightUnit}` : ''})`;
        }).join(', ');
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

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }) => setSplitVisibility(id, isPublic),
    onSuccess: invalidate,
  });
  const reapplyMutation = useMutation({
    mutationFn: (id) => reapplySplitApi(id),
    onSuccess: () => { invalidate(); showToast('Split updated from source!'); },
    onError: (err) => showToast(err.message || 'Reapply failed', 'error'),
  });
  const duplicateMutation = useMutation({
    mutationFn: (id) => storage.duplicateSplit(id),
    onSuccess: () => { invalidate(); showToast('Split duplicated!'); },
    onError: (err) => showToast(err.message || 'Duplicate failed', 'error'),
  });
  const revertMutation = useMutation({
    mutationFn: ({ id, versionId }) => storage.revertSplitVersion(id, versionId),
    onSuccess: () => { invalidate(); showToast('Split reverted!'); setHistoryModal(null); },
    onError: (err) => showToast(err.message || 'Revert failed', 'error'),
  });
  const importMutation = useMutation({
    mutationFn: (data) => storage.importSplit(data),
    onSuccess: () => { invalidate(); showToast('Split imported!'); },
    onError: (err) => showToast(err.message || 'Import failed', 'error'),
  });

  function handleExportSplit(split) {
    const payload = {
      name: split.name,
      days: (split.days || []).map((d) => ({
        name: d.name, tag: d.tag, isRest: d.isRest,
        exercises: (d.exercises || []).map((e) => ({
          name: e.name, sets: e.sets, reps: e.reps, untilFailure: e.untilFailure,
          weight: e.weight, weightUnit: e.weightUnit, muscleTargets: e.muscleTargets,
          category: e.category, notes: e.notes, duration: e.duration, durationUnit: e.durationUnit,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${split.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.name || !Array.isArray(data.days)) throw new Error('Invalid split file');
        importMutation.mutate(data);
      } catch (err) {
        showToast(err.message || 'Could not read that file', 'error');
      }
    };
    reader.readAsText(file);
  }

  async function handleActivate(split) {
    if (split.isActive || actionLoading) return;
    setActionLoading(split._id);
    try { await activateMutation.mutateAsync(split._id); }
    finally { setActionLoading(null); }
  }
  async function handleCreate(name, daySkeleton = []) {
    setModal(null);
    const split = await createMutation.mutateAsync(name);
    for (const day of daySkeleton) {
      await storage.createDay(split._id, day);
    }
    if (daySkeleton.length > 0) invalidate();
  }
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

  if (editingSplitId) {
    return <SplitEditor splitId={editingSplitId} onBack={() => setEditingSplitId(null)} />;
  }

  if (browsing) {
    return <BrowseSplitsPage onBack={() => setBrowsing(false)} />;
  }

  if (viewingRanking) {
    return <LeaderboardPage onBack={() => setViewingRanking(false)} />;
  }

  return (
    <div>
      {/* Generic toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 76, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg2)', border: `1px solid ${toast.type === 'error' ? 'var(--red)' : 'var(--accent)'}`,
          color: 'var(--text)', padding: '8px 14px', borderRadius: 20,
          fontSize: 12, fontWeight: 600, zIndex: 400, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 7,
          animation: 'fadeIn 0.15s ease',
        }}>
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={14} /></button>
        </div>
      )}

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
          <button onClick={() => setSignInFailed(false)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      {/* Override the global 80px right padding — auth lives inside this header */}
      <div className="page-header" style={{ padding: '24px 20px 16px' }}>
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

          {/* Browse community splits */}
          <button
            onClick={() => isLoggedIn ? setBrowsing(true) : handleSignIn()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text2)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              fontFamily: 'var(--font-display)', textTransform: 'uppercase',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
            }}
            title="Browse community splits"
          >
            <ShopIcon />
            <span>Browse</span>
          </button>

          {/* Import a split exported as JSON */}
          <button
            onClick={() => importInputRef.current?.click()}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px 8px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text2)', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            title="Import a split from a JSON file"
          >
            <Upload size={13} />
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />

          {/* Primary action: always accent, always prominent */}
          <button className="btn btn-accent" onClick={() => setModal({ type: 'add' })}>
            <PlusIcon /> New
          </button>
        </div>
      </div>

      {/* Leaderboard Widget */}
      <div style={{ padding: '20px 16px 0' }}>
        <div 
          onClick={() => isLoggedIn ? setViewingRanking(true) : handleSignIn()}
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg2)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isLoggedIn && ranking.length > 0 ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={14} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Active Leaderboard</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isLoggedIn ? 'View Standings' : 'Sign in to join'} <ArrowRight size={12} />
            </span>
          </div>

          {isLoggedIn && ranking && ranking.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.slice(0, 3).map((row, idx) => (
                <div key={row.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    width: 18, height: 18, borderRadius: 4, 
                    background: idx === 0 ? 'rgba(255,215,0,0.15)' : idx === 1 ? 'rgba(192,192,192,0.15)' : 'rgba(205,127,50,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: 9, fontWeight: 900, color: idx === 0 ? '#ffd700' : idx === 1 ? '#e0e0e0' : '#cd7f32',
                    border: `1px solid ${idx === 0 ? 'rgba(255,215,0,0.3)' : idx === 1 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)'}`
                  }}>
                    {idx + 1}
                  </div>
                  
                  {row.avatar ? (
                    <img src={row.avatar} alt={row.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'var(--text2)', border: '1px solid var(--border)' }}>
                      {row.name[0].toUpperCase()}
                    </div>
                  )}

                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
                  
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {row.workoutCount} workout{row.workoutCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="spinner" />
      ) : splits.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>No splits yet.<br />Create your own training split or browse community programs to get started.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-accent" style={{ fontSize: 12, padding: '8px 14px', gap: 6 }} onClick={() => setModal({ type: 'add' })}>
              <PlusIcon /> New Split
            </button>
            <button className="btn" style={{ fontSize: 12, padding: '8px 14px', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', gap: 6 }} onClick={() => isLoggedIn ? setBrowsing(true) : handleSignIn()}>
              <ShopIcon /> Browse Community
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {splits.map((split) => {
            const isExpanded = expandedSplitId === split._id;
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
                {/* Header Row */}
                <div
                  onClick={() => toggleExpandSplit(split._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  {/* Activate radio */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleActivate(split); }}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${split.isActive ? 'var(--accent)' : 'var(--border2)'}`,
                      background: split.isActive ? 'var(--accent)' : 'transparent',
                      cursor: split.isActive ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}
                  >
                    {split.isActive && <CheckIcon />}
                  </button>

                  {/* Name + meta — gets all remaining space */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.01em',
                      color: split.isActive ? 'var(--accent)' : 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {split.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 6px' }}>
                      <span>{split.days?.length || 0} days</span>
                      {split.isActive && (
                        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>● Active</span>
                      )}
                      {split.isPublic && (
                        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <GlobeIcon /> Public
                        </span>
                      )}
                      {split.sourceId && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--text3)', fontSize: 10 }}><RotateCcw size={9} /> community</span>
                      )}
                    </div>
                  </div>

                  {/* Right controls: ⋯ menu + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-icon"
                      onClick={(e) => openMenu(e, split._id)}
                      style={{ color: 'var(--text3)', padding: '6px 8px', fontSize: 18, lineHeight: 1, letterSpacing: '0.05em' }}
                      title="More actions"
                    >
                      ···
                    </button>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
                      <polyline points="4,6 8,10 12,6" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopySplit(split); }}
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: '4px 10px', gap: 5, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <CopyIcon /> Copy as Text
                      </button>
                    </div>
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
                                {(expandedDayIds.has(day._id) ? (day.exercises || []) : (day.exercises || []).slice(0, 6)).map((ex, idx) => {
                                  let prefix = "";
                                  let nameStyle = { color: 'var(--text)' };
                                  if (ex.category === 'warmup') {
                                    prefix = "[WU] ";
                                    nameStyle.color = '#ff9f43';
                                  } else if (ex.category === 'cooldown') {
                                    prefix = "[CD] ";
                                    nameStyle.color = 'var(--blue)';
                                  }
                                  return (
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
                                      <span style={nameStyle}>{prefix}{idx + 1}. {ex.name}</span>
                                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontSize: 12 }}>
                                        {ex.sets}×{ex.duration > 0 ? `${ex.duration}${ex.durationUnit || 'sec'}` : (ex.untilFailure || !ex.reps || ex.reps === 0) ? 'Failure' : ex.reps}{ex.weight > 0 ? ` @ ${ex.weight}${ex.weightUnit}` : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                                {(day.exercises || []).length === 0 && (
                                  <div style={{ color: 'var(--text3)', fontSize: 12, fontStyle: 'italic' }}>No exercises in this day</div>
                                )}
                                {!expandedDayIds.has(day._id) && (day.exercises || []).length > 6 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpandDay(day._id); }}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: '4px 0', marginTop: 2, alignSelf: 'flex-start' }}
                                  >
                                    Show {(day.exercises || []).length - 6} more
                                  </button>
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

      {/* ── Floating AI Chat Bubble ── archived (unused): flip to re-enable ── */}
      {SHOW_AI_CHAT && (
      <AiChatBubble
        title="AI Split Advisor"
        messages={chatHistory}
        loadingAi={loadingAi}
        inputText={inputText}
        onInputChange={setInputText}
        onSend={handleSendAdvisorReply}
        onRestart={() => {
          const welcome = [{ sender: 'coach', text: "### AI Split Advisor\nWelcome! I can help you analyze your training splits, balance your workload, schedule rest days, or recommend alternative programs.\n\nHere are some things you can ask me:\n- **Is my split too much volume?**\n- **What's a better alternative for my split?**\n- **What do others usually do for this type of split?**\n- **How should I program rest days?**" }];
          setChatHistory(welcome);
          localStorage.setItem('ai_splits_chat_history', JSON.stringify(welcome));
        }}
        quickReplies={[
          { label: 'Critique active split', prompt: 'Critique my active split' },
          { label: 'Better split?', prompt: 'What is a better alternative for my split?' },
          { label: 'Program rest?', prompt: 'How should I program rest days?' },
          { label: 'Popular splits', prompt: 'What are the most popular training splits?' },
        ]}
        apiKey={apiKey}
        onApiKeyChange={(val) => {
          setApiKey(val);
          if (val.trim()) localStorage.setItem('user_gemini_api_key', val.trim());
          else localStorage.removeItem('user_gemini_api_key');
        }}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        messagesEndRef={messagesEndRef}
        open={showAiChat}
        onToggle={() => setShowAiChat((v) => !v)}
      />
      )}

      {modal?.type === 'add' && (
        <NewSplitModal
          onConfirm={handleCreate}
          onClose={() => setModal(null)}
          onBrowse={() => { setModal(null); isLoggedIn ? setBrowsing(true) : handleSignIn(); }}
        />
      )}
      {modal?.type === 'rename' && <SplitModal title="Rename Split" initial={modal.split.name} onConfirm={handleRename} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && (() => {
        const dayCount = modal.split.days?.length || 0;
        const exerciseCount = (modal.split.days || []).reduce((sum, d) => sum + (d.exercises?.length || 0), 0);
        return (
          <ConfirmModal
            message={`Delete "${modal.split.name}"? This will permanently remove ${dayCount} day${dayCount === 1 ? '' : 's'} and ${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}. This cannot be undone.`}
            onConfirm={handleDelete}
            onClose={() => setModal(null)}
          />
        );
      })()}
      {shareModal && <SplitShareModal split={shareModal} onClose={() => setShareModal(null)} />}
      {historyModal && (
        <SplitHistoryModal
          split={historyModal}
          isReverting={revertMutation.isPending}
          onRevert={(versionId) => revertMutation.mutate({ id: historyModal._id, versionId })}
          onClose={() => setHistoryModal(null)}
        />
      )}
      {compareModal && (
        <SplitCompareModal
          splits={splits}
          initialLeftId={compareModal}
          onClose={() => setCompareModal(false)}
        />
      )}

      {/* ── Portal dropdown — escapes overflow:hidden on split cards ── */}
      {menuOpenId && (() => {
        const s = splits.find((x) => x._id === menuOpenId);
        if (!s) return null;
        return createPortal(
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpenId(null)} />
            <div style={{
              position: 'fixed', top: menuAnchor.top, bottom: menuAnchor.bottom, right: menuAnchor.right, zIndex: 200,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, overflowY: 'auto', overflowX: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 210, maxHeight: menuAnchor.maxHeight,
              animation: 'fadeIn 0.12s ease',
            }}>
              {/* ── Manage ── */}
              <div style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Manage
              </div>

              {isLoggedIn && (
                <button
                  onClick={() => { visibilityMutation.mutate({ id: s._id, isPublic: !s.isPublic }); setMenuOpenId(null); }}
                  disabled={visibilityMutation.isPending}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ color: s.isPublic ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }}>
                      {s.isPublic ? <GlobeIcon /> : <LockIcon />}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {s.isPublic ? 'Public' : 'Private'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {s.isPublic ? 'Visible in Browse' : 'Only you can see this'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                    background: s.isPublic ? 'var(--accent)' : 'var(--bg3)',
                    border: `1px solid ${s.isPublic ? 'var(--accent)' : 'var(--border2)'}`,
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2,
                      left: s.isPublic ? 18 : 2,
                      width: 14, height: 14, borderRadius: '50%',
                      background: s.isPublic ? '#0a0a0a' : 'var(--text3)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </button>
              )}

              {isLoggedIn && s.sourceId && (
                <button
                  onClick={() => { reapplyMutation.mutate(s._id); setMenuOpenId(null); }}
                  disabled={reapplyMutation.isPending}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                  </svg>
                  Re-apply from source
                </button>
              )}

              <button
                onClick={() => { setEditingSplitId(s._id); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                </svg>
                Edit Days
              </button>

              <button
                onClick={() => { setModal({ type: 'rename', split: s }); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-3 .76.76-3L11.5 2.5Z" />
                </svg>
                Rename
              </button>

              <button
                onClick={() => { duplicateMutation.mutate(s._id); setMenuOpenId(null); }}
                disabled={duplicateMutation.isPending}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Duplicate
              </button>

              {/* ── Share & Export ── */}
              <div style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>
                Share &amp; Export
              </div>

              <button
                onClick={() => { setShareModal(s); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <ShareIcon />
                Share Card
              </button>

              <button
                onClick={() => { handleCopySplit(s); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <CopyIcon />
                Copy as Text
              </button>

              <button
                onClick={() => { handleExportSplit(s); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export as JSON
              </button>

              {/* ── History ── */}
              <div style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid var(--border)' }}>
                History
              </div>

              <button
                onClick={() => { setHistoryModal(s); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
                </svg>
                Version History
              </button>

              {splits.length > 1 && (
                <button
                  onClick={() => { setCompareModal(s._id); setMenuOpenId(null); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" /><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><line x1="12" y1="3" x2="12" y2="21" />
                  </svg>
                  Compare
                </button>
              )}

              {/* ── Danger Zone ── */}
              <div style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                Danger Zone
              </div>

              <button
                onClick={() => { setModal({ type: 'delete', split: s }); setMenuOpenId(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px 13px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--red)', fontSize: 13, fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,4 14,4" /><path d="M5 4V2h6v2" /><path d="M3 4l1 10h8l1-10" />
                </svg>
                Delete
              </button>
            </div>
          </>,
          document.body
        );
      })()}
    </div>
  );
}
