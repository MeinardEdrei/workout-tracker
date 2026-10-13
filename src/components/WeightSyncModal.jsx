import { createPortal } from 'react-dom';
import { useBackClose } from '../hooks/useBackClose';

// Rounded for display.
function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round((weight / 2.20462) * 10) / 10;
  }
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round((weight * 2.20462) * 10) / 10;
  }
  return weight;
}

export default function WeightSyncModal({ 
  exName, 
  oldWeight, oldUnit, newWeight, newUnit, 
  oldSets, newSets, oldReps, newReps, oldUntilFailure, newUntilFailure, 
  oldMuscleTargets = [], newMuscleTargets = [],
  oldCategory, newCategory,
  otherDays, otherSplits = [], onSync, onSkip, onExclude
}) {
  useBackClose(true, onSkip);
  const oldWInNewUnit = convertWeight(oldWeight ?? 0, oldUnit || 'kg', newUnit || 'kg');
  const delta = (newWeight ?? 0) - oldWInNewUnit;
  const weightChanged = Math.abs(delta) >= 0.01;
  const setsRepsChanged = (oldSets !== undefined && newSets !== undefined && oldSets !== newSets) ||
                          (oldReps !== undefined && newReps !== undefined && oldReps !== newReps) ||
                          (oldUntilFailure !== undefined && newUntilFailure !== undefined && oldUntilFailure !== newUntilFailure);

  const tagsChanged = oldMuscleTargets.length !== newMuscleTargets.length ||
                      !oldMuscleTargets.every(t => newMuscleTargets.includes(t)) ||
                      !newMuscleTargets.every(t => oldMuscleTargets.includes(t));

  const categoryChanged = oldCategory !== undefined && newCategory !== undefined && oldCategory !== newCategory;

  const isIncrease = delta > 0;
  const directionColor = isIncrease ? 'var(--green)' : 'var(--red)';
  const deltaFormatted = Math.abs(delta).toFixed(1).replace(/\.0$/, '');

  const oldRepsStr = (oldUntilFailure || oldReps === 0) ? 'Failure' : `${oldReps}`;
  const newRepsStr = (newUntilFailure || newReps === 0) ? 'Failure' : `${newReps}`;

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <div className="modal">
        <div className="modal-title" style={{ fontSize: 16 }}>Sync Exercise Changes?</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>{exName}</strong>
          
          {weightChanged && (
            <div style={{ marginTop: 4 }}>
              Weight:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{oldWeight}{oldUnit}</span>
              {' → '}
              <span style={{ fontFamily: 'var(--font-mono)', color: directionColor, fontWeight: 700 }}>{newWeight}{newUnit}</span>
              {' '}
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                background: isIncrease ? 'rgba(var(--green-rgb), 0.12)' : 'rgba(var(--red-rgb), 0.12)',
                color: directionColor, padding: '2px 6px', borderRadius: 4,
              }}>
                {isIncrease ? `+${deltaFormatted}${newUnit} increase` : `-${deltaFormatted}${newUnit} decrease`}
              </span>
            </div>
          )}

          {setsRepsChanged && (
            <div style={{ marginTop: 4 }}>
              Sets & Reps:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{oldSets}×{oldRepsStr}</span>
              {' → '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{newSets}×{newRepsStr}</span>
            </div>
          )}

          {tagsChanged && (
            <div style={{ marginTop: 4 }}>
              Targets:{' '}
              <span style={{ color: 'var(--text)' }}>{oldMuscleTargets.length > 0 ? oldMuscleTargets.join(', ') : 'None'}</span>
              {' → '}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{newMuscleTargets.length > 0 ? newMuscleTargets.join(', ') : 'None'}</span>
            </div>
          )}

          {categoryChanged && (
            <div style={{ marginTop: 4 }}>
              Category:{' '}
              <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{oldCategory}</span>
              {' → '}
              <span style={{ color: 'var(--accent)', fontWeight: 700, textTransform: 'capitalize' }}>{newCategory}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          This exercise also appears in{' '}
          <strong style={{ color: 'var(--text2)' }}>
            {otherDays.map((d) => d.dayName).join(', ')}
            {otherDays.length > 0 && otherSplits.length > 0 ? ', ' : ''}
            {otherSplits.map((d) => `${d.dayName} (${d.splitName})`).join(', ')}
          </strong>
          . Sync these changes there too?
        </div>
        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, color: 'var(--text3)' }}
            onClick={onExclude}
            title="Stop asking to sync this exercise in the future"
          >
            Never sync this exercise
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>Keep separate</button>
          <button
            className="btn btn-accent"
            onClick={onSync}
          >
            Sync to all days
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
