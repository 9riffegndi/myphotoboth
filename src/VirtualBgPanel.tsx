'use client';

/**
 * VirtualBgPanel.tsx
 * ──────────────────
 * Panel popup untuk memilih virtual background:
 *   - Tanpa efek (off)
 *   - Blur (ringan, sedang, kuat)
 *   - Warna solid
 *   - Gambar preset
 *   - Upload gambar sendiri
 */

import { useRef, useState } from 'react';
import type { VirtualBgOption } from './types';

/* ═══════════════════════════════════════════════
   PRESET BACKGROUNDS
   Letakkan gambar di /public/bg-virtual/
═══════════════════════════════════════════════ */
export const VIRTUAL_BG_PRESETS: { id: string; label: string; src: string; thumb?: string }[] = [
  { id: 'cafe1',     label: 'Café 1',       src: '/bg-virtual/cafe1.jpeg' },
  { id: 'cafe2',     label: 'Café 2',       src: '/bg-virtual/cafe2.jpeg' },
  // Tambahkan preset lain jika file sudah tersedia di public/bg-virtual
];

const SOLID_COLORS = [
  { id: 'c-white',   color: '#ffffff', label: 'Putih' },
  { id: 'c-black',   color: '#0a0a0a', label: 'Hitam' },
  { id: 'c-gray',    color: '#4a4a4a', label: 'Abu' },
  { id: 'c-navy',    color: '#1a2238', label: 'Navy' },
  { id: 'c-teal',    color: '#0d7377', label: 'Teal' },
  { id: 'c-green',   color: '#1a4731', label: 'Hijau' },
  { id: 'c-rose',    color: '#ffe4e6', label: 'Rose' },
  { id: 'c-cream',   color: '#faf8f3', label: 'Krem' },
];

const BLUR_LEVELS = [
  { id: 'blur-light',  label: 'Ringan',  amount: 6  },
  { id: 'blur-medium', label: 'Sedang',  amount: 14 },
  { id: 'blur-heavy',  label: 'Kuat',    amount: 24 },
];

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
export type ActiveBgId =
  | 'none'
  | 'blur-light' | 'blur-medium' | 'blur-heavy'
  | string; // color id atau image id

interface Props {
  activeBgId: ActiveBgId;
  onSelect: (id: ActiveBgId, option: VirtualBgOption) => void;
  onClose: () => void;
}

