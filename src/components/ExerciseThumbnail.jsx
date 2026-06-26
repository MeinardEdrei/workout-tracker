import { useState, useEffect } from 'react';

function DumbbellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)' }}>
      <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
    </svg>
  );
}

function Lightbox({ imageUrl, name, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, animation: 'fadeIn 0.15s ease', padding: 20,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)',
          border: 'none', borderRadius: '50%', width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer', zIndex: 1,
        }}
      >
        <XIcon />
      </button>
      <img
        src={imageUrl}
        alt={name}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%', maxHeight: '85vh',
          borderRadius: 12, objectFit: 'contain',
          animation: 'scaleIn 0.15s ease',
        }}
      />
    </div>
  );
}

export default function ExerciseThumbnail({ imageUrl, name, size = 80 }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const hasImage = !!imageUrl && !imageError;

  return (
    <>
      <div
        onClick={hasImage ? () => setLightboxOpen(true) : undefined}
        style={{
          width: size, height: size, flexShrink: 0,
          borderRadius: 8,
          border: '1px solid #2a2a2a',
          background: '#1c1c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          cursor: hasImage ? 'pointer' : 'default',
          transition: 'filter 0.15s, transform 0.15s',
        }}
        onMouseEnter={(e) => { if (hasImage) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.03)'; } }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
      >
        {hasImage ? (
          <img
            src={imageUrl}
            alt={name}
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <DumbbellIcon />
        )}
      </div>
      {lightboxOpen && <Lightbox imageUrl={imageUrl} name={name} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}
