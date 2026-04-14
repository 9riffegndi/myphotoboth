'use client';

import { STICKER_CATEGORIES } from '@/data';
import type { StickerCategory } from '@/types';
import { ReactNode } from 'react';

function Sec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 12 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
        background: active ? 'var(--c-ink)' : 'var(--c-surface)', color: active ? '#fff' : 'var(--c-ink-2)',
        border: active ? '1.5px solid var(--c-ink)' : '1.5px solid var(--c-border-md)',
        boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function LabelRow({ left, right }: { left: string; right: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-ink-3)' }}>{left}</p>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-ink)' }}>{right}</span>
    </div>
  );
}

interface Props {
  shape: string; setShape: (s: string) => void;
  borderThick: number; setBorderThick: (n: number) => void;
  decorCat: StickerCategory | null; setDecorCat: (c: StickerCategory | null) => void;
  tileLevel: number; setTileLevel: (n: number) => void;
  patOpacity: number; setPatOpacity: (n: number) => void;
  showCorners: boolean; setShowCorners: (b: boolean) => void;
  onClose: () => void;
}

export default function DekorasiPanel({
  shape, setShape,
  borderThick, setBorderThick,
  decorCat, setDecorCat,
  tileLevel, setTileLevel,
  patOpacity, setPatOpacity,
  showCorners, setShowCorners,
  onClose
}: Props) {
  return (
    <div className="popup-panel" style={{ width: 360, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto' }}>
      <div
        className="flex items-center justify-between sticky top-0"
        style={{ padding: '16px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', zIndex: 10 }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Potongan & Dekorasi</span>
        <button
          type="button"
          onClick={onClose}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'var(--c-surface)', cursor: 'pointer', color: 'var(--c-ink-3)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {/* SHAPE */}
        <Sec label="Bentuk Area Foto">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {['rect', 'oval', 'love', 'hexagon', 'star', 'triangle', 'diamond', 'arch', 'ticket'].map(s => {
              const labels: Record<string, string> = { 
                rect: 'Kotak', oval: 'Oval', love: 'Love', hexagon: 'Segi Enam',
                star: 'Bintang', triangle: 'Segitiga', diamond: 'Ketupat', arch: 'Kubah', ticket: 'Tiket'
              };
              return (
                <Chip key={s} active={shape === s} onClick={() => setShape(s)}>
                  {labels[s]}
                </Chip>
              );
            })}
          </div>
          <LabelRow left="Jarak Padding" right={`${Math.round(borderThick * 2)}%`} />
          <input type="range" min={0} max={100} value={borderThick} onChange={e => setBorderThick(Number(e.target.value))} className="range-slider"
            style={{ background: `linear-gradient(to right, var(--c-ink) ${borderThick}%, rgba(0,0,0,0.12) ${borderThick}%)`, marginBottom: 8 }} />
        </Sec>

        <div style={{ height: 1, background: 'var(--c-border)', margin: '4px 0 16px 0' }} />

        {/* DEKORASI */}
        <Sec label="Tema Stiker & Pola">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Chip active={!decorCat} onClick={() => setDecorCat(null)}>✕ Tanpa</Chip>
            {STICKER_CATEGORIES.map(cat => (
              <Chip key={cat.id} active={decorCat?.id === cat.id} onClick={() => setDecorCat(decorCat?.id === cat.id ? null : cat)}>
                {cat.emoji} {cat.label}
              </Chip>
            ))}
          </div>

          {decorCat && (
            <div style={{ background: 'var(--c-surface)', padding: 12, borderRadius: 12 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--c-border-md)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Stiker Ujung Sudut</span>
                <button
                  type="button" onClick={() => setShowCorners(!showCorners)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: showCorners ? 'var(--c-ink)' : 'var(--c-border-md)', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: showCorners ? 23 : 3, transition: 'left 0.2s' }} />
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <LabelRow left="Pola Latar (Kepadatan)" right={`${tileLevel}`} />
                <input type="range" min={1} max={5} step={1} value={tileLevel} onChange={e => setTileLevel(Number(e.target.value))} className="range-slider"
                  style={{ background: `linear-gradient(to right, var(--c-ink) ${(tileLevel-1)*25}%, rgba(0,0,0,0.12) ${(tileLevel-1)*25}%)` }} />
              </div>

              <div>
                <LabelRow left="Transparansi Pola" right={`${patOpacity}%`} />
                <input type="range" min={0} max={100} value={patOpacity} onChange={e => setPatOpacity(Number(e.target.value))} className="range-slider"
                  style={{ background: `linear-gradient(to right, var(--c-ink) ${patOpacity}%, rgba(0,0,0,0.12) ${patOpacity}%)` }} />
              </div>
            </div>
          )}
        </Sec>
      </div>
    </div>
  );
}
