import { useEffect, useRef } from 'react';
import { tick } from '../utils/haptics';

const HOLD_DELAY_MS = 400;
const SLOW_REPEAT_MS = 120;
const FAST_REPEAT_MS = 60;
const SPEED_UP_AFTER = 8;

// A −/+ button you can hold instead of tapping repeatedly: one step on press,
// then after a short delay it repeats, speeding up the longer it's held.
// onStep(repeatIndex) gets 0 for the first step so callers can take bigger
// jumps on long holds (e.g. 2.5 → 5 kg after ten repeats).
export default function RepeatButton({ onStep, disabled, style, children, ...rest }) {
  const timerRef = useRef(null);
  const countRef = useRef(0);
  const pointerRef = useRef(false);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  function stop() {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => stop, []);

  function step() {
    onStepRef.current(countRef.current);
    countRef.current += 1;
    tick();
  }

  function schedule(delay) {
    timerRef.current = setTimeout(() => {
      step();
      schedule(countRef.current > SPEED_UP_AFTER ? FAST_REPEAT_MS : SLOW_REPEAT_MS);
    }, delay);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        pointerRef.current = true;
        countRef.current = 0;
        step();
        schedule(HOLD_DELAY_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={() => { stop(); pointerRef.current = false; }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        // Pointer presses were already handled on pointerdown; this path is
        // keyboard activation (Enter / Space).
        if (pointerRef.current) { pointerRef.current = false; return; }
        countRef.current = 0;
        step();
      }}
      style={{ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', ...style }}
    >
      {children}
    </button>
  );
}
