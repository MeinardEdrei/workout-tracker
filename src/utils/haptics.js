// Short confirmation tick for taps that change a value mid-workout.
// Android / Chrome get navigator.vibrate. iOS Safari has no Vibration API,
// but since iOS 18 toggling a native switch input plays the system haptic,
// so we click the label of a hidden one. Elsewhere this silently does nothing.
let iosSwitchLabel = null;

function getIosSwitchLabel() {
  if (iosSwitchLabel) return iosSwitchLabel;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = 'haptic-switch';
  const label = document.createElement('label');
  label.htmlFor = input.id;
  for (const el of [input, label]) {
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
    Object.assign(el.style, { position: 'fixed', left: '-9999px', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(el);
  }
  iosSwitchLabel = label;
  return label;
}

export function tick() {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
      return;
    }
    getIosSwitchLabel().click();
  } catch {
    // Haptics are best-effort.
  }
}
