'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { GRID_LAYOUTS, FILTER_OPTIONS, GLOW_COLORS, COUNTDOWN_OPTIONS, FRAME_COLORS, BORDER_STYLES } from '@/data';
import type { GridLayout, FilterOption, GlowColor, CapturedPhoto, ActivePanel, FrameColor, BorderStyle, StickerCategory } from '@/types';
import GridPanel from '@/GridPanel';
import FilterPanel from '@/FilterPanel';
import BersinarPanel from '@/BersinarPanel';
import BingkaiPanel from '@/BingkaiPanel';
import DekorasiPanel from '@/DekorasiPanel';
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
const IcoBingkai = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 7h14M3 13h14" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
  </svg>
);
const IcoDekorasi = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15.5L5 18L6 12L2 8L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
  const [sessions, setSessions] = useState(3);
  const [glowInt, setGlowInt] = useState(60);
  const [frame, setFrame] = useState<FrameColor>(FRAME_COLORS[1]);
  const [customFrame, setCustomFrame] = useState('#ffffff');
  const [border, setBorder] = useState<BorderStyle>(BORDER_STYLES[1]);
  const [decorCat, setDecorCat] = useState<StickerCategory | null>(null);
  const [tileLevel, setTileLevel] = useState(3);
  const [patOpacity, setPatOpacity] = useState(45);
  const [showCorners, setShowCorners] = useState(true);
  const [shape, setShape] = useState<string>('rect');
  const [borderThick, setBorderThick] = useState(50);
  const [timer, setTimer] = useState<3 | 5 | 10>(3);
  const [panel, setPanel] = useState<ActivePanel | 'bingkai' | 'dekorasi'>(null);
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
          vid.play().catch(() => { });
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
        videoRef.current.play().catch(() => { });
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

    const totalPhotos = sessions * grid.photoCount;
    for (let i = 0; i < totalPhotos; i++) {
      if (i > 0 && i % grid.photoCount === 0) {
        setCountVal(null);
        await new Promise(r => setTimeout(r, 1200)); // Jeda antar set/sesi
      }
      for (let c = timer; c >= 1; c--) { setCountVal(c); await new Promise(r => setTimeout(r, 1000)); }
      setCountVal(null);
      flash();
      setPhotos(prev => [...prev, captureFrame()]);

      // Jeda di sela tangkapan dalam 1 sesi (tidak berlaku jika memutus sesi)
      if (i < totalPhotos - 1 && (i + 1) % grid.photoCount !== 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setCapturing(false);
    setTimeout(() => setPhase('result'), 250);
  }, [capturing, camReady, grid.photoCount, timer, captureFrame, sessions]);

  const togglePanel = (p: ActivePanel | 'bingkai' | 'dekorasi') => setPanel(prev => prev === p ? null : p);

  const tools = [
    { id: 'grid' as const, icon: <IcoGrid />, label: 'Kisi' },
    { id: 'filter' as const, icon: <IcoFilter />, label: 'Filter' },
    { id: 'glow' as const, icon: <IcoGlow />, label: 'Cahaya' },
    { id: 'bingkai' as const, icon: <IcoBingkai />, label: 'Bingkai' },
    { id: 'dekorasi' as const, icon: <IcoDekorasi />, label: 'Dekorasi' },
  ];

  if (phase === 'result') {
    return (
      <ResultPanel
        capturedPhotos={photos}
        selectedGrid={grid}
        onRetake={() => { setPhotos([]); setPhase('capture'); }}
        initialFrame={frame}
        initialCustomFrame={customFrame}
        initialBorder={border}
        initialShape={shape}
        initialBorderThick={borderThick}
        initialDecorCat={decorCat}
        initialTileLevel={tileLevel}
        initialPatOpacity={patOpacity}
        initialShowCorners={showCorners}
      />
    );
  }

  return (
    /* ══════════════════════════════════════════
       ROOT: height 100dvh; overflow hidden → no scroll
    ══════════════════════════════════════════ */
    <div
      className="page-bg"
      style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}
    >
      {/* GLOBAL SVG MASKS FOR PROPER RESPONSIVE CLIPPING */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <clipPath id="mask-love" clipPathUnits="objectBoundingBox">
            <path d="M0.5,0.85 C0.5,0.85 0.1,0.5 0.1,0.3 C0.1,0.15 0.3,0.15 0.5,0.3 C0.7,0.15 0.9,0.15 0.9,0.3 C0.9,0.5 0.5,0.85 0.5,0.85 Z" />
          </clipPath>
          <clipPath id="mask-ticket" clipPathUnits="objectBoundingBox">
            <path d="M0.1,0 L0.9,0 A0.1,0.133 0 0,0 1,0.133 L1,0.867 A0.1,0.133 0 0,0 0.9,1 L0.1,1 A0.1,0.133 0 0,0 0,0.867 L0,0.133 A0.1,0.133 0 0,0 0.1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* ── HEADER ── */}
      <header className="main-header" style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        zIndex: 50,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 8 }}>
          <img src="/logo-intarabox.png" alt="IntaraBox" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <a href="/" className="logo-text" style={{ fontWeight: 800, fontSize: 16, color: 'var(--c-ink)', letterSpacing: '-0.02em', textDecoration: 'none' }}>IntaraBox</a>
        </div>

        {/* Timer chips flex center */}
        <div className="timer-container" style={{ display: 'flex', gap: 5, flex: 1, justifyContent: 'center' }}>
          {COUNTDOWN_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setTimer(s as 3 | 5 | 10)}
              className={`timer-chip ${timer === s ? 'active' : ''}`}
            >
              <span>{s}s</span>
            </button>
          ))}
        </div>

        <div className="header-right-spacer" style={{ width: 80, flexShrink: 0 }} />
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
        </aside>

        {/* PANEL OVERLAY GLOBALS (Single instance, styled for Desktop OR Mobile) */}
        {panel && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 99, display: 'flex' }}>
            <div
              className="panel-scrim"
              onClick={() => setPanel(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', transition: 'background 0.2s' }}
            />
            <div className="panel-overlay-wrapper" style={{ zIndex: 100 }}>
              {panel === 'grid' && <GridPanel selectedGridId={grid.id} onSelect={g => { setGrid(g); setPanel(null); }} onClose={() => setPanel(null)} />}
              {panel === 'filter' && <FilterPanel selectedFilterId={filter.id} videoRef={videoRef} onSelect={f => { setFilter(f); setPanel(null); }} onClose={() => setPanel(null)} />}
              {panel === 'glow' && <BersinarPanel selectedGlowId={glow.id} glowIntensity={glowInt} onSelectColor={setGlow} onChangeIntensity={setGlowInt} onClose={() => setPanel(null)} />}
              {panel === 'bingkai' && <BingkaiPanel frame={frame} setFrame={setFrame} customFrame={customFrame} setCustomFrame={setCustomFrame} border={border} setBorder={setBorder} onClose={() => setPanel(null)} />}
              {panel === 'dekorasi' && <DekorasiPanel shape={shape} setShape={setShape} borderThick={borderThick} setBorderThick={setBorderThick} decorCat={decorCat} setDecorCat={setDecorCat} tileLevel={tileLevel} setTileLevel={setTileLevel} patOpacity={patOpacity} setPatOpacity={setPatOpacity} showCorners={showCorners} setShowCorners={setShowCorners} onClose={() => setPanel(null)} />}
            </div>
          </div>
        )}

        {/* ── TENGAH ── */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 10px 10px', gap: 10, overflow: 'hidden', position: 'relative', zIndex: 10 }}>

          {/* Mobile tools (Without absolute overlay loops) */}
          <div className="show-mobile-flex" style={{ display: 'none', gap: 6, justifyContent: 'center', width: '100%', flexShrink: 0, position: 'relative', zIndex: 11 }}>
            {tools.map(t => (
              <button key={t.id} type="button" onClick={() => togglePanel(t.id)} className={`tool-item ${panel === t.id ? 'active' : ''}`} style={{ width: 64, height: 52 }}>
                {t.icon}
                <span style={{ fontSize: 10 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── Camera wrapper ── */}
          <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 720, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            <div
              className="camera-container"
              style={{
                /* Live border styling computation */
                aspectRatio: '4/3',
                maxHeight: '100%',
                maxWidth: '100%',
                width: '100%',
                background: frame.id === 'custom' ? customFrame : frame.background,
                padding: `${border.paddingRatio * (borderThick / 50) * 100}% ${border.paddingRatio * (borderThick / 50) * 100}% ${border.id === 'polaroid' ? border.paddingRatio * (borderThick / 50) * 290 : border.paddingRatio * (borderThick / 50) * 100}%`,
                borderRadius: Math.max(border.photoRadius / 10, 8),
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Pattern Background Overlay */}
              {decorCat && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${decorCat.images[0]})`,
                  backgroundSize: `${30 - tileLevel * 4}%`,
                  opacity: patOpacity / 100,
                  zIndex: 0, pointerEvents: 'none'
                }} />
              )}

              {/* Corner Accents */}
              {showCorners && decorCat && [0, 1, 2, 3].map(i => {
                const isTop = i < 2; const isLeft = i % 2 === 0;
                return (
                  <img key={i} src={decorCat.images[i % decorCat.images.length]} alt="" style={{
                    position: 'absolute',
                    top: isTop ? 0 : undefined, bottom: !isTop ? 0 : undefined,
                    left: isLeft ? 0 : undefined, right: !isLeft ? 0 : undefined,
                    width: '15%', height: '15%', objectFit: 'contain', zIndex: 12,
                    transform: `scaleX(${isLeft ? 1 : -1}) scaleY(${isTop ? 1 : -1})`,
                    pointerEvents: 'none'
                  }} />
                )
              })}

              {/* Inner wrapper map for positioning */}
              <div style={{ flex: 1, position: 'relative', width: '100%', borderRadius: `${Math.max(0, border.photoRadius / 10 - 2)}%`, overflow: 'hidden', zIndex: 5 }}>
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
                    clipPath:
                      shape === 'oval' ? 'ellipse(50% 50% at 50% 50%)' :
                        shape === 'love' ? 'url(#mask-love)' :
                          shape === 'ticket' ? 'url(#mask-ticket)' :
                            shape === 'hexagon' ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' :
                              shape === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' :
                                shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' :
                                  shape === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' :
                                    shape === 'arch' ? 'inset(0 0 0 0 round 50% 50% 0 0)' :
                                      undefined // rect unclipped natively
                  }}
                />
              </div>

              {/* Flash Overlay */}
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
              {photos.length > 0 && photos.length < sessions * grid.photoCount && countVal === null && (
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', borderRadius: 100, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, fontWeight: 700, zIndex: 20 }}>
                  <span>{photos.length} / {sessions * grid.photoCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, width: '100%', maxWidth: 340, justifyContent: 'space-between', padding: '0 4px', marginBottom: -2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sesi Foto:
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSessions(s)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: sessions === s ? 'var(--c-ink)' : 'transparent',
                    color: sessions === s ? '#fff' : 'var(--c-ink-2)',
                    border: sessions === s ? '1.5px solid var(--c-ink)' : '1.5px solid var(--c-border-md)',
                    transition: 'all 0.1s'
                  }}
                >
                  {s}x
                </button>
              ))}
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
            <span>{capturing ? `Foto ${photos.length + 1} / ${grid.photoCount}…` : 'Mulai Foto'}</span>
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
          <StripThumbs photos={photos} total={sessions * grid.photoCount} />
        </aside>
      </div>

      {/* Mobile bottom strip */}
      {photos.length > 0 && (
        <div
          className="show-mobile-flex"
          style={{ display: 'none', overflowX: 'auto', gap: 7, padding: '8px 12px', background: 'var(--c-surface)', flexShrink: 0 }}
        >
          {photos.map((p, i) => (
            <img key={i} src={p.dataUrl} alt={`${i + 1}`} style={{ height: 48, width: 'auto', borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '2px solid var(--c-ink)' }} />
          ))}
        </div>
      )}

      <footer style={{ height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', fontSize: 11, color: 'var(--c-ink-3)', zIndex: 50, gap: 12, letterSpacing: '0.02em', fontWeight: 500 }}>
        <a href="https://www.ariefgunadi.my.id/" target="_blank" rel="noopener noreferrer" className="footer-link italic">By:AriefGunadi</a>
        <span style={{ color: 'var(--c-border-md)' }}> | </span>
        <a href="https://github.com/9riffegndi" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
      </footer>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .footer-link { color: var(--c-ink-2); text-decoration: none; transition: color 0.15s; }
        .footer-link:hover { color: var(--c-ink); }
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
          .show-mobile-flex { display: flex !important; }
          .header-right-spacer { display: none !important; }
          .logo-text { font-size: 14px !important; }
          .timer-chip { padding: 0 10px !important; font-size: 11px !important; height: 28px !important; border-width: 1px !important; }
          
          /* Panel Mobile Bottom Sheet */
          .panel-overlay-wrapper {
            position: absolute; left: 0; right: 0; bottom: 0; top: auto; z-index: 9999;
            width: 100%; border-radius: 20px 20px 0 0;
            background: var(--c-surface);
            box-shadow: 0 -4px 32px rgba(0,0,0,0.15);
            animation: slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
          }
          .panel-overlay-wrapper .popup-panel {
            width: 100% !important; max-width: none !important;
            border: none !important; box-shadow: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            flex: 1; overflow-y: auto; max-height: none !important;
          }
        }
        @media (min-width: 768px) {
          .timer-chip { height: 30px; padding: 0 12px; font-size: 12px; font-weight: 700; border-width: 1.5px; }
          /* Panel Desktop Sidebar Floating */
          .panel-overlay-wrapper {
            position: absolute; left: 86px; top: 16px; z-index: 100;
          }
        }
      `}</style>
    </div>
  );
}
