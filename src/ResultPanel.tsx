'use client';

import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { FlipCardStack } from './FlipCard';
import { FRAME_COLORS, BORDER_STYLES, STICKER_CATEGORIES, FILTER_OPTIONS } from '@/data';
import type { CapturedPhoto, GridLayout, FrameColor, StickerCategory, BorderStyle, VirtualBgOption, FilterOption } from '@/types';
import VirtualBgPanel, { type ActiveBgId } from './VirtualBgPanel';
import { processCapturedPhotos } from './postCaptureSegmenter';

interface Props {
  capturedPhotos: CapturedPhoto[];
  selectedGrid: GridLayout;
  onRetake: () => void;
  initialFrame: FrameColor;
  initialCustomFrame: string;
  initialBorder: BorderStyle;
  initialShape: string;
  initialBorderThick: number;
  initialDecorCat: StickerCategory | null;
  initialTileLevel: number;
  initialPatOpacity: number;
  initialShowCorners: boolean;
}

/* ═══════════════════════════════════════════════
   IMAGE CACHE
═══════════════════════════════════════════════ */
const imgCache = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src)!);
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { imgCache.set(src, img); res(img); };
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
  if (cssFilter && cssFilter !== 'none' && 'filter' in ctx) {
    ctx.filter = cssFilter;
  }
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

  const isPortrait = CH > CW * 1.3;
  const isLandscape = CW > CH * 1.3;

  const pts: [number, number, number][] = [
    [0, 0, -22], [1, 0, 22],
    [0, 1, 18], [1, 1, -18],
    ...(isPortrait ? [[0, 0.5, -12], [1, 0.5, 12]] as [number, number, number][] : []),
    ...(isLandscape ? [[0.5, 0, 5], [0.5, 1, -5]] as [number, number, number][] : []),
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
   COLLAGE CANVAS COMPONENT
═══════════════════════════════════════════════ */
interface CollageProps {
  photos: CapturedPhoto[];
  previewFilterCss: string;
  frame: FrameColor;
  customFrameHex: string;
  border: BorderStyle;
  decorCat: StickerCategory | null;
  tileLevel: number;
  patOpacity: number;
  showCorners: boolean;
  shape: string;
  borderThick: number;
  CW: number;
  CH: number;
  currentCols: number;
  currentRows: number;
  currentSlots: any[];
}

export const CollageCanvas = forwardRef(({ photos, previewFilterCss, frame, customFrameHex, border, decorCat, tileLevel, patOpacity, showCorners, shape, borderThick, CW, CH, currentCols, currentRows, currentSlots }: CollageProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    exportCanvas: () => {
      const cvs = canvasRef.current;
      if (!cvs) return null;
      return cvs.toDataURL('image/png', 1.0);
    }
  }));

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

    // 2. Pola tiling
    if (decorCat) {
      const imgs = (await Promise.all(decorCat.images.map(s => loadImg(s)))).filter(Boolean) as HTMLImageElement[];
      const step = getTileStep(tileLevel, refDim);
      drawTilePattern(ctx, imgs, decorCat, CW, CH, step, patOpacity / 100, dark);
    }

    // 3. Foto
    const thickMult = borderThick / 50;
    const PAD = Math.round(border.paddingRatio * refDim * thickMult);
    const GAP = Math.round(border.gapRatio * refDim * thickMult);
    const EXTRA_BOT = border.id === 'polaroid' ? Math.round(PAD * 1.9) : 0;
    const innerW = CW - PAD * 2;
    const innerH = CH - PAD * 2 - EXTRA_BOT;

    const totalColGaps = (currentCols - 1) * GAP;
    const totalRowGaps = (currentRows - 1) * GAP;

    for (let i = 0; i < Math.min(photos.length, currentSlots.length); i++) {
      const slot = currentSlots[i];
      const photo = photos[i];
      if (!photo) continue;

      const colIdx = Math.round((slot.x / 100) * currentCols);
      const rowIdx = Math.round((slot.y / 100) * currentRows);
      const colSpan = Math.round((slot.w / 100) * currentCols);
      const rowSpan = Math.round((slot.h / 100) * currentRows);

      const cellW = (innerW - totalColGaps) / currentCols;
      const cellH = (innerH - totalRowGaps) / currentRows;
      const x = PAD + colIdx * (cellW + GAP);
      const y = PAD + rowIdx * (cellH + GAP);
      const w = colSpan * cellW + (colSpan - 1) * GAP;
      const h = rowSpan * cellH + (rowSpan - 1) * GAP;

      const img = await loadImg(photo.dataUrl);
      const finalPreviewFilter = previewFilterCss && previewFilterCss !== 'none' ? previewFilterCss : 'none';
      if (img) drawCover(ctx, img, x, y, w, h, finalPreviewFilter, border.photoRadius * (refDim / 1000), shape);
    }

    // 4. Polaroid label
    if (border.id === 'polaroid' && EXTRA_BOT > 0) {
      const d = new Date();
      const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      ctx.font = `italic ${Math.round(EXTRA_BOT * 0.38)}px 'Times New Roman', serif`;
      ctx.fillStyle = dark ? '#fff' : '#666';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, CW / 2, CH - EXTRA_BOT / 2);
    }

    // 5. Corner accents
    if (decorCat && showCorners) {
      const imgs = (await Promise.all(decorCat.images.map(s => loadImg(s)))).filter(Boolean) as HTMLImageElement[];
      drawCornerAccents(ctx, imgs, decorCat, CW, CH, dark);
    }

    // 6. Watermark Maint
    ctx.font = `600 ${Math.max(12, Math.round(refDim * 0.015))}px 'Inter', sans-serif`;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const wmPad = Math.max(8, Math.round(refDim * 0.015));
    ctx.fillText("", CW - wmPad, CH - wmPad); //kasih watermark disini 
  }, [photos, previewFilterCss, frame, customFrameHex, border, decorCat, tileLevel, patOpacity, showCorners, shape, borderThick, CW, CH, refDim, currentCols, currentRows, currentSlots]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const isFilterSupported = typeof window !== 'undefined' && 'filter' in (document.createElement('canvas').getContext('2d') || {});
  const canvasFilterStyle = (!isFilterSupported && previewFilterCss && previewFilterCss !== 'none') ? previewFilterCss : undefined;

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'transparent', borderRadius: 0, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: canvasFilterStyle,
          WebkitFilter: canvasFilterStyle,
        }}
      />
    </div>
  );
});

