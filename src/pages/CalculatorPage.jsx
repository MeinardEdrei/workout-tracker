import { useState, useEffect } from 'react';

// Plate specifications for KG
const KG_PLATES_CONFIG = {
  25: { height: 42, width: 10, color: '#ff3b30', label: '25' },
  20: { height: 40, width: 9, color: '#007aff', label: '20' },
  15: { height: 38, width: 8, color: '#ffcc00', label: '15' },
  10: { height: 34, width: 7, color: '#34c759', label: '10' },
  5: { height: 28, width: 6, color: '#ffffff', label: '5', border: '1px solid #333', textColor: '#0a0a0a' },
  2.5: { height: 22, width: 5, color: '#ff9500', label: '2.5' },
  1.25: { height: 16, width: 4, color: '#8e8e93', label: '1.2' },
};

// Plate specifications for LBS
const LBS_PLATES_CONFIG = {
  45: { height: 40, width: 9, color: '#1a1a1a', label: '45', border: '1px solid #444' },
  35: { height: 38, width: 8, color: '#3a3a3a', label: '35', border: '1px solid #555' },
  25: { height: 34, width: 7, color: '#5a5a5a', label: '25', border: '1px solid #777' },
  10: { height: 28, width: 6, color: '#8a8a8a', label: '10' },
  5: { height: 22, width: 5, color: '#aaaaaa', label: '5' },
  2.5: { height: 16, width: 4, color: '#cccccc', label: '2.5' },
};

const KG_DENOMINATIONS = [25, 20, 15, 10, 5, 2.5, 1.25];
const LBS_DENOMINATIONS = [45, 35, 25, 10, 5, 2.5];

