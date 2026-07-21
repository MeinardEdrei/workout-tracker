import { useMemo } from 'react';
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
    if (sets === 0) return { sets: 0, color: 'var(--border2)', fill: 'rgba(255,255,255,0.03)', opacity: 0.4, label: '0 sets' };
    
    const palette = MUSCLE_COLORS[muscleKey] || { text: 'var(--accent)' };
    const color = palette.text;
    
    if (sets >= 10 && sets <= 20) return { sets, color: '#44ff88', fill: 'rgba(68,255,136,0.25)', opacity: 1, label: `${sets} sets (Optimal)` };
    if (sets >= 6 && sets <= 9) return { sets, color: '#5af0ff', fill: 'rgba(90,240,255,0.25)', opacity: 0.9, label: `${sets} sets (Moderate)` };
    if (sets > 20) return { sets, color: '#e8ff5a', fill: 'rgba(232,255,90,0.25)', opacity: 1, label: `${sets} sets (High)` };
    return { sets, color: 'var(--text2)', fill: 'rgba(255,255,255,0.12)', opacity: 0.7, label: `${sets} sets (Low)` };
  }

  const chest = getVolumeInfo('Chest');
  const upperChest = getVolumeInfo('Upper Chest');
  const frontDelts = getVolumeInfo('Front Delts');
  const sideDelts = getVolumeInfo('Side Delts');
  const rearDelts = getVolumeInfo('Rear Delts');
  const biceps = getVolumeInfo('Biceps');
  const triceps = getVolumeInfo('Triceps');
  const abs = getVolumeInfo('Abs');
  const quads = getVolumeInfo('Quads');
  const hamstrings = getVolumeInfo('Hamstrings');
  const glutes = getVolumeInfo('Glutes');
  const lats = getVolumeInfo('Lats');
  const upperBack = getVolumeInfo('Upper Back');
  const calves = getVolumeInfo('Calves');

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Anatomical Target Map
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          Tap muscle region to filter
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '10px 0' }}>
        {/* FRONT BODY */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>FRONT</div>
          <svg width="120" height="220" viewBox="0 0 120 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head & Neck */}
            <circle cx="60" cy="18" r="11" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
            <path d="M55 29 L55 37 H65 L65 29 Z" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1" />

            {/* Front Delts Left & Right */}
            <path
              d="M36 38 C32 40 28 46 30 54 C33 55 38 52 40 45 Z"
              fill={frontDelts.fill} stroke={frontDelts.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Front Delts')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M84 38 C88 40 92 46 90 54 C87 55 82 52 80 45 Z"
              fill={frontDelts.fill} stroke={frontDelts.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Front Delts')} style={{ cursor: 'pointer' }}
            />

            {/* Side Delts */}
            <path
              d="M27 46 C25 50 26 56 29 59 C31 56 31 50 30 46 Z"
              fill={sideDelts.fill} stroke={sideDelts.color} strokeWidth="1"
              onClick={() => onSelectMuscle('Side Delts')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M93 46 C95 50 94 56 91 59 C89 56 89 50 90 46 Z"
              fill={sideDelts.fill} stroke={sideDelts.color} strokeWidth="1"
              onClick={() => onSelectMuscle('Side Delts')} style={{ cursor: 'pointer' }}
            />

            {/* Upper Chest & Chest */}
            <path
              d="M41 38 H60 V47 H42 C40 43 41 38 41 38 Z"
              fill={upperChest.fill !== 'rgba(255,255,255,0.03)' ? upperChest.fill : chest.fill}
              stroke={upperChest.color !== 'var(--border2)' ? upperChest.color : chest.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Upper Chest')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M79 38 H60 V47 H78 C80 43 79 38 79 38 Z"
              fill={upperChest.fill !== 'rgba(255,255,255,0.03)' ? upperChest.fill : chest.fill}
              stroke={upperChest.color !== 'var(--border2)' ? upperChest.color : chest.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Upper Chest')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M42 48 H60 V62 C52 64 44 60 42 48 Z"
              fill={chest.fill} stroke={chest.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Chest')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M78 48 H60 V62 C68 64 76 60 78 48 Z"
              fill={chest.fill} stroke={chest.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Chest')} style={{ cursor: 'pointer' }}
            />

            {/* Biceps Left & Right */}
            <path
              d="M28 58 C26 65 27 75 32 78 C35 73 35 64 32 58 Z"
              fill={biceps.fill} stroke={biceps.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Biceps')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M92 58 C94 65 93 75 88 78 C85 73 85 64 88 58 Z"
              fill={biceps.fill} stroke={biceps.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Biceps')} style={{ cursor: 'pointer' }}
            />

            {/* Abs / Core */}
            <path
              d="M45 64 H75 V96 C68 100 52 100 45 96 Z"
              fill={abs.fill} stroke={abs.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Abs')} style={{ cursor: 'pointer' }}
            />
            {/* Abs Grid Lines */}
            <line x1="60" y1="64" x2="60" y2="96" stroke={abs.color} strokeWidth="0.8" strokeDasharray="2 2" />
            <line x1="47" y1="74" x2="73" y2="74" stroke={abs.color} strokeWidth="0.8" opacity="0.6" />
            <line x1="47" y1="85" x2="73" y2="85" stroke={abs.color} strokeWidth="0.8" opacity="0.6" />

            {/* Forearms Front */}
            <path
              d="M25 80 C23 90 26 102 29 110 C32 104 33 92 31 80 Z"
              fill={biceps.fill} stroke={biceps.color} strokeWidth="1"
              onClick={() => onSelectMuscle('Forearms')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M95 80 C97 90 94 102 91 110 C88 104 87 92 89 80 Z"
              fill={biceps.fill} stroke={biceps.color} strokeWidth="1"
              onClick={() => onSelectMuscle('Forearms')} style={{ cursor: 'pointer' }}
            />

            {/* Quads Left & Right */}
            <path
              d="M44 100 C40 115 42 142 54 150 C57 142 57 115 57 100 Z"
              fill={quads.fill} stroke={quads.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Quads')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M76 100 C80 115 78 142 66 150 C63 142 63 115 63 100 Z"
              fill={quads.fill} stroke={quads.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Quads')} style={{ cursor: 'pointer' }}
            />

            {/* Knees */}
            <circle cx="53" cy="157" r="4" fill="var(--bg2)" stroke="var(--border2)" />
            <circle cx="67" cy="157" r="4" fill="var(--bg2)" stroke="var(--border2)" />

            {/* Calves Front */}
            <path
              d="M48 164 C44 175 46 195 52 205 C55 195 55 175 54 164 Z"
              fill={calves.fill} stroke={calves.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Calves')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M72 164 C76 175 74 195 68 205 C65 195 65 175 66 164 Z"
              fill={calves.fill} stroke={calves.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Calves')} style={{ cursor: 'pointer' }}
            />
          </svg>
        </div>

        {/* BACK BODY */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>BACK</div>
          <svg width="120" height="220" viewBox="0 0 120 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head & Neck */}
            <circle cx="60" cy="18" r="11" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1.5" />
            <path d="M55 29 L55 37 H65 L65 29 Z" fill="var(--bg2)" stroke="var(--border2)" strokeWidth="1" />

            {/* Traps & Upper Back */}
            <path
              d="M45 36 L60 30 L75 36 L60 52 Z"
              fill={upperBack.fill} stroke={upperBack.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Upper Back')} style={{ cursor: 'pointer' }}
            />

            {/* Rear Delts Left & Right */}
            <path
              d="M34 38 C30 42 30 48 35 52 C37 46 38 41 34 38 Z"
              fill={rearDelts.fill !== 'rgba(255,255,255,0.03)' ? rearDelts.fill : upperBack.fill}
              stroke={rearDelts.color !== 'var(--border2)' ? rearDelts.color : upperBack.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Rear Delts')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M86 38 C90 42 90 48 85 52 C83 46 82 41 86 38 Z"
              fill={rearDelts.fill !== 'rgba(255,255,255,0.03)' ? rearDelts.fill : upperBack.fill}
              stroke={rearDelts.color !== 'var(--border2)' ? rearDelts.color : upperBack.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Rear Delts')} style={{ cursor: 'pointer' }}
            />

            {/* Lats Left & Right */}
            <path
              d="M38 52 C35 64 42 78 57 82 V54 Z"
              fill={lats.fill} stroke={lats.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Lats')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M82 52 C85 64 78 78 63 82 V54 Z"
              fill={lats.fill} stroke={lats.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Lats')} style={{ cursor: 'pointer' }}
            />

            {/* Triceps Left & Right */}
            <path
              d="M27 55 C25 64 26 74 30 78 C33 73 34 63 30 55 Z"
              fill={triceps.fill} stroke={triceps.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Triceps')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M93 55 C95 64 94 74 90 78 C87 73 86 63 90 55 Z"
              fill={triceps.fill} stroke={triceps.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Triceps')} style={{ cursor: 'pointer' }}
            />

            {/* Glutes Left & Right */}
            <path
              d="M44 86 C40 96 44 112 58 112 V86 Z"
              fill={glutes.fill} stroke={glutes.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Glutes')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M76 86 C80 96 76 112 62 112 V86 Z"
              fill={glutes.fill} stroke={glutes.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Glutes')} style={{ cursor: 'pointer' }}
            />

            {/* Hamstrings Left & Right */}
            <path
              d="M44 114 C41 128 44 148 56 152 C58 145 58 128 58 114 Z"
              fill={hamstrings.fill} stroke={hamstrings.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Hamstrings')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M76 114 C79 128 76 148 64 152 C62 145 62 128 62 114 Z"
              fill={hamstrings.fill} stroke={hamstrings.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Hamstrings')} style={{ cursor: 'pointer' }}
            />

            {/* Calves Back */}
            <path
              d="M47 160 C42 172 44 195 52 205 C55 195 56 172 54 160 Z"
              fill={calves.fill} stroke={calves.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Calves')} style={{ cursor: 'pointer' }}
            />
            <path
              d="M73 160 C78 172 76 195 68 205 C65 195 64 172 66 160 Z"
              fill={calves.fill} stroke={calves.color} strokeWidth="1.2"
              onClick={() => onSelectMuscle('Calves')} style={{ cursor: 'pointer' }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