/* ═══════════════════════════════════════════════
   RESULT PANEL MAIN
═══════════════════════════════════════════════ */
export default function ResultPanel({
  capturedPhotos, selectedGrid, onRetake,
  initialFrame, initialCustomFrame, initialBorder,
  initialShape, initialBorderThick, initialDecorCat,
  initialTileLevel, initialPatOpacity, initialShowCorners
}: Props) {
  // State kontrol
  const [orient, setOrient] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [frame, setFrame] = useState<FrameColor>(initialFrame);
  const [customFrameHex, setCustomFrameHex] = useState(initialCustomFrame);
  const [border, setBorder] = useState<BorderStyle>(initialBorder);
  const [decorCat, setDecorCat] = useState<StickerCategory | null>(initialDecorCat);
  const [tileLevel, setTileLevel] = useState(initialTileLevel);
  const [patOpacity, setPatOpacity] = useState(initialPatOpacity);
  const [showCorners, setShowCorners] = useState(initialShowCorners);
  const [downloading, setDownloading] = useState(false);
  const [shape, setShape] = useState<string>(initialShape);
  const [borderThick, setBorderThick] = useState(initialBorderThick);
  const [bgPanelOpen, setBgPanelOpen] = useState(false);
  const [activeBgId, setActiveBgId] = useState<ActiveBgId>('none');
  const [bgOption, setBgOption] = useState<VirtualBgOption>({ type: 'none' });
  const [resultFilter, setResultFilter] = useState<FilterOption>(FILTER_OPTIONS[0]);
  const [processedPhotos, setProcessedPhotos] = useState<CapturedPhoto[]>(capturedPhotos);
  const [processingBg, setProcessingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState({ done: 0, total: capturedPhotos.length });

  // Group photos into sessions
  const chunks = useMemo(() => {
    const res = [];
    for (let i = 0; i < processedPhotos.length; i += selectedGrid.photoCount) {
      res.push(processedPhotos.slice(i, i + selectedGrid.photoCount));
    }
    return res;
  }, [processedPhotos, selectedGrid.photoCount]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (bgOption.type === 'none') {
        setProcessedPhotos(capturedPhotos);
        setProcessingBg(false);
        setBgProgress({ done: capturedPhotos.length, total: capturedPhotos.length });
        return;
      }

      setProcessingBg(true);
      setBgProgress({ done: 0, total: capturedPhotos.length });

      const next = await processCapturedPhotos(capturedPhotos, bgOption, (done, total) => {
        if (!cancelled) setBgProgress({ done, total });
      });

      if (!cancelled) {
        setProcessedPhotos(next);
        setProcessingBg(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [capturedPhotos, bgOption]);

  const [topIndex, setTopIndex] = useState(chunks.length > 0 ? chunks.length - 1 : 0);
  const collageRefs = useRef<Array<any>>([]);

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
      CW = CH * (4 / 3);
    } else if (orient === 'portrait' && isSquareNow) {
      CH = CW * (4 / 3);
    } else {
      if (currentCols !== currentRows) {
        const origCellW = CW / currentCols;
        const origCellH = CH / currentRows;
        [currentCols, currentRows] = [currentRows, currentCols];
        currentSlots = selectedGrid.slots.map(s => ({
          x: s.y, y: s.x, w: s.h, h: s.w
        }));
        CW = origCellW * currentCols;
        CH = origCellH * currentRows;
      } else {
        [CW, CH] = [CH, CW];
      }
    }
  }

  const downloadActive = async () => {
    if (processingBg) return;
    const activeRef = collageRefs.current[topIndex];
    if (!activeRef) return;
    setDownloading(true);
    const dataUrl = activeRef.exportCanvas();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `photobooth-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
    setDownloading(false);
  };

  const downloadAll = async () => {
    if (processingBg) return;
    setDownloading(true);
    for (let i = 0; i < chunks.length; i++) {
      const ref = collageRefs.current[i];
      if (ref) {
        const dataUrl = ref.exportCanvas();
        if (dataUrl) {
          const link = document.createElement('a');
          link.download = `photobooth-${Date.now()}-${i + 1}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
    setDownloading(false);
  };

  const canvasAspect = CW / CH;

  function handleSelectBg(id: ActiveBgId, option: VirtualBgOption) {
    setActiveBgId(id);
    setBgOption(option);
    setBgPanelOpen(false);
  }

  return (
    /* 
      Layout: height 100dvh, no scroll di luar.
      Kiri: canvas (sticky), Kanan: kontrol (scrollable sendiri)
    */
    <div className="page-bg" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

      {/* HEADER */}
      <header className="result-header" style={{
        minHeight: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
        padding: '8px 16px', gap: 10,
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-intarabox.png" alt="IntaraBox" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <a href="/" className="logo-text" style={{ fontWeight: 800, fontSize: 16, color: 'var(--c-ink)', letterSpacing: '-0.02em', textDecoration: 'none' }}>IntaraBox</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Orientasi dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="orient-text" style={{ fontSize: 11, color: 'var(--c-ink-3)', fontWeight: 600 }}>Orientasi</span>
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
            <span>Foto Ulang</span>
          </button>
        </div>
      </header>

      {/* BODY: 2-kolom, flex:1, overflow hidden */}
      <div className="result-body" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

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
            background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
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
              maxHeight: 'calc(100dvh - 52px - 90px)',
              aspectRatio: `${CW}/${CH}`,
              maxWidth: 'min(100%, calc((100dvh - 142px) * ${CW} / ${CH}))',
              position: 'relative',
              width: '100%',
            }}
          >
            <FlipCardStack onTopCardChange={setTopIndex}>
              {chunks.map((chk, i) => (
                <CollageCanvas
                  key={i}
                  ref={el => { collageRefs.current[i] = el; }}
                  photos={chk}
                  previewFilterCss={resultFilter.cssFilter}
                  CW={CW} CH={CH}
                  currentCols={currentCols} currentRows={currentRows} currentSlots={currentSlots}
                  frame={frame} customFrameHex={customFrameHex} border={border} decorCat={decorCat}
                  tileLevel={tileLevel} patOpacity={patOpacity} showCorners={showCorners}
                  shape={shape} borderThick={borderThick}
                />
              ))}
            </FlipCardStack>

            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.03em',
                zIndex: 4,
                backdropFilter: 'blur(3px)',
              }}
            >
              <span>HASIL</span>
              <span style={{ opacity: 0.8 }}>{Math.max(1, topIndex + 1)}/{Math.max(1, chunks.length)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', width: '100%', gap: 8, marginTop: 8 }}>
            <button
              onClick={downloadActive}
              disabled={downloading || processingBg}
              className="btn btn-ghost"
              style={{ flex: 1, height: 44, fontSize: 13, gap: 6, fontWeight: 700, border: '1.5px solid var(--c-border-md)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(2px)' }}
            >
              Download Yang Ini
            </button>
            <button
              onClick={downloadAll}
              disabled={downloading || processingBg}
              className="btn btn-primary"
              style={{ flex: 1.5, height: 44, fontSize: 13, gap: 6, boxShadow: '0 8px 20px rgba(15,23,42,0.22)' }}
            >
              {downloading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>Menyimpan…</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M8 11L3 6m5 5l5-5M8 11V2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 13h12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>Download Semua</span>
                </>
              )}
            </button>
          </div>

          {processingBg && (
            <div style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--c-border-md)',
              background: 'var(--c-surface)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-ink-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Memproses background foto...</span>
                <span>{Math.min(bgProgress.done, bgProgress.total)} / {bgProgress.total}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${bgProgress.total > 0 ? (bgProgress.done / bgProgress.total) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--c-ink)',
                    transition: 'width 0.18s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Kanan: Panel kontrol (bisa scroll sendiri) ── */}
        <div
          className="no-scrollbar controls-col"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >

          <Sec label="Background Foto (AI)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setBgPanelOpen(true)}
                className="btn btn-ghost"
                style={{ height: 34, padding: '0 12px', fontSize: 12, border: '1.5px solid var(--c-border-md)' }}
              >
                Pilih Background
              </button>
              <span style={{ fontSize: 11, color: 'var(--c-ink-3)', fontWeight: 600 }}>
                {activeBgId === 'none' ? 'Tanpa efek' : `Tema aktif: ${activeBgId}`}
              </span>
            </div>
            <p style={{ marginTop: 8, fontSize: 11, color: 'var(--c-ink-4)' }}>
              Optimasi mobile: foto diproses setelah capture untuk hasil edge lebih rapi dan stabil.
            </p>
          </Sec>

          <Sec label="Filter Hasil">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTER_OPTIONS.map(f => (
                <Chip key={f.id} active={resultFilter.id === f.id} onClick={() => setResultFilter(f)}>
                  {f.name}
                </Chip>
              ))}
            </div>
            <p style={{ marginTop: 8, fontSize: 11, color: 'var(--c-ink-4)' }}>
              Filter langsung terlihat di preview hasil.
            </p>
          </Sec>

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
                  <LabelRow left="Kepadatan Pola" right={['Padat', '', 'Sedang', '', 'Jarang'][tileLevel - 1]} />
                  <input type="range" min={1} max={5} step={1} value={tileLevel} onChange={e => setTileLevel(Number(e.target.value))} className="range-slider"
                    style={{ background: `linear-gradient(to right, var(--c-ink) ${(tileLevel - 1) * 25}%, rgba(0,0,0,0.12) ${(tileLevel - 1) * 25}%)` }} />
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

      {bgPanelOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 120, display: 'flex' }}>
          <div
            onClick={() => setBgPanelOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }}
          />
          <div className="panel-overlay-wrapper" style={{ zIndex: 121 }}>
            <VirtualBgPanel
              activeBgId={activeBgId}
              onSelect={handleSelectBg}
              onClose={() => setBgPanelOpen(false)}
            />
          </div>
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
          .result-body { flex-direction: column !important; }
          .canvas-col { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid var(--c-border); padding: 12px 16px !important; flex: 0 0 auto !important; }
          .controls-col { flex: 1 !important; max-height: none !important; padding-top: 16px !important; }
          .result-canvas-wrap { max-width: 100% !important; max-height: 48dvh !important; }
          .result-header { padding: 10px 12px !important; gap: 8px !important; }
          .orient-text { display: none !important; }
          .panel-overlay-wrapper {
            position: absolute; left: 0; right: 0; bottom: 0; top: auto; z-index: 9999;
            width: 100%; border-radius: 20px 20px 0 0;
            background: var(--c-surface);
            box-shadow: 0 -4px 32px rgba(0,0,0,0.15);
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
        @media (min-width: 768px) and (max-width: 1024px) {
          .canvas-col { width: 45vw !important; }
        }
        @media (min-width: 1025px) {
          .canvas-col { width: clamp(340px, 60%, 720px); }
        }
        @media (min-width: 768px) {
          .panel-overlay-wrapper {
            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 121;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Helper components ── */
function Sec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid var(--c-border)',
        borderRadius: 14,
        padding: '12px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 6px 16px rgba(15,23,42,0.05)',
      }}
    >
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