export default function CalculatorPage() {
  const [kgVal, setKgVal] = useState('60');
  const [lbsVal, setLbsVal] = useState('132.3');
  const [plateUnit, setPlateUnit] = useState('kg'); // 'kg' or 'lbs'
  const [barWeight, setBarWeight] = useState(20); // default 20kg bar
  const [refTab, setRefTab] = useState('plates'); // 'plates' or 'kg-grid' or 'lbs-grid'

  // Sync calculations on load or plate unit swap
  useEffect(() => {
    if (plateUnit === 'kg') {
      setBarWeight(20);
    } else {
      setBarWeight(45);
    }
  }, [plateUnit]);

  const handleKgChange = (val) => {
    setKgVal(val);
    if (val === '') {
      setLbsVal('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setLbsVal((num * 2.2046226218).toFixed(1));
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
      setKgVal((num / 2.2046226218).toFixed(1));
    } else {
      setKgVal('');
    }
  };

  const handleSliderChange = (e) => {
    const kg = parseFloat(e.target.value);
    setKgVal(kg.toString());
    setLbsVal((kg * 2.2046226218).toFixed(1));
  };

  const adjustWeight = (amount) => {
    const current = parseFloat(kgVal) || 0;
    const next = Math.max(0, current + amount);
    // Round to 2 decimals to prevent floating issues
    const rounded = Math.round(next * 100) / 100;
    setKgVal(rounded.toString());
    setLbsVal((rounded * 2.2046226218).toFixed(1));
  };

  const clearAll = () => {
    setKgVal('');
    setLbsVal('');
  };

  // Calculate plates
  const currentWeight = plateUnit === 'kg' ? (parseFloat(kgVal) || 0) : (parseFloat(lbsVal) || 0);
  const denoms = plateUnit === 'kg' ? KG_DENOMINATIONS : LBS_DENOMINATIONS;
  const config = plateUnit === 'kg' ? KG_PLATES_CONFIG : LBS_PLATES_CONFIG;

  const plates = calculatePlates(currentWeight, barWeight, denoms);
  const totalLoaded = barWeight + plates.reduce((sum, p) => sum + p.denom * p.count * 2, 0);
  const remainder = currentWeight - totalLoaded;

  // Flatten plates for drawing
  const flatPlates = [];
  plates.forEach(p => {
    for (let i = 0; i < p.count; i++) {
      flatPlates.push(p.denom);
    }
  });

  function calculatePlates(weight, bar, denominations) {
    let remaining = (weight - bar) / 2;
    if (remaining <= 0) return [];
    
    const res = [];
    for (const denom of denominations) {
      const count = Math.floor((remaining + 0.001) / denom);
      if (count > 0) {
        res.push({ denom, count });
        remaining -= count * denom;
      }
    }
    return res;
  }

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

  const quickLbsConversions = [
    { lbs: 10, kg: 4.5 }, { lbs: 15, kg: 6.8 }, { lbs: 20, kg: 9.1 },
    { lbs: 25, kg: 11.3 }, { lbs: 35, kg: 15.9 }, { lbs: 45, kg: 20.4 },
    { lbs: 50, kg: 22.7 }, { lbs: 65, kg: 29.5 }, { lbs: 85, kg: 38.6 },
    { lbs: 100, kg: 45.4 }, { lbs: 120, kg: 54.4 }, { lbs: 150, kg: 68.0 },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calculator</h1>
          <div className="page-subtitle">Weight conversion & plate loader</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KG Input Block */}
            <div style={{ position: 'relative' }}>
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
                value={kgVal}
                onChange={(e) => handleKgChange(e.target.value)}
                placeholder="0.0"
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
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>

            {/* Visual Divider / Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
              <div style={{
                background: 'var(--bg4)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
            </div>

            {/* LBS Input Block */}
            <div style={{ position: 'relative' }}>
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
                value={lbsVal}
                onChange={(e) => handleLbsChange(e.target.value)}
                placeholder="0.0"
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
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>
          </div>

          {/* Slider & Quick Adjusters */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Slider (0 - 250 kg)
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" style={{ flex: '1 0 21%', padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(-10)}>-10k</button>
              <button className="btn btn-ghost" style={{ flex: '1 0 21%', padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(-2.5)}>-2.5k</button>
              <button className="btn btn-ghost" style={{ flex: '1 0 21%', padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(2.5)}>+2.5k</button>
              <button className="btn btn-ghost" style={{ flex: '1 0 21%', padding: '8px 4px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-mono)' }} onClick={() => adjustWeight(10)}>+10k</button>
            </div>
          </div>

        </div>
      </div>

      {/* Barbell Plate Loader Card */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Barbell Plate Loader
            </span>

            {/* Unit Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg3)', padding: 2, borderRadius: 6, border: '1px solid var(--border2)' }}>
              <button
                onClick={() => setPlateUnit('kg')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: plateUnit === 'kg' ? 'var(--accent)' : 'transparent',
                  color: plateUnit === 'kg' ? '#0a0a0a' : 'var(--text2)',
                  transition: 'all 0.15s'
                }}
              >
                KG Plates
              </button>
              <button
                onClick={() => setPlateUnit('lbs')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: plateUnit === 'lbs' ? 'var(--accent)' : 'transparent',
                  color: plateUnit === 'lbs' ? '#0a0a0a' : 'var(--text2)',
                  transition: 'all 0.15s'
                }}
              >
                LBS Plates
              </button>
            </div>
          </div>

          {/* Barbell Weight Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>
              Bar Weight:
            </span>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {plateUnit === 'kg' ? (
                <>
                  <button onClick={() => setBarWeight(0)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 0 ? 'var(--bg3)' : 'transparent', color: barWeight === 0 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>None</button>
                  <button onClick={() => setBarWeight(10)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 10 ? 'var(--bg3)' : 'transparent', color: barWeight === 10 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>10k</button>
                  <button onClick={() => setBarWeight(15)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 15 ? 'var(--bg3)' : 'transparent', color: barWeight === 15 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>15k</button>
                  <button onClick={() => setBarWeight(20)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 20 ? 'var(--bg3)' : 'transparent', color: barWeight === 20 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>20k</button>
                </>
              ) : (
                <>
                  <button onClick={() => setBarWeight(0)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 0 ? 'var(--bg3)' : 'transparent', color: barWeight === 0 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>None</button>
                  <button onClick={() => setBarWeight(25)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 25 ? 'var(--bg3)' : 'transparent', color: barWeight === 25 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>25lb</button>
                  <button onClick={() => setBarWeight(35)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 35 ? 'var(--bg3)' : 'transparent', color: barWeight === 35 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>35lb</button>
                  <button onClick={() => setBarWeight(45)} style={{ flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--border)', background: barWeight === 45 ? 'var(--bg3)' : 'transparent', color: barWeight === 45 ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>45lb</button>
                </>
              )}
            </div>
          </div>

          {/* Visual Barbell Rendering */}
          <div style={{
            position: 'relative',
            height: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border2)',
            marginBottom: 16
          }}>
            {/* Center Bar Shaft */}
            <div style={{
              position: 'absolute',
              width: '40%',
              height: 6,
              background: 'linear-gradient(to bottom, #888, #444, #666)',
              borderRadius: 3,
              zIndex: 1
            }} />

            {/* Left Collar (stopper) */}
            <div style={{
              position: 'absolute',
              left: '30%',
              width: 6,
              height: 28,
              background: '#222',
              borderRadius: 1,
              zIndex: 2,
              boxShadow: '0 0 3px rgba(0,0,0,0.5)'
            }} />

            {/* Left Sleeve */}
            <div style={{
              position: 'absolute',
              left: '5%',
              width: '25%',
              height: 10,
              background: 'linear-gradient(to bottom, #aaa, #666, #999)',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 1
            }}>
              {/* Stack of Left Plates (rendered heaviest inside to lightest outside) */}
              {flatPlates.map((denom, index) => {
                const item = config[denom];
                return (
                  <div
                    key={`l-${index}`}
                    style={{
                      height: item.height,
                      width: item.width,
                      backgroundColor: item.color,
                      border: item.border || 'none',
                      borderRadius: 1,
                      boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.4)',
                      marginRight: 1,
                      flexShrink: 0
                    }}
                  />
                );
              })}
            </div>

            {/* Right Collar (stopper) */}
            <div style={{
              position: 'absolute',
              right: '30%',
              width: 6,
              height: 28,
              background: '#222',
              borderRadius: 1,
              zIndex: 2,
              boxShadow: '0 0 3px rgba(0,0,0,0.5)'
            }} />

            {/* Right Sleeve */}
            <div style={{
              position: 'absolute',
              right: '5%',
              width: '25%',
              height: 10,
              background: 'linear-gradient(to bottom, #aaa, #666, #999)',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: 1
            }}>
              {/* Stack of Right Plates */}
              {flatPlates.map((denom, index) => {
                const item = config[denom];
                return (
                  <div
                    key={`r-${index}`}
                    style={{
                      height: item.height,
                      width: item.width,
                      backgroundColor: item.color,
                      border: item.border || 'none',
                      borderRadius: 1,
                      boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.4)',
                      marginLeft: 1,
                      flexShrink: 0
                    }}
                  />
                );
              })}
            </div>

            {/* Empty Weight Message overlay */}
            {flatPlates.length === 0 && (
              <div style={{ zIndex: 3, fontSize: 12, color: 'var(--text2)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Empty Barbell ({barWeight} {plateUnit})
              </div>
            )}
          </div>

          {/* Plate Legend / Counts */}
          {plates.length > 0 ? (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Plates per side:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {plates.map((p, i) => {
                  const item = config[p.denom];
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        backgroundColor: item.color,
                        border: item.border || 'none'
                      }} />
                      <span style={{ color: 'var(--text)' }}>
                        {p.count} × {p.denom} {plateUnit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Exact Loaded Readout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>Total Loaded weight:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {totalLoaded.toFixed(2)} {plateUnit}
                </span>
              </div>
              {Math.abs(remainder) > 0.05 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 11 }}>
                  <span style={{ color: 'var(--text3)' }}>Remainder (not loadable):</span>
                  <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                    {remainder.toFixed(2)} {plateUnit}
                  </span>
                </div>
              )}
            </div>
          ) : (
            currentWeight > barWeight && (
              <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', padding: '4px 0' }}>
                Weight is too small to load with available plates.
              </div>
            )
          )}
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
              onClick={() => setRefTab('kg-grid')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: refTab === 'kg-grid' ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '4px 0', borderBottom: refTab === 'kg-grid' ? '2px solid var(--accent)' : 'none',
                transition: 'color 0.15s'
              }}
            >
              KG ➔ LBS Grid
            </button>
            <button
              onClick={() => setRefTab('lbs-grid')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: refTab === 'lbs-grid' ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '4px 0', borderBottom: refTab === 'lbs-grid' ? '2px solid var(--accent)' : 'none',
                transition: 'color 0.15s'
              }}
            >
              LBS ➔ KG Grid
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
                      <div 
                        key={i} 
                        onClick={() => { handleKgChange(m.totalKg.toString()); }}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg3)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      >
                        <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{m.totalKg}k <span style={{ color: 'var(--text3)', fontSize: 10 }}>({m.totalLbs.toFixed(0)}#)</span></span>
                      </div>
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
                      <div 
                        key={i} 
                        onClick={() => { handleLbsChange(m.totalLbs.toString()); }}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg3)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      >
                        <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{m.totalLbs}# <span style={{ color: 'var(--text3)', fontSize: 10 }}>({m.totalKg.toFixed(1)}k)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KG to LBS conversions */}
          {refTab === 'kg-grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickKgConversions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleKgChange(item.kg.toString())}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{item.kg} kg</span>
                  <span style={{ color: 'var(--text2)' }}>{item.lbs.toFixed(1)} lbs</span>
                </div>
              ))}
            </div>
          )}

          {/* LBS to KG conversions */}
          {refTab === 'lbs-grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickLbsConversions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLbsChange(item.lbs.toString())}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{item.lbs} lbs</span>
                  <span style={{ color: 'var(--text2)' }}>{item.kg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
