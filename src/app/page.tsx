'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { GRID_LAYOUTS, FILTER_OPTIONS, GLOW_COLORS, COUNTDOWN_OPTIONS } from '@/data';
import type { GridLayout, FilterOption, GlowColor, CapturedPhoto, ActivePanel } from '@/types';
import GridPanel from '@/GridPanel';
import FilterPanel from '@/FilterPanel';
import BersinarPanel from '@/BersinarPanel';
import ResultPanel from '@/ResultPanel';

function coverCrop(vW: number, vH: number, dW: number, dH: number): [number, number, number, number] {
  const vA = vW / vH, dA = dW / dH;
  if (vA > dA) { const sw = vH * dA; return [(vW - sw) / 2, 0, sw, vH]; }
  const sh = vW / dA; return [0, (vH - sh) / 2, vW, sh];
}

const IcoGrid = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="1.5" y="11.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11.5" y="11.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const IcoFilter = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 5h16M5 10h10M8 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IcoGlow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 2v2M10 17v2M2 10.5H0M20 10.5h-2M4.1 4.6l1.4 1.4M14.5 15l1.4 1.4M4.1 16.4l1.4-1.4M14.5 6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IcoCamera = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M4.8 4.8C4.4 5.5 3.7 5.9 2.9 6L1 6.4C.4 6.5 0 7.2 0 7.8V15c0 .8.7 1.5 1.5 1.5h17c.8 0 1.5-.7 1.5-1.5V7.8c0-.7-.4-1.3-1-1.4L17.2 6c-.8-.1-1.5-.5-1.9-1.2l-.9-1.5C14 2.5 13.3 2.2 12.6 2.1 12 2 11.5 2 11 2S9 2 8.4 2.1C7.7 2.2 7 2.5 6.6 3.3L4.8 4.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

function StripThumbs({ photos, total }: { photos: CapturedPhoto[]; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: '0 8px' }}>
      {Array.from({ length: total }, (_, i) => {
        const photo = photos[i];
        return (
          <div
            key={i}
            style={{
              width: 88, height: 66, borderRadius: 8,
              overflow: 'hidden',
              border: `2px solid ${photo ? 'var(--c-ink)' : 'var(--c-border-md)'}`,
              background: 'var(--c-bg-2)', flexShrink: 0,
            }}
          >
            {photo
              ? <img src={photo.dataUrl} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div className="thumb-empty" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.18)' }}>{i + 1}</div>
            }
          </div>
        );
      })}
    </div>
  );
}

