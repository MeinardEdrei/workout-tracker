export const MUSCLE_COLORS = {
  // Chest
  'Chest':         { bg: 'rgba(91,141,245,0.18)',  text: '#7da3f7' },
  'Upper Chest':   { bg: 'rgba(91,141,245,0.14)',  text: '#6b94f5' },
  // Back
  'Upper Back':    { bg: 'rgba(76,175,125,0.18)',  text: '#5cc990' },
  'Lats':          { bg: 'rgba(56,160,110,0.18)',  text: '#4db87e' },
  'Lower Back':    { bg: 'rgba(40,140,90,0.18)',   text: '#3dab72' },
  // Shoulders
  'Front Delts':   { bg: 'rgba(155,111,212,0.18)', text: '#b088e8' },
  'Side Delts':    { bg: 'rgba(140,90,200,0.18)',  text: '#a070d8' },
  'Rear Delts':    { bg: 'rgba(120,75,185,0.18)',  text: '#9060c8' },
  // Arms
  'Biceps':        { bg: 'rgba(232,132,74,0.18)',  text: '#f09a5e' },
  'Triceps':       { bg: 'rgba(215,110,60,0.18)',  text: '#e8855a' },
  'Forearms':      { bg: 'rgba(200,100,55,0.18)',  text: '#d87050' },
  // Legs
  'Quads':         { bg: 'rgba(232,84,84,0.18)',   text: '#f07575' },
  'Hamstrings':    { bg: 'rgba(210,65,65,0.18)',   text: '#e06060' },
  'Glutes':        { bg: 'rgba(225,80,120,0.18)',  text: '#e8708a' },
  'Calves':        { bg: 'rgba(190,60,60,0.18)',   text: '#d05555' },
  'Hip Flexors':   { bg: 'rgba(215,70,90,0.18)',   text: '#d86070' },
  // Core
  'Abs':           { bg: 'rgba(201,162,39,0.18)',  text: '#d9b84e' },
  'Obliques':      { bg: 'rgba(185,145,30,0.18)',  text: '#c9a840' },
  'Core':          { bg: 'rgba(215,175,45,0.18)',  text: '#e8c850' },
  // Other
  'Full Body':     { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' },
  'Cardio':        { bg: 'rgba(120,120,120,0.18)', text: '#909090' },
};

export const MUSCLE_GROUPS = [
  { label: 'Chest',     muscles: ['Chest', 'Upper Chest'] },
  { label: 'Back',      muscles: ['Upper Back', 'Lats', 'Lower Back'] },
  { label: 'Shoulders', muscles: ['Front Delts', 'Side Delts', 'Rear Delts'] },
  { label: 'Arms',      muscles: ['Biceps', 'Triceps', 'Forearms'] },
  { label: 'Legs',      muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors'] },
  { label: 'Core',      muscles: ['Abs', 'Obliques', 'Core'] },
  { label: 'Other',     muscles: ['Full Body', 'Cardio'] },
];

export function MusclePill({ target }) {
  const c = MUSCLE_COLORS[target] || { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 10,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.04em',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.text}40`,
      lineHeight: 1.6,
      whiteSpace: 'nowrap',
    }}>
      {target}
    </span>
  );
}
