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

  const frontMuscles = ['Chest', 'Front Delts', 'Biceps', 'Abs', 'Quads'];
  const backMuscles = ['Upper Back', 'Lats', 'Triceps', 'Glutes', 'Hamstrings', 'Calves'];

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Anatomical Target Display
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          Tap tag to filter
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {/* FRONT VIEW */}
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#080808', border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', padding: '6px 0 2px', textTransform: 'uppercase' }}>
            FRONT VIEW
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img 
              src="/assets/anatomy_front_body.jpg" 
              alt="Anatomy Front View" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} 
            />
            {/* Overlay Tags */}
            <div style={{ position: 'absolute', inset: 0, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center' }}>
              {frontMuscles.map(m => {
                const info = getVolumeInfo(m);
                const isSelected = selectedMuscle && m.toLowerCase().includes(selectedMuscle.toLowerCase());
                return (
                  <button
                    key={m}
                    onClick={() => onSelectMuscle(m)}
                    style={{
                      padding: '3px 7px', borderRadius: 12,
                      background: isSelected ? 'var(--accent)' : 'rgba(10, 10, 10, 0.75)',
                      border: `1.5px solid ${info.color}`,
                      color: isSelected ? '#0a0a0a' : info.color,
                      fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
                      backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 0 12px var(--accent)' : '0 2px 6px rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>{m}</span>
                    <span style={{ opacity: 0.8, fontSize: 9 }}>({info.sets}s)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BACK VIEW */}
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#080808', border: '1px solid var(--border2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.15em', padding: '6px 0 2px', textTransform: 'uppercase' }}>
            BACK VIEW
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img 
              src="/assets/anatomy_back_body.jpg" 
              alt="Anatomy Back View" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} 
            />
            {/* Overlay Tags */}
            <div style={{ position: 'absolute', inset: 0, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', alignItems: 'center' }}>
              {backMuscles.map(m => {
                const info = getVolumeInfo(m);
                const isSelected = selectedMuscle && m.toLowerCase().includes(selectedMuscle.toLowerCase());
                return (
                  <button
                    key={m}
                    onClick={() => onSelectMuscle(m)}
                    style={{
                      padding: '3px 7px', borderRadius: 12,
                      background: isSelected ? 'var(--accent)' : 'rgba(10, 10, 10, 0.75)',
                      border: `1.5px solid ${info.color}`,
                      color: isSelected ? '#0a0a0a' : info.color,
                      fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
                      backdropFilter: 'blur(4px)', cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 0 12px var(--accent)' : '0 2px 6px rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>{m}</span>
                    <span style={{ opacity: 0.8, fontSize: 9 }}>({info.sets}s)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
