'use client';

import { useState } from 'react';
import { GLOW_COLORS } from '@/data';
import type { GlowColor } from '@/types';

interface Props {
  selectedGlowId: string;
  glowIntensity: number;
  onSelectColor: (c: GlowColor) => void;
  onChangeIntensity: (v: number) => void;
  onClose: () => void;
}

export default function BersinarPanel({
  selectedGlowId,
  glowIntensity,
  onSelectColor,
  onChangeIntensity,
  onClose,
}: Props) {
  const [custom, setCustom] = useState('#ff8fc9');
  const isOff = selectedGlowId === 'off';

  return (
      <div className="popup-panel" style={{ width: 300, maxWidth: '92vw' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '16px', borderBottom: '1px solid var(--c-border)' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Cahaya Latar</span>
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
        {/* Color row */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 12 }}>
            Warna
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {GLOW_COLORS.map((g) => {
              const sel = g.id === selectedGlowId;

              if (g.color === null) {
                return (
                  <button
                    key={g.id}
                    type="button"
                    title="Matikan"
                    onClick={() => onSelectColor(g)}
                    className={`swatch ${sel ? 'selected' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #ddd 50%, #bbb 50%)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block', margin: 'auto' }}>
                      <line x1="3" y1="11" x2="11" y2="3" stroke="rgba(0,0,0,0.4)" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                );
              }

              if (g.isCustom) {
                return (
                  <label
                    key={g.id}
                    title="Kustom"
                    className={`swatch ${sel ? 'selected' : ''}`}
                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    <input
                      type="color"
                      value={custom}
                      onChange={(e) => {
                        setCustom(e.target.value);
                        onSelectColor({ id: 'custom', color: e.target.value, isCustom: true });
                      }}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </label>
                );
              }

              return (
                <button
                  key={g.id}
                  type="button"
                  title={g.id}
                  onClick={() => onSelectColor(g)}
                  className={`swatch ${sel ? 'selected' : ''}`}
                  style={{ background: g.color ?? undefined }}
                />
              );
            })}
          </div>
        </div>

        {/* Intensity */}
        {!isOff && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)' }}>
                Intensitas
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-ink)' }}>{glowIntensity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={glowIntensity}
              onChange={(e) => onChangeIntensity(Number(e.target.value))}
              className="range-slider"
              style={{
                background: `linear-gradient(to right, var(--c-ink) ${glowIntensity}%, rgba(0,0,0,0.12) ${glowIntensity}%)`,
              }}
            />
          </div>
        )}

        {isOff && (
          <p style={{ fontSize: 12, color: 'var(--c-ink-4)', textAlign: 'center', padding: '8px 0' }}>
            Pilih warna untuk mengaktifkan efek cahaya latar
          </p>
        )}
      </div>
    </div>
  );
}
