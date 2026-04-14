'use client';

import { FRAME_COLORS, BORDER_STYLES } from '@/data';
import type { FrameColor, BorderStyle } from '@/types';

interface Props {
  frame: FrameColor;
  setFrame: (f: FrameColor) => void;
  customFrame: string;
  setCustomFrame: (h: string) => void;
  border: BorderStyle;
  setBorder: (b: BorderStyle) => void;
  onClose: () => void;
}

export default function BingkaiPanel({
  frame, setFrame,
  customFrame, setCustomFrame,
  border, setBorder,
  onClose
}: Props) {
  return (
    <div className="popup-panel" style={{ width: 300, maxWidth: '92vw' }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--c-border)' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Pilih Bingkai</span>
        <button
          type="button"
          onClick={onClose}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'var(--c-bg)', cursor: 'pointer', color: 'var(--c-ink-3)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Frame Color */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 12 }}>
            Warna Bingkai
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {FRAME_COLORS.map(f => {
              const sel = f.id === frame.id;
              if (f.id === 'custom') {
                return (
                  <label
                    key={f.id}
                    title="Kustom"
                    className={`swatch ${sel ? 'selected' : ''}`}
                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    <input
                      type="color"
                      value={customFrame}
                      onChange={e => {
                        setCustomFrame(e.target.value);
                        setFrame(f);
                      }}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </label>
                );
              }
              return (
                <button
                  key={f.id}
                  onClick={() => setFrame(f)}
                  className={`swatch ${sel ? 'selected' : ''}`}
                  style={{ background: f.background }}
                />
              );
            })}
          </div>
        </div>

        {/* Border Style */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 12 }}>
            Potongan Foto
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {BORDER_STYLES.map(b => {
              const sel = b.id === border.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBorder(b)}
                  className={`btn ${sel ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 36, fontSize: 12, fontWeight: 600, border: sel ? 'none' : '1px solid var(--c-border-md)' }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
