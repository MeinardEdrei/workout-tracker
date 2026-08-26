import { createPortal } from 'react-dom';
import { Sparkles, KeyRound, RotateCcw } from 'lucide-react';

/* ── Markdown renderer (shared) ─────────────────────────────────────────────── */
function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--accent)', fontWeight: 700 }}>{p}</strong> : p
  );
}

export function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const c = line.trim();
    if (c.startsWith('###'))
      return <h4 key={i} style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginTop: 8, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{c.replace('###', '').trim()}</h4>;
    if (c.startsWith('-') || c.startsWith('*'))
      return (
        <div key={i} style={{ display: 'flex', gap: 5, margin: '2px 0', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
          <span>{parseBold(c.substring(1).trim())}</span>
        </div>
      );
    if (c.length === 0) return <div key={i} style={{ height: 5 }} />;
    return <p key={i} style={{ fontSize: 12.5, color: 'var(--text2)', margin: '2px 0', lineHeight: 1.4 }}>{parseBold(c)}</p>;
  });
}

/* ── Icons ───────────────────────────────────────────────────────────────────── */
function SparkleIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  );
}

/**
 * Shared floating AI chat bubble.
 *
 * Props:
 *   title          - header title text
 *   messages       - [{sender:'user'|'coach', text}]
 *   loadingAi      - bool
 *   inputText      - string
 *   onInputChange  - fn(val)
 *   onSend         - fn(promptOverride?)  — called on form submit / quick reply click
 *   onRestart      - fn()  — restart / re-critique
 *   quickReplies   - [{label, prompt}]
 *   apiKey         - string
 *   onApiKeyChange - fn(val)
 *   showSettings   - bool
 *   onToggleSettings - fn()
 *   messagesEndRef - ref
 *   open           - bool
 *   onToggle       - fn()
 *   onInitialCritique - fn | null  — if set and messages is empty, show "Get Critique" button first
 *   badge          - optional string shown next to title (e.g. "Search Enabled")
 */
export default function AiChatBubble({
  title = 'AI Advisor',
  messages = [],
  loadingAi = false,
  inputText = '',
  onInputChange,
  onSend,
  onRestart,
  quickReplies = [],
  apiKey = '',
  onApiKeyChange,
  showSettings = false,
  onToggleSettings,
  messagesEndRef,
  open = false,
  onToggle,
  onInitialCritique = null,
  badge,
}) {
  const hasMessages = messages.length > 0;
  const showCritiqueGate = !hasMessages && !!onInitialCritique;

  const panel = open ? (
    <div style={{
      position: 'fixed',
      bottom: 'calc(var(--nav-height) + 72px)',
      right: 16,
      width: 'min(360px, calc(100vw - 32px))',
      maxHeight: 'min(520px, calc(100dvh - var(--nav-height) - 100px))',
      background: 'var(--bg2)',
      border: '1px solid rgba(232,255,90,0.2)',
      borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 299,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'fadeIn 0.15s ease',
    }}>
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: '1px solid rgba(232,255,90,0.1)', background: 'linear-gradient(135deg,rgba(232,255,90,0.06) 0%,transparent 100%)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
          {badge && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: 3 }}>{badge}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onToggleSettings} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <KeyRound size={11} /> {apiKey ? 'Key set' : 'Setup'}
          </button>
          {onRestart && (
            <button onClick={onRestart} disabled={loadingAi} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }} title="Restart"><RotateCcw size={13} /></button>
          )}
          <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
            <XIcon />
          </button>
        </div>
      </div>

      {/* API Key panel */}
      {showSettings && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontSize: 12, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>Gemini API Settings</div>
          <div style={{ color: 'var(--text2)', marginBottom: 8, lineHeight: 1.4 }}>
            Free API key unlocks full Q&amp;A.{' '}
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Get one here</a>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="password" placeholder="Paste API key…" value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '5px 8px', fontSize: 12 }}
            />
            <button onClick={() => onApiKeyChange('')} style={{ padding: '5px 10px', background: 'var(--red)', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Clear</button>
          </div>
        </div>
      )}

      {/* Content: either critique gate or chat */}
      {showCritiqueGate ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '20px 14px' }}>
          <button
            onClick={onInitialCritique}
            disabled={loadingAi}
            style={{ width: '100%', background: 'rgba(232,255,90,0.08)', color: 'var(--accent)', border: '1px solid rgba(232,255,90,0.2)', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {loadingAi ? (
              <><span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Analyzing…</>
            ) : (
              <><Sparkles size={14} /> Get AI Coach Critique &amp; Insights</>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={idx} style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  background: isUser ? 'var(--bg4)' : 'rgba(255,255,255,0.02)',
                  border: isUser ? '1px solid var(--border2)' : '1px solid rgba(255,255,255,0.05)',
                  padding: '9px 12px',
                  borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  maxWidth: '90%',
                }}>
                  {renderMarkdown(msg.text)}
                </div>
              );
            })}
            {loadingAi && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '9px 12px', borderRadius: '12px 12px 12px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text3)' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, border: '1.5px solid var(--text3)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Analyzing…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {!loadingAi && quickReplies.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 14px 8px', flexShrink: 0 }}>
              {quickReplies.map(({ label, prompt }) => (
                <button key={label} onClick={() => onSend(prompt || label)}
                  style={{ background: 'rgba(232,255,90,0.05)', border: '1px solid rgba(232,255,90,0.15)', borderRadius: 12, padding: '4px 9px', fontSize: 10.5, color: 'var(--accent)', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); onSend(); }} style={{ display: 'flex', gap: 6, padding: '0 14px 12px', flexShrink: 0 }}>
            <input
              type="text" value={inputText} onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask anything…"
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none', minWidth: 0 }}
            />
            <button type="submit" disabled={!inputText.trim() || loadingAi}
              style={{ padding: '8px 11px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#0a0a0a', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: (!inputText.trim() || loadingAi) ? 0.4 : 1, flexShrink: 0 }}>
              <SendIcon />
            </button>
          </form>
        </>
      )}
    </div>
  ) : null;

  const fab = (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + 12px)',
        right: 16,
        width: 52, height: 52,
        borderRadius: '50%',
        background: open ? 'var(--bg3)' : 'var(--accent)',
        border: open ? '1px solid var(--border2)' : 'none',
        color: open ? 'var(--text2)' : '#0a0a0a',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300,
        boxShadow: open ? 'none' : '0 4px 16px rgba(232,255,90,0.3)',
        transition: 'all 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      title={title}
    >
      {open ? <XIcon /> : <SparkleIcon />}
    </button>
  );

  return createPortal(
    <>
      {open && <div onClick={onToggle} style={{ position: 'fixed', inset: 0, zIndex: 298, background: 'rgba(0,0,0,0.3)' }} />}
      {panel}
      {fab}
    </>,
    document.body
  );
}
