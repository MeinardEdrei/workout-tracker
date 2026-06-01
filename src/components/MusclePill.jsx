export const MUSCLE_COLORS = {
  Chest:       { bg: 'rgba(91,141,245,0.18)',  text: '#7da3f7' },
  Back:        { bg: 'rgba(76,175,125,0.18)',  text: '#5cc990' },
  Shoulders:   { bg: 'rgba(155,111,212,0.18)', text: '#b088e8' },
  Biceps:      { bg: 'rgba(232,132,74,0.18)',  text: '#f09a5e' },
  Triceps:     { bg: 'rgba(232,132,74,0.18)',  text: '#f09a5e' },
  Forearms:    { bg: 'rgba(232,132,74,0.18)',  text: '#f09a5e' },
  Quads:       { bg: 'rgba(232,84,84,0.18)',   text: '#f07575' },
  Hamstrings:  { bg: 'rgba(232,84,84,0.18)',   text: '#f07575' },
  Glutes:      { bg: 'rgba(232,84,84,0.18)',   text: '#f07575' },
  Calves:      { bg: 'rgba(232,84,84,0.18)',   text: '#f07575' },
  Core:        { bg: 'rgba(201,162,39,0.18)',  text: '#d9b84e' },
  'Full Body': { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' },
  Cardio:      { bg: 'rgba(140,140,140,0.18)', text: '#a0a0a0' },
};

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
