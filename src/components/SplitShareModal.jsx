import { useState, useRef, useEffect } from 'react';
import SplitShareCard from './SplitShareCard';

function toFilename(splitName) {
  return splitName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-split.png';
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function Spinner() {
  return (
    <div style={{
      width: 28, height: 28, margin: '0 auto 12px',
      border: '2.5px solid #2a2a2a', borderTopColor: '#c8f55a',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export default function SplitShareModal({ split, onClose }) {
  const cardRef = useRef(null);
  const [phase, setPhase] = useState('generating'); // 'generating' | 'preview' | 'error'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blob, setBlob] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Give the off-screen card time to paint, and wait for fonts
    const run = async () => {
      try {
        await document.fonts.ready;
        // Small additional delay for any remaining layout work
        await new Promise((r) => setTimeout(r, 180));
        if (cancelled) return;

        const html2canvas = (await import('html2canvas')).default;
        if (cancelled) return;

        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0d0d0d',
          logging: false,
          allowTaint: true,
        });
        if (cancelled) return;

        const url = canvas.toDataURL('image/png');
        setPreviewUrl(url);

        canvas.toBlob((b) => {
          if (!cancelled) {
            setBlob(b);
            setPhase('preview');
          }
        }, 'image/png');
      } catch (err) {
        console.error('[SplitShareModal] capture error:', err);
        if (!cancelled) setPhase('error');
      }
    };
    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleShare() {
    if (!blob) return;
    const filename = toFilename(split.name);
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${split.name} Split` });
      } catch (err) {
        if (err.name !== 'AbortError') handleDownload();
      }
    } else {
      handleDownload();
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = toFilename(split.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const canAct = phase === 'preview';

  return (
    <>
      {/* Off-screen card rendered in the document for html2canvas */}
      <SplitShareCard split={split} cardRef={cardRef} />

      {/* Modal overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.18s ease',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #1e1e1e',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f0f0f0', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
              Share Split
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2, fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
              {split.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 6, display: 'flex', borderRadius: 6, WebkitTapHighlightColor: 'transparent' }}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable preview area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {phase === 'generating' && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#555' }}>
              <Spinner />
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: '#555' }}>
                Generating image…
              </div>
            </div>
          )}

          {phase === 'preview' && previewUrl && (
            <img
              src={previewUrl}
              alt={`${split.name} split card`}
              style={{
                width: '100%',
                display: 'block',
                borderRadius: 8,
                border: '1px solid #1e1e1e',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              }}
            />
          )}

          {phase === 'error' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--red)', fontFamily: 'var(--font-display)' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Failed to generate image</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Try closing and reopening the share panel.</div>
            </div>
          )}
        </div>

        {/* Sticky footer with actions */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid #1e1e1e',
          display: 'flex', gap: 10,
          flexShrink: 0,
          background: '#0a0a0a',
        }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, opacity: canAct ? 1 : 0.4 }}
            onClick={handleDownload}
            disabled={!canAct}
          >
            <DownloadIcon /> Download
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1, opacity: canAct ? 1 : 0.4 }}
            onClick={handleShare}
            disabled={!canAct}
          >
            <ShareIcon /> Share
          </button>
        </div>
      </div>
    </>
  );
}
