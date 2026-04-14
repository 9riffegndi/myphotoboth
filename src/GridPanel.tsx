'use client';

import { GRID_LAYOUTS } from '@/data';
import type { GridLayout } from '@/types';

interface Props {
  selectedGridId: string;
  onSelect: (g: GridLayout) => void;
  onClose: () => void;
}

function GridSVG({ layout }: { layout: GridLayout }) {
  const S = 52;
  const pad = 5;
  const gap = 2.5;
  const inner = S - pad * 2;

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} fill="none">
      {layout.slots.map((slot, i) => {
        const x = pad + (slot.x / 100) * inner + (slot.x > 0 ? gap * (slot.x / (100 / layout.cols)) / layout.cols : 0);
        const y = pad + (slot.y / 100) * inner + (slot.y > 0 ? gap * (slot.y / (100 / layout.rows)) / layout.rows : 0);
        const w = Math.max(3, (slot.w / 100) * inner - (layout.cols > 1 ? gap / 2 : 0));
        const h = Math.max(3, (slot.h / 100) * inner - (layout.rows > 1 ? gap / 2 : 0));
        return <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" fill="currentColor" />;
      })}
    </svg>
  );
}

export default function GridPanel({ selectedGridId, onSelect, onClose }: Props) {
  return (
    <div className="popup-panel" style={{ width: 300, maxWidth: '92vw' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '16px', borderBottom: '1px solid var(--c-border)' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Layout Foto</span>
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

      {/* Grid */}
      <div className="no-scrollbar overflow-y-auto p-3" style={{ maxHeight: 360 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {GRID_LAYOUTS.map((layout) => {
            const sel = layout.id === selectedGridId;
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => onSelect(layout)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 6px',
                  borderRadius: 12,
                  border: sel ? '1.5px solid var(--c-ink)' : '1.5px solid transparent',
                  background: sel ? 'var(--c-accent-bg)' : 'var(--c-surface-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  color: sel ? 'var(--c-ink)' : 'var(--c-ink-3)',
                  fontFamily: 'inherit',
                }}
              >
                <GridSVG layout={layout} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {layout.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