/* ═══════════════════════════════════════════════
   PANEL COMPONENT
═══════════════════════════════════════════════ */
export default function VirtualBgPanel({ activeBgId, onSelect, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [customColor, setCustomColor] = useState('#6c63ff');
  const [uploadedSrc, setUploadedSrc] = useState<string | null>(null);
  const [uploadedId] = useState('upload-custom');

  function select(id: ActiveBgId, opt: VirtualBgOption) {
    onSelect(id, opt);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setUploadedSrc(src);
      select(uploadedId, { type: 'image', src });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="popup-panel" style={{ width: 340, maxWidth: '92vw', maxHeight: '78vh', overflowY: 'auto' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between sticky top-0"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', zIndex: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌄</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Virtual Background</span>
        </div>
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

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── OFF ── */}
        <BgSection label="Efek">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <BgChip
              active={activeBgId === 'none'}
              onClick={() => select('none', { type: 'none' })}
            >
              ✕ Tanpa Efek
            </BgChip>
          </div>
        </BgSection>

        {/* ── BLUR ── */}
        <BgSection label="Blur Background">
          <div style={{ display: 'flex', gap: 8 }}>
            {BLUR_LEVELS.map(b => (
              <BgChip
                key={b.id}
                active={activeBgId === b.id}
                onClick={() => select(b.id, { type: 'blur', blurAmount: b.amount })}
              >
                {b.label}
              </BgChip>
            ))}
          </div>
          {/* Blur preview indicator */}
          {activeBgId.startsWith('blur') && (
            <div style={{
              marginTop: 10, height: 28, borderRadius: 8,
              background: 'var(--c-bg)',
              filter: `blur(${BLUR_LEVELS.find(b => b.id === activeBgId)?.amount ?? 10}px)`,
              backgroundImage: 'linear-gradient(90deg, #f0f0f0, #d0d0d0, #f0f0f0)',
              border: '1px solid var(--c-border)'
            }} />
          )}
        </BgSection>

        {/* ── WARNA SOLID ── */}
        <BgSection label="Warna Solid">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SOLID_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => select(c.id, { type: 'color', color: c.color })}
                style={{
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  background: c.color,
                  border: activeBgId === c.id ? '2.5px solid var(--c-ink)' : '1.5px solid rgba(0,0,0,0.12)',
                  outline: activeBgId === c.id ? '2px solid var(--c-ink)' : 'none',
                  outlineOffset: 2,
                  transition: 'transform 0.15s',
                  flexShrink: 0,
                }}
              />
            ))}
            {/* Kustom warna */}
            <label
              title="Warna kustom"
              style={{
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                border: activeBgId === 'c-custom' ? '2.5px solid var(--c-ink)' : '1.5px solid rgba(0,0,0,0.12)',
                outline: activeBgId === 'c-custom' ? '2px solid var(--c-ink)' : 'none',
                outlineOffset: 2,
                position: 'relative', overflow: 'hidden', flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={customColor}
                onChange={e => {
                  setCustomColor(e.target.value);
                  select('c-custom', { type: 'color', color: e.target.value });
                }}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </label>
          </div>
        </BgSection>

        {/* ── GAMBAR PRESET ── */}
        <BgSection label="Gambar Preset">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {VIRTUAL_BG_PRESETS.map(bg => (
              <button
                key={bg.id}
                type="button"
                title={bg.label}
                onClick={() => select(bg.id, { type: 'image', src: bg.src })}
                style={{
                  aspectRatio: '16/9',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: activeBgId === bg.id ? '2.5px solid var(--c-ink)' : '1.5px solid var(--c-border-md)',
                  cursor: 'pointer',
                  background: 'var(--c-bg)',
                  padding: 0,
                  position: 'relative',
                  transition: 'transform 0.15s',
                }}
              >
                {/* Fallback: gradient placeholder per bg */}
                <div style={{
                  width: '100%', height: '100%',
                  backgroundImage: `url(${bg.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  paddingBottom: 3,
                }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    letterSpacing: '0.02em', textTransform: 'uppercase',
                    background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '1px 4px',
                  }}>
                    {bg.label}
                  </span>
                </div>
                {activeBgId === bg.id && (
                  <div style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--c-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </BgSection>

        {/* ── UPLOAD GAMBAR SENDIRI ── */}
        <BgSection label="Upload Foto Sendiri">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                height: 36, padding: '0 14px', borderRadius: 100,
                border: '1.5px solid var(--c-border-md)',
                background: 'transparent',
                color: 'var(--c-ink-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v9M4 6l4-4 4 4M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Pilih Gambar
            </button>
            {uploadedSrc && (
              <button
                type="button"
                onClick={() => select(uploadedId, { type: 'image', src: uploadedSrc })}
                style={{
                  height: 36, aspectRatio: '16/9', borderRadius: 8,
                  overflow: 'hidden', padding: 0,
                  border: activeBgId === uploadedId ? '2px solid var(--c-ink)' : '1.5px solid var(--c-border-md)',
                  cursor: 'pointer', background: 'var(--c-bg)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedSrc} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <p style={{ fontSize: 10, color: 'var(--c-ink-4)', marginTop: 6 }}>
            Format: JPG, PNG, WebP. Gambar akan disesuaikan otomatis.
          </p>
        </BgSection>

        {/* Catatan performa */}
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--c-ink-3)', lineHeight: 1.5 }}>
            💡 <strong>Tips:</strong> Virtual background memerlukan akses internet untuk memuat model AI (MediaPipe). Untuk performa terbaik, gunakan browser terbaru dan pastikan koneksi stabil.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ── Helper components ── */
function BgSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 10
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function BgChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 32, padding: '0 12px', borderRadius: 100,
        border: active ? '1.5px solid var(--c-ink)' : '1.5px solid var(--c-border-md)',
        background: active ? 'var(--c-ink)' : 'transparent',
        color: active ? 'white' : 'var(--c-ink-2)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
