import React from 'react';

// SVG anatomical body map component showing dynamic muscle activation
export default function BodyMap({ exercises = [], size = 180 }) {
  // 1. Calculate total sets per muscle target
  const muscleSets = {};
  (exercises || []).forEach((ex) => {
    const sets = Number(ex.sets || 0);
    const targets = ex.muscleTargets || [];
    targets.forEach((t) => {
      const key = t.trim();
      muscleSets[key] = (muscleSets[key] || 0) + sets;
    });
  });

  // 2. Map database muscle keys to SVG part IDs
  const SVG_PART_MAPPING = {
    chest_l: ['Chest'],
    chest_r: ['Chest'],
    up_chest_l: ['Upper Chest'],
    up_chest_r: ['Upper Chest'],
    delt_front_l: ['Front Delts', 'Side Delts'],
    delt_front_r: ['Front Delts', 'Side Delts'],
    biceps_l: ['Biceps'],
    biceps_r: ['Biceps'],
    forearm_l: ['Forearms'],
    forearm_r: ['Forearms'],
    abs_u_l: ['Abs', 'Core'],
    abs_u_r: ['Abs', 'Core'],
    abs_m_l: ['Abs', 'Core'],
    abs_m_r: ['Abs', 'Core'],
    abs_l_l: ['Abs', 'Core'],
    abs_l_r: ['Abs', 'Core'],
    oblique_l: ['Obliques', 'Core'],
    oblique_r: ['Obliques', 'Core'],
    hip_l: ['Hip Flexors'],
    hip_r: ['Hip Flexors'],
    quad_l: ['Quads'],
    quad_r: ['Quads'],
    calf_l: ['Calves'],
    calf_r: ['Calves'],
    
    // Back Parts
    up_back_l: ['Upper Back'],
    up_back_r: ['Upper Back'],
    lats_l: ['Lats'],
    lats_r: ['Lats'],
    low_back_l: ['Lower Back'],
    low_back_r: ['Lower Back'],
    delt_rear_l: ['Rear Delts', 'Side Delts'],
    delt_rear_r: ['Rear Delts', 'Side Delts'],
    triceps_l: ['Triceps'],
    triceps_r: ['Triceps'],
    glutes_l: ['Glutes'],
    glutes_r: ['Glutes'],
    hamstring_l: ['Hamstrings'],
    hamstring_r: ['Hamstrings'],
  };

  // 3. Helper to get styling for a given SVG part ID based on set counts
  function getPartStyle(partId) {
    const mappedMuscles = SVG_PART_MAPPING[partId] || [];
    let maxSets = 0;
    mappedMuscles.forEach((m) => {
      const sets = muscleSets[m] || 0;
      if (sets > maxSets) maxSets = sets;
    });

    if (maxSets === 0) {
      // Neutral / Unworked
      return { fill: '#1a1a1f', stroke: '#2e2e38', strokeWidth: 1 };
    } else if (maxSets <= 2) {
      // Light Target - Neon Green/Yellow tint
      return { fill: 'rgba(232, 255, 90, 0.35)', stroke: 'rgba(232, 255, 90, 0.8)', strokeWidth: 1.2 };
    } else if (maxSets <= 5) {
      // Medium Target - Vibrant Orange
      return { fill: 'rgba(245, 158, 11, 0.55)', stroke: 'rgba(245, 158, 11, 0.95)', strokeWidth: 1.2 };
    } else {
      // Heavy Target - Fire Red
      return { fill: 'rgba(239, 68, 68, 0.85)', stroke: '#ffffff', strokeWidth: 1.5 };
    }
  }

  // Common outline/connective styles
  const jointStyle = { fill: '#141418', stroke: '#26262a', strokeWidth: 0.8 };

  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Front View */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Front</div>
        <svg width={size} height={size * 2.2} viewBox="0 0 100 220" style={{ background: '#08080a', borderRadius: 8, padding: 4 }}>
          {/* Head & Neck */}
          <circle cx="50" cy="15" r="9" style={jointStyle} />
          <line x1="50" y1="24" x2="50" y2="30" style={{ stroke: '#2e2e38', strokeWidth: 4 }} />

          {/* Shoulders */}
          <circle cx="23" cy="38" r="4.5" style={jointStyle} />
          <circle cx="77" cy="38" r="4.5" style={jointStyle} />

          {/* Front Delts */}
          <polygon points="28,32 18,32 18,48 28,48" style={getPartStyle('delt_front_l')} />
          <polygon points="72,32 82,32 82,48 72,48" style={getPartStyle('delt_front_r')} />

          {/* Chest */}
          <polygon points="48,32 32,32 30,38 48,38" style={getPartStyle('up_chest_l')} />
          <polygon points="52,32 68,32 70,38 52,38" style={getPartStyle('up_chest_r')} />
          <polygon points="48,39 30,39 30,55 48,55" style={getPartStyle('chest_l')} />
          <polygon points="52,39 70,39 70,55 52,55" style={getPartStyle('chest_r')} />

          {/* Abs / Core */}
          <polygon points="48,58 35,58 35,68 48,68" style={getPartStyle('abs_u_l')} />
          <polygon points="52,58 65,58 65,68 52,68" style={getPartStyle('abs_u_r')} />
          <polygon points="48,70 35,70 35,80 48,80" style={getPartStyle('abs_m_l')} />
          <polygon points="52,70 65,70 65,80 52,80" style={getPartStyle('abs_m_r')} />
          <polygon points="48,82 35,82 35,92 48,92" style={getPartStyle('abs_l_l')} />
          <polygon points="52,82 65,82 65,92 52,92" style={getPartStyle('abs_l_r')} />

          {/* Obliques */}
          <polygon points="28,58 33,58 33,92 28,92" style={getPartStyle('oblique_l')} />
          <polygon points="67,58 72,58 72,92 67,92" style={getPartStyle('oblique_r')} />

          {/* Arms */}
          <polygon points="17,50 8,50 8,72 17,72" style={getPartStyle('biceps_l')} />
          <polygon points="83,50 92,50 92,72 83,72" style={getPartStyle('biceps_r')} />
          <circle cx="12.5" cy="74" r="3" style={jointStyle} />
          <circle cx="87.5" cy="74" r="3" style={jointStyle} />
          <polygon points="16,77 9,77 11,105 14,105" style={getPartStyle('forearm_l')} />
          <polygon points="84,77 91,77 89,105 86,105" style={getPartStyle('forearm_r')} />
          <circle cx="12.5" cy="110" r="2.5" style={jointStyle} />
          <circle cx="87.5" cy="110" r="2.5" style={jointStyle} />

          {/* Hips / Pelvis */}
          <polygon points="48,95 32,95 28,105 48,105" style={getPartStyle('hip_l')} />
          <polygon points="52,95 68,95 72,105 52,105" style={getPartStyle('hip_r')} />

          {/* Legs */}
          <polygon points="48,108 28,108 30,158 48,158" style={getPartStyle('quad_l')} />
          <polygon points="52,108 72,108 70,158 52,158" style={getPartStyle('quad_r')} />
          <circle cx="38.5" cy="162" r="3.5" style={jointStyle} />
          <circle cx="61.5" cy="162" r="3.5" style={jointStyle} />
          <polygon points="45,166 32,166 34,204 43,204" style={getPartStyle('calf_l')} />
          <polygon points="55,166 68,166 66,204 57,204" style={getPartStyle('calf_r')} />
          <circle cx="38" cy="207" r="2.5" style={jointStyle} />
          <circle cx="62" cy="207" r="2.5" style={jointStyle} />
          <polygon points="42,210 33,210 30,216 42,216" style={jointStyle} />
          <polygon points="58,210 67,210 70,216 58,216" style={jointStyle} />
        </svg>
      </div>

      {/* Back View */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Back</div>
        <svg width={size} height={size * 2.2} viewBox="0 0 100 220" style={{ background: '#08080a', borderRadius: 8, padding: 4 }}>
          {/* Head & Neck */}
          <circle cx="50" cy="15" r="9" style={jointStyle} />
          <line x1="50" y1="24" x2="50" y2="30" style={{ stroke: '#2e2e38', strokeWidth: 4 }} />

          {/* Shoulders */}
          <circle cx="23" cy="38" r="4.5" style={jointStyle} />
          <circle cx="77" cy="38" r="4.5" style={jointStyle} />

          {/* Rear Delts */}
          <polygon points="28,32 18,32 18,48 28,48" style={getPartStyle('delt_rear_l')} />
          <polygon points="72,32 82,32 82,48 72,48" style={getPartStyle('delt_rear_r')} />

          {/* Upper Back */}
          <polygon points="48,32 30,32 30,48 48,48" style={getPartStyle('up_back_l')} />
          <polygon points="52,32 70,32 70,48 52,48" style={getPartStyle('up_back_r')} />

          {/* Lats */}
          <polygon points="48,50 30,50 34,76 48,76" style={getPartStyle('lats_l')} />
          <polygon points="52,50 70,50 66,76 52,76" style={getPartStyle('lats_r')} />

          {/* Lower Back */}
          <polygon points="48,78 35,78 35,92 48,92" style={getPartStyle('low_back_l')} />
          <polygon points="52,78 65,78 65,92 52,92" style={getPartStyle('low_back_r')} />

          {/* Arms (Triceps) */}
          <polygon points="17,50 8,50 8,72 17,72" style={getPartStyle('triceps_l')} />
          <polygon points="83,50 92,50 92,72 83,72" style={getPartStyle('triceps_r')} />
          <circle cx="12.5" cy="74" r="3" style={jointStyle} />
          <circle cx="87.5" cy="74" r="3" style={jointStyle} />
          <polygon points="16,77 9,77 11,105 14,105" style={getPartStyle('forearm_l')} />
          <polygon points="84,77 91,77 89,105 86,105" style={getPartStyle('forearm_r')} />
          <circle cx="12.5" cy="110" r="2.5" style={jointStyle} />
          <circle cx="87.5" cy="110" r="2.5" style={jointStyle} />

          {/* Glutes */}
          <polygon points="48,95 28,95 30,118 48,118" style={getPartStyle('glutes_l')} />
          <polygon points="52,95 72,95 70,118 52,118" style={getPartStyle('glutes_r')} />

          {/* Legs (Hamstrings) */}
          <polygon points="48,120 28,120 30,158 48,158" style={getPartStyle('hamstring_l')} />
          <polygon points="52,120 72,120 70,158 52,158" style={getPartStyle('hamstring_r')} />
          <circle cx="38.5" cy="162" r="3.5" style={jointStyle} />
          <circle cx="61.5" cy="162" r="3.5" style={jointStyle} />
          <polygon points="45,166 32,166 34,204 43,204" style={getPartStyle('calf_l')} />
          <polygon points="55,166 68,166 66,204 57,204" style={getPartStyle('calf_r')} />
          <circle cx="38" cy="207" r="2.5" style={jointStyle} />
          <circle cx="62" cy="207" r="2.5" style={jointStyle} />
          <polygon points="42,210 33,210 30,216 42,216" style={jointStyle} />
          <polygon points="58,210 67,210 70,216 58,216" style={jointStyle} />
        </svg>
      </div>

    </div>
  );
}
