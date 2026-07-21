import { useState } from 'react';
import { MUSCLE_COLORS } from './MusclePill';

export function resolveExerciseMuscles(ex) {
  if (ex.muscleTargets && Array.isArray(ex.muscleTargets) && ex.muscleTargets.length > 0) {
    const valid = ex.muscleTargets.filter(t => t && t !== 'Full Body' && t !== 'Cardio');
    if (valid.length > 0) return valid;
  }

  const name = (ex.name || '').toLowerCase().trim();

  if (name.includes('incline')) {
    if (name.includes('press') || name.includes('bench') || name.includes('fly')) return ['Upper Chest', 'Front Delts', 'Triceps'];
  }
  if (name.includes('bench') || name.includes('push up') || name.includes('dip') || name.includes('chest') || name.includes('fly') || name.includes('pec')) {
    return ['Chest', 'Front Delts', 'Triceps'];
  }
  if (name.includes('lat') || name.includes('pull down') || name.includes('pulldown') || name.includes('pull up') || name.includes('chin up')) {
    return ['Lats', 'Biceps', 'Upper Back'];
  }
  if (name.includes('row') || name.includes('face pull') || name.includes('rear delt')) {
    return ['Upper Back', 'Lats', 'Biceps', 'Rear Delts'];
  }
  if (name.includes('overhead') || name.includes('shoulder') || name.includes('military') || name.includes('arnold')) {
    return ['Front Delts', 'Side Delts', 'Triceps'];
  }
  if (name.includes('lateral raise') || name.includes('side raise')) {
    return ['Side Delts'];
  }
  if (name.includes('squat') || name.includes('leg press') || name.includes('leg extension') || name.includes('lunge') || name.includes('quad')) {
    return ['Quads', 'Glutes'];
  }
  if (name.includes('deadlift') || name.includes('rdl') || name.includes('romanian') || name.includes('leg curl') || name.includes('hamstring')) {
    return ['Hamstrings', 'Glutes', 'Lower Back'];
  }
  if (name.includes('hip thrust') || name.includes('glute')) {
    return ['Glutes', 'Hamstrings'];
  }
  if (name.includes('bicep') || name.includes('curl') || name.includes('preacher')) {
    return ['Biceps', 'Forearms'];
  }
  if (name.includes('tricep') || name.includes('pushdown') || name.includes('skull') || name.includes('extension')) {
    return ['Triceps'];
  }
  if (name.includes('crunch') || name.includes('sit up') || name.includes('leg raise') || name.includes('plank') || name.includes('ab')) {
    return ['Abs', 'Core'];
  }
  if (name.includes('calf') || name.includes('calves')) {
    return ['Calves'];
  }
  if (name.includes('shrug')) {
    return ['Upper Back', 'Side Delts'];
  }

  return ['Chest', 'Quads', 'Lats'];
}

