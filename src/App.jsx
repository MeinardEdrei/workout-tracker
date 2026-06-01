import { useState } from 'react';
import './index.css';
import TodayPage from './pages/TodayPage';
import SplitsPage from './pages/SplitsPage';
import EditPage from './pages/EditPage';
import StatsPage from './pages/StatsPage';

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'splits', label: 'Splits' },
  { id: 'stats', label: 'Stats' },
  { id: 'edit', label: 'Edit' },
];

function TodayIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SplitsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
    </svg>
  );
}

function StatsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function EditIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}

const ICONS = { today: TodayIcon, splits: SplitsIcon, stats: StatsIcon, edit: EditIcon };

export default function App() {
  const [tab, setTab] = useState('today');

  return (
    <>
      <div className="page">
        {tab === 'today' && <TodayPage />}
        {tab === 'splits' && <SplitsPage />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'edit' && <EditPage />}
      </div>
      <nav className="bottom-nav">
        {NAV.map((n) => {
          const Icon = ICONS[n.id];
          const active = tab === n.id;
          return (
            <button key={n.id} className={`nav-btn ${active ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <Icon active={active} />
              {n.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
