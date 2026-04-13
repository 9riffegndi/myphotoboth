'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FRAME_COLORS, BORDER_STYLES, STICKER_CATEGORIES } from '@/data';
import type { CapturedPhoto, GridLayout, FrameColor, StickerCategory } from '@/types';
import type { BorderStyle } from '@/data';

interface Props {
  capturedPhotos: CapturedPhoto[];
  selectedGrid: GridLayout;
  onRetake: () => void;
}

/* ═══════════════════════════════════════════════
   IMAGE CACHE
═══════════════════════════════════════════════ */
const imgCache = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src)!);
  return new Promise(res => {
    const img = new Image();
    img.onload  = () => { imgCache.set(src, img); res(img); };
    img.onerror = () => res(null);
    img.src = src;
  });
}

/* ═══════════════════════════════════════════════
   SEEDED PSEUDO-RANDOM (deterministik per seed)
═══════════════════════════════════════════════ */
function sRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ═══════════════════════════════════════════════
   WARNA GELAP? (untuk smart background detection)
═══════════════════════════════════════════════ */
function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isBgDark(bg: string): boolean {
  if (bg.includes('gradient')) {
    const m = bg.match(/#[0-9a-fA-F]{6}/g);
    return m ? getLuminance(m[0]) < 0.45 : false;
  }
  if (bg.startsWith('#')) return getLuminance(bg) < 0.45;
  return false;
}

/* ═══════════════════════════════════════════════
   DRAW COVER — gambar img ke rect dengan cover crop
═══════════════════════════════════════════════ */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
  cssFilter?: string,
  radius?: number,
  shape: string = 'rect'
) {
  ctx.save();
  ctx.beginPath();
  const r = Math.min(radius ?? 0, dw / 2, dh / 2);
  
  if (shape === 'oval') {
    ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
  } else if (shape === 'hexagon') {
    const cx = dx + dw / 2; const cy = dy + dh / 2;
    const rX = dw / 2; const rY = dh / 2;
    for (let i = 0; i < 6; i++) {
       const theta = (Math.PI / 3) * i - Math.PI / 2;
       const px = cx + rX * Math.cos(theta);
       const py = cy + rY * Math.sin(theta);
       if (i === 0) ctx.moveTo(px, py);
       else ctx.lineTo(px, py);
    }
  } else if (shape === 'love') {
    const x = dx, y = dy;
    ctx.moveTo(x + dw / 2, y + dh / 4);
    ctx.bezierCurveTo(x + dw, y - dh / 8, x + dw * 1.1, y + dh * 0.6, x + dw / 2, y + dh);
    ctx.bezierCurveTo(x - dw * 0.1, y + dh * 0.6, x, y - dh / 8, x + dw / 2, y + dh / 4);
  } else if (shape === 'star') {
    const cx = dx + dw / 2, cy = dy + dh / 2;
    const rOut = Math.min(dw, dh) / 2;
    const rIn = rOut * 0.45;
    for (let i = 0; i < 10; i++) {
      const r_star = i % 2 === 0 ? rOut : rIn;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const px = cx + r_star * Math.cos(a);
      const py = cy + r_star * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else if (shape === 'triangle') {
    ctx.moveTo(dx + dw / 2, dy);
    ctx.lineTo(dx + dw, dy + dh);
    ctx.lineTo(dx, dy + dh);
  } else if (shape === 'diamond') {
    ctx.moveTo(dx + dw / 2, dy);
    ctx.lineTo(dx + dw, dy + dh / 2);
    ctx.lineTo(dx + dw / 2, dy + dh);
    ctx.lineTo(dx, dy + dh / 2);
  } else if (shape === 'arch') {
    const radiusTop = dw / 2;
    ctx.moveTo(dx, dy + dh);
    ctx.lineTo(dx, dy + radiusTop);
    ctx.arc(dx + radiusTop, dy + radiusTop, radiusTop, Math.PI, 0, false);
    ctx.lineTo(dx + dw, dy + dh);
  } else if (shape === 'ticket') {
    const cutoutR = Math.min(dw, dh) * 0.12;
    ctx.moveTo(dx + cutoutR, dy);
    ctx.lineTo(dx + dw - cutoutR, dy);
    ctx.arc(dx + dw, dy, cutoutR, Math.PI, Math.PI / 2, true);
    ctx.lineTo(dx + dw, dy + dh - cutoutR);
    ctx.arc(dx + dw, dy + dh, cutoutR, -Math.PI / 2, Math.PI, true);
    ctx.lineTo(dx + cutoutR, dy + dh);
    ctx.arc(dx, dy + dh, cutoutR, 0, -Math.PI / 2, true);
    ctx.lineTo(dx, dy + cutoutR);
    ctx.arc(dx, dy, cutoutR, Math.PI / 2, 0, true);
  } else {
    // Normal / Rounded Rectangle
    if (r > 0) {
      ctx.moveTo(dx + r, dy);
      ctx.arcTo(dx + dw, dy, dx + dw, dy + dh, r);
      ctx.arcTo(dx + dw, dy + dh, dx, dy + dh, r);
      ctx.arcTo(dx, dy + dh, dx, dy, r);
      ctx.arcTo(dx, dy, dx + dw, dy, r);
    } else {
      ctx.rect(dx, dy, dw, dh);
    }
  }
  ctx.closePath();
  ctx.clip();

  const imgA = img.naturalWidth / img.naturalHeight;
  const destA = dw / dh;
  let drawW: number, drawH: number, drawX: number, drawY: number;
  if (imgA > destA) {
    drawH = dh; drawW = dh * imgA;
    drawX = dx - (drawW - dw) / 2; drawY = dy;
  } else {
    drawW = dw; drawH = dw / imgA;
    drawX = dx; drawY = dy - (drawH - dh) / 2;
  }
  if (cssFilter && cssFilter !== 'none') ctx.filter = cssFilter;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/* ═══════════════════════════════════════════════
   APPLY BACKGROUND
═══════════════════════════════════════════════ */
function applyBackground(ctx: CanvasRenderingContext2D, bg: string, w: number, h: number) {
  if (bg.includes('gradient')) {
    const stops = bg.match(/#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)/g) ?? ['#fff', '#eee'];
    const grad = ctx.createLinearGradient(0, 0, w, h);
    stops.forEach((c, i) => grad.addColorStop(i / Math.max(stops.length - 1, 1), c));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg;
  }
  ctx.fillRect(0, 0, w, h);
}

/* ═══════════════════════════════════════════════
   DRAW TILING PATTERN
   Stiker di-loop dalam grid di seluruh canvas,
   dengan variasi ukuran, rotasi, dan posisi.
   Jika needsBackground & bg gelap → soft white glow.
═══════════════════════════════════════════════ */
function drawTilePattern(
  ctx: CanvasRenderingContext2D,
  imgs: HTMLImageElement[],
  cat: StickerCategory,
  CW: number, CH: number,
  tileStep: number,      // jarak antar pusat stiker (px)
  opacity: number,       // 0-1
  dark: boolean,
) {
  if (imgs.length === 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  const cols = Math.ceil(CW / tileStep) + 2;
  const rows = Math.ceil(CH / tileStep) + 2;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const seed = row * 997 + col * 431;

      // Posisi acak tapi deterministik
      const cx = col * tileStep + sRand(seed) * tileStep * 0.55;
      const cy = row * tileStep + sRand(seed + 1) * tileStep * 0.55;

      // Ukuran bervariasi: 60–130% dari tileStep
      const scale = 0.60 + sRand(seed + 2) * 0.70;
      const S = tileStep * scale;

      // Rotasi -40° sampai +40°
      const angle = (sRand(seed + 3) - 0.5) * Math.PI * 0.88;

      const img = imgs[Math.floor(sRand(seed + 4) * imgs.length)];
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Soft white glow di belakang karakter di bg gelap
      if (dark && cat.needsBackground) {
        ctx.save();
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.55);
        grd.addColorStop(0, 'rgba(255,255,255,0.75)');
        grd.addColorStop(0.55, 'rgba(255,255,255,0.3)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, S * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      ctx.drawImage(img, -S / 2, -S / 2, S, S);
      ctx.restore();
    }
  }

  ctx.restore();
}

/* ═══════════════════════════════════════════════
   DRAW CORNER ACCENTS
   Stiker besar di 4 pojok (+ tengah untuk portrait/landscape)
═══════════════════════════════════════════════ */
function drawCornerAccents(
  ctx: CanvasRenderingContext2D,
  imgs: HTMLImageElement[],
  cat: StickerCategory,
  CW: number, CH: number,
  dark: boolean,
) {
  if (imgs.length === 0) return;

  const minDim = Math.min(CW, CH);
  const S = Math.round(minDim * 0.17);
  const M = Math.round(S * 0.40);

  const isPortrait  = CH > CW * 1.3;
  const isLandscape = CW > CH * 1.3;

  const pts: [number, number, number][] = [
    [0, 0,   -22], [1, 0,   22],
    [0, 1,    18], [1, 1,  -18],
    ...(isPortrait  ? [[0, 0.5, -12], [1, 0.5, 12]]   as [number,number,number][] : []),
    ...(isLandscape ? [[0.5, 0,   5], [0.5, 1, -5]]   as [number,number,number][] : []),
  ];

  pts.forEach(([fx, fy, angle], i) => {
    const img = imgs[i % imgs.length];
    if (!img.complete || img.naturalWidth === 0) return;
    const cx = fx === 0 ? M : fx === 1 ? CW - M : CW * fx;
    const cy = fy === 0 ? M : fy === 1 ? CH - M : CH * fy;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);

    if (dark && cat.needsBackground) {
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.58);
      grd.addColorStop(0, 'rgba(255,255,255,0.88)');
      grd.addColorStop(0.6, 'rgba(255,255,255,0.4)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, S * 0.58, 0, Math.PI * 2); ctx.fill();
    }

    ctx.drawImage(img, -S / 2, -S / 2, S, S);
    ctx.restore();
  });
}

/* ═══════════════════════════════════════════════
   TILE SIZE PER LEVEL (1-5 → px step tergantung canvas)
═══════════════════════════════════════════════ */
function getTileStep(level: number, minDim: number): number {
  // level 1 = padat (step kecil), level 5 = jarang (step besar)
  const factors = [0.10, 0.14, 0.19, 0.25, 0.33];
  return Math.round(minDim * (factors[Math.max(0, Math.min(4, level - 1))]));
}

/* ═══════════════════════════════════════════════
   RESULT PANEL
═══════════════════════════════════════════════ */
export default function ResultPanel({ capturedPhotos, selectedGrid, onRetake }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State kontrol
  const [orient, setOrient]             = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [frame, setFrame]               = useState<FrameColor>(FRAME_COLORS[1]);
  const [customFrameHex, setCustomFrameHex] = useState('#ffffff');
  const [border, setBorder]             = useState<BorderStyle>(BORDER_STYLES[1]);
  const [decorCat, setDecorCat]         = useState<StickerCategory | null>(null);
  const [tileLevel, setTileLevel]       = useState(3);          // 1-5 kepadatan
  const [patOpacity, setPatOpacity]     = useState(45);         // 0-100
  const [showCorners, setShowCorners]   = useState(true);
  const [downloading, setDownloading]   = useState(false);
  
  // Custom Shapes & Thickness
  const [shape, setShape]               = useState<string>('rect');
  const [borderThick, setBorderThick]   = useState(50);         // 0-100 slider

  // Tentukan dimensi canvas & grid berdasarkan orientasi
  let CW = selectedGrid.canvasW;
  let CH = selectedGrid.canvasH;
  let currentCols = selectedGrid.cols;
  let currentRows = selectedGrid.rows;
  let currentSlots = selectedGrid.slots;

  const isPortraitNow = CH > CW;
  const isSquareNow = CH === CW;
  
  let doSwap = false;
  if (orient === 'portrait' && !isPortraitNow) doSwap = true;
  else if (orient === 'landscape' && (isPortraitNow || isSquareNow)) doSwap = true;

  if (doSwap) {
    if (orient === 'landscape' && isSquareNow) {
      CW = CH * (4/3); // Square -> Landscape
    } else if (orient === 'portrait' && isSquareNow) {
      CH = CW * (4/3); // Square -> Portrait
    } else {
      // Rectangle (Strip/Single dll)
      if (currentCols !== currentRows) {
        // Asimetris: hitung ukuran asli tiap cell
        const origCellW = CW / currentCols;
        const origCellH = CH / currentRows;
        
        // Geser Baris jd Kolom (Transpose array)
        [currentCols, currentRows] = [currentRows, currentCols];
        currentSlots = selectedGrid.slots.map(s => ({
          x: s.y, y: s.x, w: s.h, h: s.w
        }));
        
        // KALIKAN cell original dengan susunan kolom/baris yang baru!
        // Ini menjaga aspect ratio cell foto tetap 4:3 / sesuai asli tanpa gepeng!
        CW = origCellW * currentCols;
        CH = origCellH * currentRows;
      } else {
        // Simetris seperti NxN bukan square (misal 1x1 rasio 4:3)
        [CW, CH] = [CH, CW];
      }
    }
  }

  const refDim = Math.min(CW, CH);

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = CW; canvas.height = CH;

    // 1. Background
    const bgVal = frame.id === 'custom' ? customFrameHex : frame.background;
    applyBackground(ctx, bgVal, CW, CH);
    const dark = isBgDark(bgVal === 'custom' ? customFrameHex : bgVal);

    // 2. Pola tiling (sebelum foto)
    if (decorCat) {
      const imgs = (await Promise.all(decorCat.images.map(s => loadImg(s)))).filter(Boolean) as HTMLImageElement[];
      const step = getTileStep(tileLevel, refDim);
      drawTilePattern(ctx, imgs, decorCat, CW, CH, step, patOpacity / 100, dark);
    }

    // 3. Foto
    const thickMult   = borderThick / 50; // 50 = 1x
    const PAD         = Math.round(border.paddingRatio * refDim * thickMult);
    const GAP         = Math.round(border.gapRatio * refDim * thickMult);
    const EXTRA_BOT   = border.id === 'polaroid' ? Math.round(PAD * 1.9) : 0;
    const innerW      = CW - PAD * 2;
    const innerH      = CH - PAD * 2 - EXTRA_BOT;
    
    const totalColGaps = (currentCols - 1) * GAP;
    const totalRowGaps = (currentRows - 1) * GAP;

    for (let i = 0; i < Math.min(capturedPhotos.length, currentSlots.length); i++) {
      const slot  = currentSlots[i];
      const photo = capturedPhotos[i];
      if (!photo) continue;

      const colIdx  = Math.round((slot.x / 100) * currentCols);
      const rowIdx  = Math.round((slot.y / 100) * currentRows);
      const colSpan = Math.round((slot.w / 100) * currentCols);
      const rowSpan = Math.round((slot.h / 100) * currentRows);

      const cellW   = (innerW - totalColGaps) / currentCols;
      const cellH   = (innerH - totalRowGaps) / currentRows;
      const x = PAD + colIdx  * (cellW + GAP);
      const y = PAD + rowIdx  * (cellH + GAP);
      const w = colSpan * cellW + (colSpan - 1) * GAP;
      const h = rowSpan * cellH + (rowSpan - 1) * GAP;

      const img = await loadImg(photo.dataUrl);
      if (img) drawCover(ctx, img, x, y, w, h, photo.filter, border.photoRadius * (refDim / 1000), shape);
    }


    // 4. Polaroid label
    if (border.id === 'polaroid' && EXTRA_BOT > 0) {
      const d = new Date();
      const label = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
      ctx.font = `italic ${Math.round(EXTRA_BOT * 0.38)}px 'Times New Roman', serif`;
      ctx.fillStyle = dark ? '#fff' : '#666';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, CW / 2, CH - EXTRA_BOT / 2);
    }

    // 5. Corner accents (di atas foto)
    if (decorCat && showCorners) {
      const imgs = (await Promise.all(decorCat.images.map(s => loadImg(s)))).filter(Boolean) as HTMLImageElement[];
      drawCornerAccents(ctx, imgs, decorCat, CW, CH, dark);
    }

  }, [capturedPhotos, selectedGrid, frame, customFrameHex, border, decorCat, tileLevel, patOpacity, showCorners, orient, CW, CH, refDim, shape, borderThick]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const handleDownload = async () => {
    setDownloading(true);
    await drawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) { setDownloading(false); return; }
    const link = document.createElement('a');
    link.download = `photobooth-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    setDownloading(false);
  };

  const canvasAspect = CW / CH;

  return (
    /* 
      Layout: height 100dvh, no scroll di luar.
      Kiri: canvas (sticky), Kanan: kontrol (scrollable sendiri)
    */
    <div className="page-bg" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

      {/* HEADER */}
      <header style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        zIndex: 50,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>MyPhotoBooth</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Orientasi dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--c-ink-3)', fontWeight: 600 }}>Orientasi</span>
            <select
              value={orient}
              onChange={e => setOrient(e.target.value as typeof orient)}
              style={{
                height: 32, padding: '0 10px', borderRadius: 8,
                border: '1.5px solid var(--c-border-md)',
                background: 'var(--c-surface)', color: 'var(--c-ink)',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="auto">Auto</option>
              <option value="portrait">↕ Portrait</option>
              <option value="landscape">↔ Landscape</option>
            </select>
          </div>

          <button onClick={onRetake} className="btn btn-ghost" style={{ height: 32, padding: '0 14px', fontSize: 12, gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M5 3L1 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Foto Ulang
          </button>
        </div>
      </header>

      {/* BODY: 2-kolom, flex:1, overflow hidden */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── Kiri: Canvas preview + unduh (sticky) ── */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 12px 16px 16px',
            gap: 12,
            background: 'var(--c-bg-2)',
            borderRight: '1px solid var(--c-border)',
            minWidth: 0,
          }}
          className="canvas-col"
        >
          {/* Canvas preview */}
          <div
            className="result-canvas-wrap"
            style={{
              flex: '0 0 auto',
              maxHeight: 'calc(100dvh - 52px - 60px)',
              aspectRatio: `${CW}/${CH}`,
              maxWidth: 'min(100%, calc((100dvh - 112px) * ${CW} / ${CH}))',
            }}
          >
            <canvas
              ref={canvasRef}
              width={CW} height={CH}
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-primary"
            style={{ width: '100%', height: 44, fontSize: 14, gap: 7 }}
          >
            {downloading ? (
              <>
                <svg style={{ animation: 'spin 0.8s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Menyimpan…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M8 11L3 6m5 5l5-5M8 11V2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 13h12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Unduh Foto
              </>
            )}
          </button>
        </div>

        {/* ── Kanan: Panel kontrol (bisa scroll sendiri) ── */}
        <div
          className="no-scrollbar controls-col"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >

          {/* WARNA FRAME */}
          <Sec label="Warna Frame">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              <label
                className={`swatch ${frame.id === 'custom' ? 'selected' : ''}`}
                style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                title="Kustom"
              >
                <input type="color" value={customFrameHex} onChange={e => { setCustomFrameHex(e.target.value); setFrame(FRAME_COLORS[0]); }} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              </label>
              {FRAME_COLORS.slice(1).map(fc => (
                <button key={fc.id} type="button" onClick={() => setFrame(fc)} className={`swatch ${frame.id === fc.id ? 'selected' : ''}`} style={{ background: fc.background }} />
              ))}
            </div>
          </Sec>

          {/* GAYA BORDER */}
          <Sec label="Gaya Border">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {BORDER_STYLES.map(bs => {
                const sel = border.id === bs.id;
                return (
                  <button key={bs.id} type="button" onClick={() => setBorder(bs)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 11, border: sel ? '1.5px solid var(--c-ink)' : '1.5px solid var(--c-border-md)', background: sel ? 'var(--c-accent-bg)' : 'var(--c-surface)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  >
                    <div style={{ width: 32, height: 24, background: sel ? 'var(--c-accent-bg)' : '#ebebeb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${Math.round(bs.paddingRatio * 18)}px` }}>
                      <div style={{ width: '100%', height: '100%', background: sel ? 'var(--c-ink)' : '#c0c0c0', borderRadius: bs.photoRadius > 0 ? `${Math.min(bs.photoRadius / 4, 8)}px` : 0 }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: sel ? 'var(--c-ink)' : 'var(--c-ink-3)' }}>{bs.label}</span>
                  </button>
                );
              })}
            </div>
          </Sec>

          {/* BENTUK BINGKAI & KETEBALAN */}
          <Sec label="Bentuk & Ketebalan">
            {/* Shape Buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
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
            
            {/* Ketebalan */}
            <div>
              <LabelRow left="Ketebalan Jarak Bingkai" right={`${Math.round(borderThick * 2)}%`} />
              <input type="range" min={0} max={100} value={borderThick} onChange={e => setBorderThick(Number(e.target.value))} className="range-slider"
                style={{ background: `linear-gradient(to right, var(--c-ink) ${borderThick}%, rgba(0,0,0,0.12) ${borderThick}%)` }} />
            </div>
          </Sec>

          {/* DEKORASI KOLASE */}
          <Sec label="Dekorasi Kolase">
            {/* Pilih kategori */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <Chip active={!decorCat} onClick={() => setDecorCat(null)}>✕ Tanpa</Chip>
              {STICKER_CATEGORIES.map(cat => (
                <Chip key={cat.id} active={decorCat?.id === cat.id} onClick={() => setDecorCat(decorCat?.id === cat.id ? null : cat)}>
                  {cat.emoji} {cat.label}
                </Chip>
              ))}
            </div>

            {decorCat && (
              <>
                {/* Preview stiker */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {decorCat.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10, background: 'var(--c-bg)', padding: 3, border: '1px solid var(--c-border)' }} />
                  ))}
                  {decorCat.needsBackground && (
                    <span style={{ fontSize: 10, color: 'var(--c-ink-4)', alignSelf: 'center', fontStyle: 'italic' }}>
                      ✓ Auto-glow di frame gelap
                    </span>
                  )}
                </div>

                {/* Kepadatan pola */}
                <div style={{ marginBottom: 12 }}>
                  <LabelRow left="Kepadatan Pola" right={['Padat','','Sedang','','Jarang'][tileLevel-1]} />
                  <input type="range" min={1} max={5} step={1} value={tileLevel} onChange={e => setTileLevel(Number(e.target.value))} className="range-slider"
                    style={{ background: `linear-gradient(to right, var(--c-ink) ${(tileLevel-1)*25}%, rgba(0,0,0,0.12) ${(tileLevel-1)*25}%)` }} />
                </div>

                {/* Opacity pola */}
                <div style={{ marginBottom: 12 }}>
                  <LabelRow left="Opasitas Pola" right={`${patOpacity}%`} />
                  <input type="range" min={10} max={90} step={5} value={patOpacity} onChange={e => setPatOpacity(Number(e.target.value))} className="range-slider"
                    style={{ background: `linear-gradient(to right, var(--c-ink) ${patOpacity}%, rgba(0,0,0,0.12) ${patOpacity}%)` }} />
                </div>

                {/* Hiasan pojok */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setShowCorners(v => !v)}
                    style={{ width: 36, height: 20, borderRadius: 10, background: showCorners ? 'var(--c-ink)' : 'var(--c-border-md)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: showCorners ? 18 : 3, width: 14, height: 14, borderRadius: 7, background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink-2)' }}>Hiasan pojok besar</span>
                </label>
              </>
            )}
          </Sec>

        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 640px) {
          .canvas-col   { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid var(--c-border); }
          .controls-col { max-height: 45dvh; }
          .result-canvas-wrap canvas { max-height: 40dvh !important; }
        }
        @media (min-width: 641px) {
          .canvas-col { width: clamp(340px, 60%, 720px); }
        }
      `}</style>
    </div>
  );
}

/* ── Helper components ── */
function Sec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--c-ink-3)', marginBottom: 10 }}>
        {label}
      </p>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 30, padding: '0 10px', borderRadius: 100,
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

function LabelRow({ left, right }: { left: string; right: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-ink-3)' }}>{left}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-ink)' }}>{right}</span>
    </div>
  );
}