export default function BodyMuscleMap({ muscleSetsMap, selectedMuscle, onSelectMuscle }) {
  function getVolumeInfo(muscleKey) {
    const sets = muscleSetsMap[muscleKey] || 0;
    if (sets === 0) return { sets: 0, color: 'var(--text3)', fill: 'rgba(255,255,255,0.03)', opacity: 0.4, label: '0s' };
    
    if (sets >= 10 && sets <= 20) return { sets, color: '#44ff88', fill: 'rgba(68,255,136,0.25)', opacity: 1, label: `${sets}s` };
    if (sets >= 6 && sets <= 9) return { sets, color: '#5af0ff', fill: 'rgba(90,240,255,0.25)', opacity: 0.9, label: `${sets}s` };
    if (sets > 20) return { sets, color: '#e8ff5a', fill: 'rgba(232,255,90,0.25)', opacity: 1, label: `${sets}s` };
    return { sets, color: 'var(--text2)', fill: 'rgba(255,255,255,0.12)', opacity: 0.7, label: `${sets}s` };
  }

  // Deduplicated single hotspot pins per muscle region for mobile viewports
  const frontHotspots = [
    { key: 'Chest', top: '28%', left: '50%' },
    { key: 'Front Delts', top: '22%', left: '26%' },
    { key: 'Biceps', top: '35%', left: '78%' },
    { key: 'Abs', top: '39%', left: '50%' },
    { key: 'Quads', top: '59%', left: '50%' },
  ];

  const backHotspots = [
    { key: 'Upper Back', top: '24%', left: '50%' },
    { key: 'Lats', top: '34%', left: '64%' },
    { key: 'Triceps', top: '34%', left: '20%' },
    { key: 'Glutes', top: '48%', left: '50%' },
    { key: 'Hamstrings', top: '63%', left: '50%' },
    { key: 'Calves', top: '83%', left: '50%' },
  ];

  const allMuscles = [
    'Chest', 'Upper Back', 'Lats', 'Front Delts', 'Side Delts', 
    'Biceps', 'Triceps', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'
  ];

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          3D Muscle Target Map
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          Tap glowing pins
        </div>
      </div>

      {/* 3D RENDERS WITH PIN HOTSPOTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {/* FRONT VIEW */}
        <div style={{ borderRadius: 10, overflow: 'hidden', background: '#080808', border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', padding: '4px 0 2px', textTransform: 'uppercase' }}>
            FRONT
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4' }}>
            <img 
              src="/assets/anatomy_front_body.jpg" 
              alt="Anatomy Front View" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
            />
            {/* Hotspots */}
            {frontHotspots.map((hs, i) => {
              const info = getVolumeInfo(hs.key);
              if (info.sets === 0) return null;
              const isSelected = selectedMuscle && hs.key.toLowerCase().includes(selectedMuscle.toLowerCase());

              return (
                <div
                  key={i}
                  onClick={() => onSelectMuscle(hs.key)}
                  style={{
                    position: 'absolute', top: hs.top, left: hs.left, transform: 'translate(-50%, -50%)',
                    cursor: 'pointer', zIndex: isSelected ? 10 : 2,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
                  }}
                  title={`${hs.key}: ${info.sets} sets`}
                >
                  <div style={{
                    width: isSelected ? 14 : 10, height: isSelected ? 14 : 10, borderRadius: '50%',
                    background: info.color, border: '1.5px solid rgba(10,10,10,0.9)',
                    boxShadow: `0 0 8px ${info.color}`,
                    transition: 'all 0.15s'
                  }} />
                  <span style={{
                    fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-mono)',
                    color: isSelected ? '#0a0a0a' : 'var(--text)',
                    background: isSelected ? 'var(--accent)' : 'rgba(10,10,10,0.85)',
                    border: `1px solid ${info.color}`, padding: '0px 3px', borderRadius: 4,
                    lineHeight: 1.2, whiteSpace: 'nowrap'
                  }}>
                    {info.sets}s
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BACK VIEW */}
        <div style={{ borderRadius: 10, overflow: 'hidden', background: '#080808', border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', padding: '4px 0 2px', textTransform: 'uppercase' }}>
            BACK
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4' }}>
            <img 
              src="/assets/anatomy_back_body.jpg" 
              alt="Anatomy Back View" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
            />
            {/* Hotspots */}
            {backHotspots.map((hs, i) => {
              const info = getVolumeInfo(hs.key);
              if (info.sets === 0) return null;
              const isSelected = selectedMuscle && hs.key.toLowerCase().includes(selectedMuscle.toLowerCase());

              return (
                <div
                  key={i}
                  onClick={() => onSelectMuscle(hs.key)}
                  style={{
                    position: 'absolute', top: hs.top, left: hs.left, transform: 'translate(-50%, -50%)',
                    cursor: 'pointer', zIndex: isSelected ? 10 : 2,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
                  }}
                  title={`${hs.key}: ${info.sets} sets`}
                >
                  <div style={{
                    width: isSelected ? 14 : 10, height: isSelected ? 14 : 10, borderRadius: '50%',
                    background: info.color, border: '1.5px solid rgba(10,10,10,0.9)',
                    boxShadow: `0 0 8px ${info.color}`,
                    transition: 'all 0.15s'
                  }} />
                  <span style={{
                    fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-mono)',
                    color: isSelected ? '#0a0a0a' : 'var(--text)',
                    background: isSelected ? 'var(--accent)' : 'rgba(10,10,10,0.85)',
                    border: `1px solid ${info.color}`, padding: '0px 3px', borderRadius: 4,
                    lineHeight: 1.2, whiteSpace: 'nowrap'
                  }}>
                    {info.sets}s
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK SELECT MUSCLE PILLS BELOW IMAGES */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {allMuscles.map(m => {
          const info = getVolumeInfo(m);
          if (info.sets === 0) return null;
          const isSelected = selectedMuscle && m.toLowerCase().includes(selectedMuscle.toLowerCase());

          return (
            <button
              key={m}
              onClick={() => onSelectMuscle(m)}
              style={{
                padding: '2px 7px', borderRadius: 8,
                background: isSelected ? 'var(--accent)' : 'var(--bg2)',
                border: `1px solid ${isSelected ? 'var(--accent)' : info.color}`,
                color: isSelected ? '#0a0a0a' : info.color,
                fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 3
              }}
            >
              <span>{m}</span>
              <span style={{ fontSize: 8, opacity: 0.8 }}>{info.sets}s</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
