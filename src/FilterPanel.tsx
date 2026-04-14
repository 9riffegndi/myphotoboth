'use client';

import { useEffect, useRef } from 'react';
import { FILTER_OPTIONS } from '@/data';
import type { FilterOption } from '@/types';

interface Props {
  selectedFilterId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSelect: (f: FilterOption) => void;
  onClose: () => void;
}

/** Draws one filter preview onto a small canvas */
function FilterThumb({
  filter,
  videoRef,
}: {
  filter: FilterOption;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let id: number;
    const draw = () => {
      const vid = videoRef.current;
      if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
        ctx.save();
        if (filter.cssFilter !== 'none') ctx.filter = filter.cssFilter;
        // cover crop square
        const vW = vid.videoWidth, vH = vid.videoHeight;
        const cS = canvas.width;
        const vMin = Math.min(vW, vH);
        const sx = (vW - vMin) / 2, sy = (vH - vMin) / 2;
        ctx.drawImage(vid, sx, sy, vMin, vMin, 0, 0, cS, cS);
        ctx.restore();
      } else {
        ctx.fillStyle = '#d1d1cf';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [filter, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={80}
      style={{ display: 'block', width: '100%', height: '100%', borderRadius: 10 }}
    />
  );
}

export default function FilterPanel({ selectedFilterId, videoRef, onSelect, onClose }: Props) {
  return (
      <div className="popup-panel" style={{ width: 300, maxWidth: '92vw' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '16px', borderBottom: '1px solid var(--c-border)' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Filter</span>
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

      <div className="no-scrollbar overflow-y-auto p-3" style={{ maxHeight: 420 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FILTER_OPTIONS.map((f) => {
            const sel = f.id === selectedFilterId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 4px',
                  borderRadius: 12,
                  border: sel ? '2px solid var(--c-ink)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#d1d1cf',
                  }}
                >
                  <FilterThumb filter={f} videoRef={videoRef} />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: sel ? 'var(--c-ink)' : 'var(--c-ink-3)',
                  }}
                >
                  {f.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
