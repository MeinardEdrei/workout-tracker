import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { convertWeight } from '../utils/weight';

export default function CalculatorPage() {
  const [kgVal, setKgVal] = useState('60');
  const [lbsVal, setLbsVal] = useState('132.3');
  const [refTab, setRefTab] = useState('plates'); // 'plates' or 'grid'
  const [kgFirst, setKgFirst] = useState(true);

  const handleKgChange = (val) => {
    setKgVal(val);
    if (val === '') {
      setLbsVal('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setLbsVal(convertWeight(num, 'kg', 'lbs').toFixed(1));
    } else {
      setLbsVal('');
    }
  };

  const handleLbsChange = (val) => {
    setLbsVal(val);
    if (val === '') {
      setKgVal('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setKgVal(convertWeight(num, 'lbs', 'kg').toFixed(1));
    } else {
      setKgVal('');
    }
  };

  const handleSliderChange = (e) => {
    const kg = parseFloat(e.target.value);
    setKgVal(kg.toString());
    setLbsVal(convertWeight(kg, 'kg', 'lbs').toFixed(1));
  };

  const adjustWeight = (amount) => {
    const current = parseFloat(kgVal) || 0;
    const next = Math.max(0, current + amount);
    // Round to 2 decimals to prevent floating issues
    const rounded = Math.round(next * 100) / 100;
    setKgVal(rounded.toString());
    setLbsVal(convertWeight(rounded, 'kg', 'lbs').toFixed(1));
  };

  const clearAll = () => {
    setKgVal('');
    setLbsVal('');
  };

  // Pre-calculated milestone grids
  const kgPlatesMilestones = [
    { label: '1 plate/side', totalKg: 60, totalLbs: 132.3 },
    { label: '2 plates/side', totalKg: 100, totalLbs: 220.5 },
    { label: '3 plates/side', totalKg: 140, totalLbs: 308.6 },
    { label: '4 plates/side', totalKg: 180, totalLbs: 396.8 },
    { label: '5 plates/side', totalKg: 220, totalLbs: 485.0 },
    { label: '6 plates/side', totalKg: 260, totalLbs: 573.2 },
  ];

  const lbsPlatesMilestones = [
    { label: '1 plate/side', totalLbs: 135, totalKg: 61.2 },
    { label: '2 plates/side', totalLbs: 225, totalKg: 102.1 },
    { label: '3 plates/side', totalLbs: 315, totalKg: 142.9 },
    { label: '4 plates/side', totalLbs: 405, totalKg: 183.7 },
    { label: '5 plates/side', totalLbs: 495, totalKg: 224.5 },
    { label: '6 plates/side', totalLbs: 585, totalKg: 265.4 },
  ];

  const quickKgConversions = [
    { kg: 5, lbs: 11.0 }, { kg: 10, lbs: 22.0 }, { kg: 15, lbs: 33.1 },
    { kg: 20, lbs: 44.1 }, { kg: 25, lbs: 55.1 }, { kg: 30, lbs: 66.1 },
    { kg: 35, lbs: 77.2 }, { kg: 40, lbs: 88.2 }, { kg: 45, lbs: 99.2 },
    { kg: 50, lbs: 110.2 }, { kg: 60, lbs: 132.3 }, { kg: 70, lbs: 154.3 },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calculator</h1>
          <div className="page-subtitle">Weight conversion & reference</div>
        </div>
        {(kgVal || lbsVal) && (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text2)', borderColor: 'var(--border)' }}
            onClick={clearAll}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Converter Panel */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg3) 100%)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>

          {/* Dual Inputs */}
          {(() => {
            const kgBlock = (
              <div key="kg" style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text3)',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  KG
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  aria-label="Kilograms"
                  value={kgVal}
                  onChange={(e) => handleKgChange(e.target.value)}
                  placeholder="0.0"
                  className="calc-number-input"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border2)',
                    borderRadius: 10,
                    color: 'var(--text)',
                    fontSize: 28,
                    fontWeight: 800,
                    padding: '12px 16px 12px 50px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
            );

            const lbsBlock = (
              <div key="lbs" style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text3)',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  LBS
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  aria-label="Pounds"
                  value={lbsVal}
                  onChange={(e) => handleLbsChange(e.target.value)}
                  placeholder="0.0"
                  className="calc-number-input"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border2)',
                    borderRadius: 10,
                    color: 'var(--text)',
                    fontSize: 28,
                    fontWeight: 800,
                    padding: '12px 16px 12px 55px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {kgFirst ? kgBlock : lbsBlock}

                {/* Swap KG/LBS field order */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                  <button
                    type="button"
                    onClick={() => setKgFirst((v) => !v)}
                    title="Swap KG/LBS order"
                    aria-label="Swap KG and LBS field order"
                    style={{
                      background: 'var(--bg4)',
                      border: '1px solid var(--border)',
                      borderRadius: '50%',
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'transform 0.2s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: kgFirst ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                </div>

                {kgFirst ? lbsBlock : kgBlock}
              </div>
            );
          })()}

          {/* Quick Adjust group — visually separated from the inputs above */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 14px' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Quick Adjust
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Slider (0 - 250 kg)
              </span>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {(parseFloat(kgVal) || 0).toFixed(1)} kg
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="2.5"
              value={parseFloat(kgVal) || 0}
              onChange={handleSliderChange}
              style={{
                width: '100%',
                accentColor: 'var(--accent)',
                height: 6,
                borderRadius: 3,
                background: 'var(--bg4)',
                cursor: 'pointer',
                outline: 'none',
                marginBottom: 16
              }}
            />

            {/* Quick Adjustment Taps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              <button className="btn btn-ghost" style={{ minHeight: 44, padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(-10)}>−10 kg</button>
              <button className="btn btn-ghost" style={{ minHeight: 44, padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(-2.5)}>−2.5 kg</button>
              <button className="btn btn-ghost" style={{ minHeight: 44, padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(2.5)}>+2.5 kg</button>
              <button className="btn btn-ghost" style={{ minHeight: 44, padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(10)}>+10 kg</button>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Reference Chart Section */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 12, gap: 10 }}>
            <button
              onClick={() => setRefTab('plates')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: refTab === 'plates' ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '4px 0', borderBottom: refTab === 'plates' ? '2px solid var(--accent)' : 'none',
                transition: 'color 0.15s'
              }}
            >
              Plates System
            </button>
            <button
              onClick={() => setRefTab('grid')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                color: refTab === 'grid' ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '4px 0', borderBottom: refTab === 'grid' ? '2px solid var(--accent)' : 'none',
                transition: 'color 0.15s'
              }}
            >
              Conversion Grid
            </button>
          </div>

          {/* Plates System Milestones */}
          {refTab === 'plates' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.4 }}>
                Standard barbell weights using matching plates on each side (assumes 20kg / 45lb bar).
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* KG Plates */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    KG Plates (20kg bar)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {kgPlatesMilestones.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { handleKgChange(m.totalKg.toString()); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', minHeight: 44, padding: '8px 10px', background: 'var(--bg3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'left' }}
                      >
                        <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{m.totalKg}k <span style={{ color: 'var(--text3)', fontSize: 10 }}>({m.totalLbs.toFixed(0)}#)</span></span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* LBS Plates */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    LBS Plates (45lb bar)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {lbsPlatesMilestones.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { handleLbsChange(m.totalLbs.toString()); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', minHeight: 44, padding: '8px 10px', background: 'var(--bg3)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'left' }}
                      >
                        <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{m.totalLbs}# <span style={{ color: 'var(--text3)', fontSize: 10 }}>({m.totalKg.toFixed(1)}k)</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversion Grid (kg | lbs, both directions at once) */}
          {refTab === 'grid' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {quickKgConversions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleKgChange(item.kg.toString())}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      minHeight: 44,
                      padding: '8px 12px',
                      background: 'var(--bg3)',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{item.kg} kg</span>
                    <span style={{ color: 'var(--text2)' }}>{item.lbs.toFixed(1)} lbs</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
