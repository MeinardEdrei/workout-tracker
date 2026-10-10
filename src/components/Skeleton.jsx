// Grey placeholder shapes shown while data loads, laid out like the content
// that will replace them so the page doesn't jump when it arrives.
export function SkeletonBlock({ width = '100%', height = 14, radius = 6, style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block', width, height, borderRadius: radius,
        background: 'var(--bg4)', animation: 'skeletonPulse 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// A stack of card-shaped placeholders (circle + two text lines), matching
// exercise rows, split cards and log cards.
export function SkeletonCards({ count = 3, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', padding: 'var(--sp-4)' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4)', borderRadius: 'var(--r-lg)', background: 'var(--bg2)' }}>
          <SkeletonBlock width={44} height={44} radius={22} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <SkeletonBlock width={`${70 - i * 10}%`} height={16} />
            <SkeletonBlock width={`${45 - i * 5}%`} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
