import { useEffect, useRef } from 'react';

// Makes the phone's back gesture / browser Back close the topmost open layer
// (sub-page, sheet, dialog) instead of leaving the app.
//
// While any layer is open we keep exactly ONE extra history entry ("armed").
// Back pops it: the top layer closes and, if layers remain, we re-arm. When
// the last layer closes in-app (its X, Save…) we rewind that entry ourselves.
// History changes are deferred a tick so a handoff (sheet closes, editor opens
// in the same click) nets out to no history change at all — rapid
// history.back() calls get coalesced by the browser and would desync us.
const stack = [];
let armed = false;
let ignoreNextPop = false;
let scheduled = false;

function sync() {
  scheduled = false;
  if (stack.length > 0 && !armed) {
    window.history.pushState({ ...(window.history.state || {}), backLayer: true }, '');
    armed = true;
  } else if (stack.length === 0 && armed) {
    armed = false;
    ignoreNextPop = true;
    window.history.back();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(sync, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    if (!armed) return;
    armed = false;
    const top = stack.pop();
    if (top) top.close();
    schedule();
  });
}

export function useBackClose(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const layer = { close: () => onCloseRef.current() };
    stack.push(layer);
    schedule();
    return () => {
      const i = stack.indexOf(layer);
      if (i !== -1) stack.splice(i, 1);
      schedule();
    };
  }, [open]);
}