export default function PhotoBoothPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const [grid, setGrid] = useState<GridLayout>(GRID_LAYOUTS[3]);
  const [filter, setFilter] = useState<FilterOption>(FILTER_OPTIONS[0]);
  const [glow, setGlow] = useState<GlowColor>(GLOW_COLORS[0]);
  const [glowInt, setGlowInt] = useState(60);
  const [timer, setTimer] = useState<3 | 5 | 10>(3);
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [camReady, setCamReady] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [countVal, setCountVal] = useState<number | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [phase, setPhase] = useState<'capture' | 'result'>('capture');

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        const vid = videoRef.current;
        if (vid) {
          vid.srcObject = s;
          vid.play().catch(() => {});
          vid.onloadedmetadata = () => { if (alive) setCamReady(true); };
        }
      })
      .catch(() => { if (alive) setCamErr('Kamera tidak dapat diakses. Izinkan akses kamera di browser.'); });
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // RE-ATTACH stream ke elemen <video> baru jika kembali dari Result (ter-remount)
  useEffect(() => {
    if (phase === 'capture' && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [phase]);

  useEffect(() => {
    const root = document.documentElement;
    if (glow.id === 'off' || !glow.color) {
      root.style.setProperty('--glow-opacity', '0');
    } else {
      root.style.setProperty('--glow-color', glow.color);
      root.style.setProperty('--glow-opacity', String((glowInt / 100) * 0.65));
    }
    return () => root.style.setProperty('--glow-opacity', '0');
  }, [glow, glowInt]);

  const captureFrame = useCallback((): CapturedPhoto => {
    const video = videoRef.current!;
    const W = 1280, H = 960;
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const ctx = tmp.getContext('2d')!;
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    if (filter.cssFilter !== 'none') ctx.filter = filter.cssFilter;
    const [sx, sy, sw, sh] = coverCrop(video.videoWidth, video.videoHeight, W, H);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
    return {
      id: `p${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dataUrl: tmp.toDataURL('image/jpeg', 0.95),
      filter: filter.cssFilter,
      timestamp: Date.now(),
    };
  }, [filter]);

  const flash = () => {
    const el = flashRef.current;
    if (!el) return;
    el.classList.remove('flash-overlay');
    void el.offsetWidth;
    el.classList.add('flash-overlay');
  };

  const startCapture = useCallback(async () => {
    if (capturing || !camReady) return;
    setCapturing(true);
    setPhotos([]);
    for (let i = 0; i < grid.photoCount; i++) {
      for (let c = timer; c >= 1; c--) { setCountVal(c); await new Promise(r => setTimeout(r, 1000)); }
      setCountVal(null);
      flash();
      setPhotos(prev => [...prev, captureFrame()]);
      if (i < grid.photoCount - 1) await new Promise(r => setTimeout(r, 500));
    }
    setCapturing(false);
    setTimeout(() => setPhase('result'), 250);
  }, [capturing, camReady, grid.photoCount, timer, captureFrame]);

  const togglePanel = (p: ActivePanel) => setPanel(prev => prev === p ? null : p);

  const tools = [
    { id: 'grid' as const, icon: <IcoGrid />, label: 'Kisi' },
    { id: 'filter' as const, icon: <IcoFilter />, label: 'Filter' },
    { id: 'glow' as const, icon: <IcoGlow />, label: 'Cahaya' },
  ];

  if (phase === 'result') {
    return <ResultPanel capturedPhotos={photos} selectedGrid={grid} onRetake={() => { setPhotos([]); setPhase('capture'); }} />;
  }

  return (
    /* ══════════════════════════════════════════
       ROOT: height 100dvh; overflow hidden → no scroll
    ══════════════════════════════════════════ */
    <div
      className="page-bg"
      style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}
    >

      {/* ── HEADER ── */}
      <header style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        zIndex: 50,
        position: 'relative'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>MyPhotoBooth</span>
        </div>

        {/* Timer chips di tengah absolut */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
          {COUNTDOWN_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setTimer(s as 3 | 5 | 10)}
              className={`timer-chip ${timer === s ? 'active' : ''}`}
              style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 700 }}
            >
              {s}s
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
      </header>

      {/* ── BODY (flex: 1, min-height: 0 agar tidak overflow) ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar kiri (desktop only) */}
        <aside
          className="hide-mobile"
          style={{ width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 4, position: 'relative', zIndex: 20 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 5, borderRadius: 18, background: 'var(--c-surface)', boxShadow: 'var(--shadow-md)' }}>
            {tools.map(t => (
              <button key={t.id} type="button" onClick={() => togglePanel(t.id)} className={`tool-item ${panel === t.id ? 'active' : ''}`} style={{ width: 64, height: 64 }}>
                {t.icon}
                <span style={{ fontSize: 9 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {panel && (
            <div style={{ position: 'absolute', left: '100%', top: 16, marginLeft: 6, zIndex: 100 }}>
              {panel === 'grid'   && <GridPanel    selectedGridId={grid.id}    onSelect={g => { setGrid(g); setPanel(null); }}  onClose={() => setPanel(null)} />}
              {panel === 'filter' && <FilterPanel  selectedFilterId={filter.id} videoRef={videoRef} onSelect={f => { setFilter(f); setPanel(null); }} onClose={() => setPanel(null)} />}
              {panel === 'glow'   && <BersinarPanel selectedGlowId={glow.id}   glowIntensity={glowInt} onSelectColor={setGlow} onChangeIntensity={setGlowInt} onClose={() => setPanel(null)} />}
            </div>
          )}
        </aside>

        {/* ── TENGAH ── */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 10px 10px', gap: 10, overflow: 'hidden' }}>

          {/* Mobile tools */}
          <div className="show-mobile-flex" style={{ display: 'none', gap: 6, justifyContent: 'center', width: '100%', flexShrink: 0 }}>
            {tools.map(t => (
              <button key={t.id} type="button" onClick={() => togglePanel(t.id)} className={`tool-item ${panel === t.id ? 'active' : ''}`} style={{ width: 60, height: 48 }}>
                {t.icon}
                <span style={{ fontSize: 9 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile panels */}
          {panel && (
            <div className="show-mobile-flex" style={{ display: 'none', justifyContent: 'center', width: '100%', flexShrink: 0 }}>
              {panel === 'grid'   && <GridPanel    selectedGridId={grid.id}    onSelect={g => { setGrid(g); setPanel(null); }} onClose={() => setPanel(null)} />}
              {panel === 'filter' && <FilterPanel  selectedFilterId={filter.id} videoRef={videoRef} onSelect={f => { setFilter(f); setPanel(null); }} onClose={() => setPanel(null)} />}
              {panel === 'glow'   && <BersinarPanel selectedGlowId={glow.id}   glowIntensity={glowInt} onSelectColor={setGlow} onChangeIntensity={setGlowInt} onClose={() => setPanel(null)} />}
            </div>
          )}

          {/* ── Camera wrapper: flex:1 min-height:0 memastikan camera tidak melebihi tinggi body ── */}
          <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 720, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              className="camera-container"
              style={{
                /* Kamera selalu 4:3. CSS berikut memastikan camera fit dalam
                   parent baik secara lebar maupun tinggi tanpa overflow */
                aspectRatio: '4/3',
                maxHeight: '100%',
                maxWidth: '100%',
                width: '100%',
                height: '100%',
              }}
            >
              {/* Video: scaleX(-1) = tampilan tidak mirror */}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  WebkitTransform: 'scaleX(-1)',
                  filter: filter.cssFilter !== 'none' ? filter.cssFilter : undefined,
                  borderRadius: 'inherit',
                }}
              />

              {/* Flash */}
              <div ref={flashRef} style={{ position: 'absolute', inset: 0, background: 'white', opacity: 0, pointerEvents: 'none', zIndex: 30 }} />

              {/* Loading */}
              {!camReady && !camErr && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 20 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.9s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Menunggu kamera…</span>
                </div>
              )}

              {/* Error */}
              {camErr && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px', zIndex: 20, textAlign: 'center' }}>
                  <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>📷 {camErr}</span>
                </div>
              )}

              {/* Countdown */}
              {countVal !== null && <span key={countVal} className="countdown-digit">{countVal}</span>}

              {/* Progress pill */}
              {photos.length > 0 && photos.length < grid.photoCount && countVal === null && (
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', borderRadius: 100, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, fontWeight: 700, zIndex: 20 }}>
                  {photos.length} / {grid.photoCount}
                </div>
              )}
            </div>
          </div>

          {/* Capture button */}
          <button
            onClick={startCapture}
            disabled={capturing || !camReady}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: 340, height: 48, fontSize: 15, gap: 8, flexShrink: 0 }}
          >
            <IcoCamera />
            {capturing ? `Foto ${photos.length + 1} / ${grid.photoCount}…` : 'Mulai Foto'}
          </button>

          {/* Info kisi */}
          <p style={{ fontSize: 11, color: 'var(--c-ink-4)', flexShrink: 0 }}>
            {grid.label} — {grid.photoCount} foto
          </p>
        </main>

        {/* Sidebar kanan: strip thumbs (desktop) */}
        <aside
          className="hide-mobile"
          style={{ width: 112, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, overflowY: 'auto' }}
        >
          <StripThumbs photos={photos} total={grid.photoCount} />
        </aside>
      </div>

      {/* Mobile bottom strip */}
      {photos.length > 0 && (
        <div
          className="show-mobile-flex"
          style={{ display: 'none', overflowX: 'auto', gap: 7, padding: '8px 12px', borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)', flexShrink: 0 }}
        >
          {photos.map((p, i) => (
            <img key={i} src={p.dataUrl} alt={`${i + 1}`} style={{ height: 48, width: 'auto', borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '2px solid var(--c-ink)' }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
          .show-mobile-flex { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
