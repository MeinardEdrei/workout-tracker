import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStorage } from '../hooks/useStorage';
import { useAuth } from '../context/AuthContext';
import SplitShareModal from '../components/SplitShareModal';
import SplitEditor from './EditPage';
import BrowseSplitsPage from './BrowseSplitsPage';
import LeaderboardPage from '../components/LeaderboardPage';
import { setSplitVisibility, reapplySplit as reapplySplitApi, getRanking } from '../api/index';
import { X, Trophy, ArrowRight, RotateCcw, Upload, MoreHorizontal, Share2, Copy, CopyPlus, CalendarDays, Pencil, History, Columns2, Download, Globe, Lock, Trash2, Check, Plus, ShoppingBag } from 'lucide-react';
import BottomSheet, { SheetRow, SheetTile } from '../components/BottomSheet';
import { formatSplitAsText, formatSplitWithHistory } from '../utils/splitText';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { useBackClose } from '../hooks/useBackClose';
import { SkeletonCards } from '../components/Skeleton';

const API = import.meta.env.VITE_API_URL || '';

function InlineSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, flexShrink: 0,
      border: '1.5px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.6s linear infinite',
    }} />
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
                  background: daysPerWeek === n ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
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
                background: daysPerWeek === 0 ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
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
                      background: style === s.key ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
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

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const { storage, storageKey } = useStorage();
  const { user, isLoggedIn, logout } = useAuth();
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingSplitId, setEditingSplitId] = useState(null);
  const [browsing, setBrowsing] = useState(false);
  const [viewingRanking, setViewingRanking] = useState(false);
  // Back gesture closes the editor / browse / leaderboard instead of leaving the app.
  useBackClose(!!editingSplitId, () => setEditingSplitId(null));
  useBackClose(browsing, () => setBrowsing(false));
  useBackClose(viewingRanking, () => setViewingRanking(false));
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [copyChoiceOpen, setCopyChoiceOpen] = useState(false);

  function openMenu(splitId) {
    setCopyChoiceOpen(false);
    setMenuOpenId(splitId);
  }
  const [signingIn, setSigningIn] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [compareModal, setCompareModal] = useState(false);
  const [copyHistoryModal, setCopyHistoryModal] = useState(null);
  const importInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const signInTimer = useRef(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleCopySplit(split) {
    copyText(formatSplitAsText(split), 'Split copied to clipboard as text!');
  }

  async function handleCopySplitWithHistory(split, weeks) {
    setCopyHistoryModal(null);
    try {
      const logs = await queryClient.fetchQuery({ queryKey: ['logs', storageKey], queryFn: storage.getLogs, staleTime: 2 * 60 * 1000 });
      copyText(formatSplitWithHistory(split, logs, { weeks }), 'Split + history copied to clipboard!');
    } catch {
      showToast('Could not load workout history', 'error');
    }
  }

  function copyText(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
      }).catch(() => {
        fallbackCopyTextToClipboard(text, successMessage);
      });
    } else {
      fallbackCopyTextToClipboard(text, successMessage);
    }
  }

  function fallbackCopyTextToClipboard(text, successMessage) {
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
      showToast(successMessage);
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
        <Toast tone={toast.type === 'error' ? 'error' : 'success'} onDismiss={() => setToast(null)}>{toast.message}</Toast>
      )}

      {/* Sign-in status toast */}
      {signingIn && (
        <Toast tone="loading">Opening Google Sign In…</Toast>
      )}

      {/* Sign-in timeout error toast */}
      {signInFailed && (
        <Toast tone="error" onDismiss={() => setSignInFailed(false)}>Sign in failed. Please try again.</Toast>
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
                    fontSize: 13, fontWeight: 800, color: 'var(--bg)',
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
            <ShoppingBag size={15} aria-hidden="true" />
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
            <Plus size={16} aria-hidden="true" /> New
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
        <SkeletonCards count={2} label="Loading splits" />
      ) : splits.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text2)', lineHeight: 1.5 }}>No splits yet.<br />Create your own training split or browse community programs to get started.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-accent" style={{ fontSize: 12, padding: '8px 14px', gap: 6 }} onClick={() => setModal({ type: 'add' })}>
              <Plus size={16} aria-hidden="true" /> New Split
            </button>
            <button className="btn" style={{ fontSize: 12, padding: '8px 14px', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', gap: 6 }} onClick={() => isLoggedIn ? setBrowsing(true) : handleSignIn()}>
              <ShoppingBag size={15} aria-hidden="true" /> Browse Community
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
                  background: split.isActive ? 'rgba(var(--accent-rgb), 0.04)' : 'var(--bg2)',
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
                    {split.isActive && <Check size={14} color="#121110" strokeWidth={3} aria-hidden="true" />}
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
                          <Globe size={15} aria-hidden="true" /> Public
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
                      onClick={() => openMenu(split._id)}
                      aria-label={`Actions for ${split.name}`}
                      title="More actions"
                      style={{ width: 44, height: 44, color: 'var(--text2)' }}
                    >
                      <MoreHorizontal size={20} />
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
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingSplitId(split._id); }}
                      className="btn btn-ghost"
                      style={{ width: '100%', minHeight: 48, marginBottom: 12, fontSize: 'var(--fs-md)' }}
                    >
                      <CalendarDays size={18} /> Edit days
                    </button>
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
                                <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(var(--accent-rgb), 0.08)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
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
                                    nameStyle.color = 'var(--yellow)';
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
      {copyHistoryModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCopyHistoryModal(null)}>
          <div className="modal">
            <div className="modal-title">Copy with History</div>
            <div style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 14 }}>
              Includes logged sets, reps, weights, swaps and skips for "{copyHistoryModal.name}".
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ weeks: 4, label: 'Last 4 weeks' }, { weeks: 8, label: 'Last 8 weeks' }, { weeks: null, label: 'All history' }].map((opt) => (
                <button
                  key={opt.label}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleCopySplitWithHistory(copyHistoryModal, opt.weeks)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCopyHistoryModal(null)}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {compareModal && (
        <SplitCompareModal
          splits={splits}
          initialLeftId={compareModal}
          onClose={() => setCompareModal(false)}
        />
      )}

      {/* ── Split action sheet ── */}
      {menuOpenId && (() => {
        const s = splits.find((x) => x._id === menuOpenId);
        if (!s) return null;
        const close = () => setMenuOpenId(null);
        const run = (fn) => () => { fn(); close(); };
        return (
          <BottomSheet title={s.name} onClose={close}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
              <SheetTile icon={Share2} label="Share" onClick={run(() => setShareModal(s))} />
              <SheetTile icon={Copy} label="Copy" active={copyChoiceOpen} onClick={() => setCopyChoiceOpen((v) => !v)} />
              <SheetTile icon={CopyPlus} label="Duplicate" onClick={run(() => duplicateMutation.mutate(s._id))} />
            </div>
            {copyChoiceOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ minHeight: 48 }} onClick={run(() => handleCopySplit(s))}>As text</button>
                <button type="button" className="btn btn-ghost" style={{ minHeight: 48 }} onClick={run(() => setCopyHistoryModal(s))}>With history</button>
              </div>
            )}
            <SheetRow icon={CalendarDays} label="Edit days" onClick={run(() => setEditingSplitId(s._id))} />
            <SheetRow icon={Pencil} label="Rename" onClick={run(() => setModal({ type: 'rename', split: s }))} />
            <SheetRow icon={History} label="Version history" onClick={run(() => setHistoryModal(s))} />
            {splits.length > 1 && <SheetRow icon={Columns2} label="Compare" onClick={run(() => setCompareModal(s._id))} />}
            <SheetRow icon={Download} label="Export JSON" onClick={run(() => handleExportSplit(s))} />
            {isLoggedIn && s.sourceId && (
              <SheetRow icon={RotateCcw} label="Re-apply from source" hint="Pull the latest version of the community split" disabled={reapplyMutation.isPending} onClick={run(() => reapplyMutation.mutate(s._id))} />
            )}
            {isLoggedIn && (
              <SheetRow
                icon={s.isPublic ? Globe : Lock}
                label="Public in Browse"
                hint={s.isPublic ? 'Visible to other lifters' : 'Only you can see this'}
                disabled={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate({ id: s._id, isPublic: !s.isPublic })}
                trailing={(
                  <span role="switch" aria-checked={!!s.isPublic} aria-label="Public in Browse" style={{ width: 52, height: 32, borderRadius: 16, padding: 3, flexShrink: 0, display: 'flex', justifyContent: s.isPublic ? 'flex-end' : 'flex-start', background: s.isPublic ? 'var(--green)' : 'var(--bg4)', transition: 'all 0.15s' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 13, background: s.isPublic ? 'var(--bg)' : 'var(--text2)' }} />
                  </span>
                )}
              />
            )}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <SheetRow icon={Trash2} label="Delete split" danger onClick={run(() => setModal({ type: 'delete', split: s }))} />
          </BottomSheet>
        );
      })()}
    </div>
  );
}
