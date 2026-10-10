import { useState } from 'react';
import { Check } from 'lucide-react';
import RepeatButton from './RepeatButton';
import { PLATE_SETS, BAR_OPTIONS, plateColor, platesPerSide, loadPlatePrefs, savePlatePrefs } from '../utils/plates';

const label = { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.12em', textTransform: 'uppercase' };
const stepBtn = { width: 56, height: 56, borderRadius: 28, background: 'var(--bg3)', border: 'none', color: 'var(--text)', fontSize: 'var(--fs-md)', fontWeight: 700, cursor: 'pointer' };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

// Plates per side for a target barbell weight, with the bar and the plates
// your gym has (remembered per unit). Used on the Calc page and in a sheet
// from the set logger.
export default function PlateCalculator({ initialWeight = 0, unit = 'kg', compact = false }) {
  const [target, setTarget] = useState(String(initialWeight || ''));
  const [prefs, setPrefs] = useState(() => loadPlatePrefs(unit));
  const step = unit === 'lbs' ? 5 : 2.5;
  const update = (next) => { setPrefs(next); savePlatePrefs(unit, next); };
  const togglePlate = (p) => update({ ...prefs, available: prefs.available.includes(p) ? prefs.available.filter((x) => x !== p) : [...prefs.available, p] });

  const t = Math.max(0, parseFloat(target) || 0);
  const { plates, remainder, loaded } = platesPerSide(t, prefs.bar, prefs.available);
  const belowBar = t > 0 && t < prefs.bar;

  // Bar drawing: one sleeve, plates from the collar outward, heights by size.
  const maxPlate = PLATE_SETS[unit][0];
  let x = 132;
  const shapes = plates.map((p, i) => {
    const h = 34 + (p / maxPlate) * 66;
    const w = p >= maxPlate * 0.4 ? 20 : p >= maxPlate * 0.1 ? 12 : 8;
    const shape = <rect key={i} x={x} y={55 - h / 2} width={w} height={h} rx={Math.min(4, w / 2)} fill={plateColor(p, unit)} />;
    x += w + 2;
    return shape;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={label}>Target weight</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <RepeatButton aria-label={`Minus ${step} ${unit} (hold to repeat)`} style={stepBtn} onStep={() => setTarget((v) => fmt(Math.max(0, (parseFloat(v) || 0) - step)))}>−{step}</RepeatButton>
          <input aria-label={`Target weight in ${unit}`} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(',', '.'))} onFocus={(e) => e.target.select()}
            style={{ width: 150, textAlign: 'center', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 500, padding: 0 }} />
          <RepeatButton aria-label={`Plus ${step} ${unit} (hold to repeat)`} style={stepBtn} onStep={() => setTarget((v) => fmt((parseFloat(v) || 0) + step))}>+{step}</RepeatButton>
        </div>
      </div>

      <section style={{ background: 'var(--bg2)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <svg viewBox="0 0 330 110" role="img" aria-label={plates.length ? `Each side: ${plates.map(fmt).join(', ')} ${unit}` : 'Empty bar'} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <rect x="0" y="50" width="330" height="10" rx="3" fill="var(--iron)" />
          <rect x="118" y="38" width="12" height="34" rx="2" fill="var(--text2)" />
          {shapes}
          <text x="58" y="38" textAnchor="middle" fill="var(--text2)" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>BAR {prefs.bar}</text>
        </svg>
        {belowBar ? (
          <span style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 'var(--fs-md)' }}>Lighter than the bar ({prefs.bar} {unit})</span>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {plates.length === 0 && <span style={{ color: 'var(--text2)', fontSize: 'var(--fs-md)' }}>Just the bar</span>}
              {Object.entries(plates.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {})).sort((a, b) => b[0] - a[0]).map(([p, n]) => (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', borderRadius: 22, background: 'var(--bg3)', fontFamily: 'var(--font-mono)', fontSize: 17 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: plateColor(+p, unit) }} />{fmt(+p)}{n > 1 ? ` ×${n}` : ''}
                </span>
              ))}
            </div>
            <span style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 'var(--fs-md)' }}>
              Each side <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmt(plates.reduce((a, b) => a + b, 0))} {unit}</span>
              {remainder > 0 && <> · closest you can load is <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmt(loaded)}</span></>}
            </span>
          </>
        )}
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={label}>Bar</span>
        <div role="radiogroup" aria-label="Bar weight" style={{ display: 'grid', gridTemplateColumns: `repeat(${BAR_OPTIONS[unit].length}, minmax(0, 1fr))`, gap: 4, background: 'var(--bg2)', borderRadius: 14, padding: 4 }}>
          {BAR_OPTIONS[unit].map((b) => (
            <button key={b} type="button" role="radio" aria-checked={prefs.bar === b} onClick={() => update({ ...prefs, bar: b })}
              style={{ height: 40, borderRadius: 10, border: 'none', background: prefs.bar === b ? 'var(--accent)' : 'transparent', color: prefs.bar === b ? 'var(--on-accent)' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 15, cursor: 'pointer' }}>
              {b === 0 ? 'None' : b}
            </button>
          ))}
        </div>
        <span style={{ ...label, marginTop: 4 }}>Plates at my gym</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATE_SETS[unit].map((p) => {
            const on = prefs.available.includes(p);
            return (
              <button key={p} type="button" aria-pressed={on} onClick={() => togglePlate(p)}
                style={{ height: 44, padding: '0 14px', borderRadius: 22, border: 'none', background: on ? 'var(--bg3)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--bg4)', color: on ? 'var(--text)' : 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                {on && <Check size={14} strokeWidth={2.6} style={{ color: 'var(--green)' }} aria-hidden="true" />}{fmt(p)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
