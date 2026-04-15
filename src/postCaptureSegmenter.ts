'use client';

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { CapturedPhoto, VirtualBgOption } from './types';

const TASKS_WASM_PATH = '/mediapipe/tasks-vision/wasm';
const SEGMENTER_MODEL_PATH = '/models/selfie_segmenter.tflite';
const LEGACY_SELFIE_BASE = '/mediapipe/selfie_segmentation';

const COVERAGE_LOW = 0.28;
const COVERAGE_HIGH = 0.72;

let segmenterPromise: Promise<ImageSegmenter> | null = null;
let legacySelfiePromise: Promise<any> | null = null;

type SegmentMaskResult = {
  confData: Float32Array;
  catData: Uint8Array | null;
  maskW: number;
  maskH: number;
  source: 'tasks' | 'legacy';
};

function estimateCoverageRaw(alpha: Float32Array, th = 0.5): number {
  let count = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > th) count++;
  }
  return count / Math.max(1, alpha.length);
}

function evaluateMaskCenterBias(alpha: Float32Array, w: number, h: number): number {
  const cx0 = Math.floor(w * 0.25);
  const cx1 = Math.ceil(w * 0.75);
  const cy0 = Math.floor(h * 0.18);
  const cy1 = Math.ceil(h * 0.86);

  let centerSum = 0;
  let centerCount = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = alpha[y * w + x];
      const inCenter = x >= cx0 && x < cx1 && y >= cy0 && y < cy1;
      if (inCenter) {
        centerSum += v;
        centerCount++;
      } else {
        edgeSum += v;
        edgeCount++;
      }
    }
  }

  const centerMean = centerSum / Math.max(1, centerCount);
  const edgeMean = edgeSum / Math.max(1, edgeCount);
  const coverage = estimateCoverageRaw(alpha, 0.5);
  const coveragePenalty = coverage < 0.02 || coverage > 0.96 ? 0.25 : 0;
  return centerMean - edgeMean - coveragePenalty;
}

function getInferMaxSide(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);

  if (isMobile) return lowMemory || lowCpu ? 768 : 960;
  if (lowMemory || lowCpu) return 896;
  return 1152;
}

function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua);
}

function hardenAlpha(alpha: Float32Array, power: number): Float32Array {
  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    out[i] = Math.max(0, Math.min(1, Math.pow(alpha[i], power)));
  }
  return out;
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function waitWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      window.clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      window.clearTimeout(id);
      reject(e);
    });
  });
}

function ensureScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const found = Array.from(document.scripts).find((s) => s.src === src);
    if (found) {
      if ((found as any).dataset.loaded === '1') {
        resolve();
      } else {
        found.addEventListener('load', () => resolve(), { once: true });
        found.addEventListener('error', () => reject(new Error('script load failed')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      (script as any).dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(script);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function softStep(v: number, low: number, high: number): number {
  if (v <= low) return 0;
  if (v >= high) return 1;
  const t = (v - low) / (high - low);
  return t * t * (3 - 2 * t);
}

function blurMask(src: Float32Array, w: number, h: number, radius: number, passes: number): Float32Array {
  if (radius <= 0 || passes <= 0) return src;
  let current = src;

  for (let pass = 0; pass < passes; pass++) {
    const tmp = new Float32Array(current.length);
    const out = new Float32Array(current.length);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          sum += current[y * w + nx];
          count++;
        }
        tmp[y * w + x] = sum / Math.max(1, count);
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          sum += tmp[ny * w + x];
          count++;
        }
        out[y * w + x] = sum / Math.max(1, count);
      }
    }

    current = out;
  }

  return current;
}

function labelComponents(bin: Uint8Array, w: number, h: number): {
  labels: Int32Array;
  areas: number[];
  touchesBorder: boolean[];
  sumX: number[];
  sumY: number[];
} {
  const labels = new Int32Array(w * h);
  const areas: number[] = [0];
  const touchesBorder: boolean[] = [false];
  const sumX: number[] = [0];
  const sumY: number[] = [0];
  let currLabel = 0;

  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (bin[idx] === 0 || labels[idx] !== 0) continue;

      currLabel++;
      areas[currLabel] = 0;
      touchesBorder[currLabel] = false;
      sumX[currLabel] = 0;
      sumY[currLabel] = 0;

      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      labels[idx] = currLabel;

      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head++;

        const cidx = cy * w + cx;
        areas[currLabel]++;
        sumX[currLabel] += cx;
        sumY[currLabel] += cy;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) {
          touchesBorder[currLabel] = true;
        }

        if (cx > 0) {
          const nidx = cidx - 1;
          if (bin[nidx] === 1 && labels[nidx] === 0) {
            labels[nidx] = currLabel;
            qx[tail] = cx - 1;
            qy[tail] = cy;
            tail++;
          }
        }
        if (cx < w - 1) {
          const nidx = cidx + 1;
          if (bin[nidx] === 1 && labels[nidx] === 0) {
            labels[nidx] = currLabel;
            qx[tail] = cx + 1;
            qy[tail] = cy;
            tail++;
          }
        }
        if (cy > 0) {
          const nidx = cidx - w;
          if (bin[nidx] === 1 && labels[nidx] === 0) {
            labels[nidx] = currLabel;
            qx[tail] = cx;
            qy[tail] = cy - 1;
            tail++;
          }
        }
        if (cy < h - 1) {
          const nidx = cidx + w;
          if (bin[nidx] === 1 && labels[nidx] === 0) {
            labels[nidx] = currLabel;
            qx[tail] = cx;
            qy[tail] = cy + 1;
            tail++;
          }
        }
      }
    }
  }

  return { labels, areas, touchesBorder, sumX, sumY };
}

function removeSpecklesAndFillHoles(alpha: Float32Array, w: number, h: number): Float32Array {
  const total = w * h;
  const fg = new Uint8Array(total);
  for (let i = 0; i < total; i++) fg[i] = alpha[i] > 0.56 ? 1 : 0;

  const fgComp = labelComponents(fg, w, h);
  let largest = 0;
  for (let i = 1; i < fgComp.areas.length; i++) {
    if (fgComp.areas[i] > largest) largest = fgComp.areas[i];
  }

  if (largest <= 0) return alpha;

  // Keep utama: komponen besar dan/atau paling dekat pusat frame.
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const diag = Math.hypot(cx, cy);
  const candidates: Array<{ label: number; score: number; area: number }> = [];

  for (let lbl = 1; lbl < fgComp.areas.length; lbl++) {
    const area = fgComp.areas[lbl];
    if (area <= 0) continue;
    const px = fgComp.sumX[lbl] / area;
    const py = fgComp.sumY[lbl] / area;
    const dist = Math.hypot(px - cx, py - cy) / Math.max(1e-6, diag);
    const areaNorm = area / Math.max(1, largest);
    const borderPenalty = fgComp.touchesBorder[lbl] ? 0.08 : 0;
    const score = areaNorm + (1 - dist) * 0.35 - borderPenalty;
    candidates.push({ label: lbl, score, area });
  }

  candidates.sort((a, b) => b.score - a.score);
  const keepLabels = new Set<number>();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const keepByArea = c.area >= Math.max(60, Math.floor(largest * 0.12));
    const keepTopSecondary = i < 2 && c.area >= Math.max(36, Math.floor(largest * 0.06));
    if (keepByArea || keepTopSecondary) keepLabels.add(c.label);
  }

  if (keepLabels.size === 0) {
    keepLabels.add(candidates[0].label);
  }

  for (let i = 0; i < total; i++) {
    const lbl = fgComp.labels[i];
    if (lbl === 0) continue;
    if (!keepLabels.has(lbl)) fg[i] = 0;
  }

  const bg = new Uint8Array(total);
  for (let i = 0; i < total; i++) bg[i] = fg[i] === 1 ? 0 : 1;

  const bgComp = labelComponents(bg, w, h);
  const maxHole = Math.max(22, Math.floor(total * 0.0012));
  for (let i = 0; i < total; i++) {
    const lbl = bgComp.labels[i];
    if (lbl === 0) continue;
    const hole = !bgComp.touchesBorder[lbl] && bgComp.areas[lbl] <= maxHole;
    if (hole) fg[i] = 1;
  }

  const cleaned = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    if (fg[i] === 1) cleaned[i] = Math.max(alpha[i], 0.62);
    else cleaned[i] = Math.min(alpha[i], 0.02);
  }
  return cleaned;
}

function refineMask(
  confData: Float32Array,
  catData: Uint8Array | null,
  maskW: number,
  maskH: number,
  opts?: { aggressive?: boolean; low?: number; high?: number }
): Float32Array {
  const aggressive = opts?.aggressive ?? true;
  const low = opts?.low ?? COVERAGE_LOW;
  const high = opts?.high ?? COVERAGE_HIGH;

  const alpha = new Float32Array(confData.length);

  for (let i = 0; i < confData.length; i++) {
    let v = Math.max(0, Math.min(1, confData[i] ?? 0));
    if (catData) {
      const cat = catData[i] ?? 0;
      // Jangan terlalu menekan background label agar subjek tidak hilang.
      if (cat === 0) v *= 0.78;
      else v = Math.min(1, v * 1.04 + 0.01);
    }
    alpha[i] = softStep(v, low, high);
  }

  let smoothed = blurMask(alpha, maskW, maskH, 1, 2);

  // Hole fill ringan agar wajah/rambut tidak mudah bolong.
  {
    const filled = new Float32Array(smoothed.length);
    for (let y = 0; y < maskH; y++) {
      for (let x = 0; x < maskW; x++) {
        const i = y * maskW + x;
        let v = smoothed[i];
        if (v < 0.62) {
          let sum = 0;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= maskW || ny >= maskH) continue;
              sum += smoothed[ny * maskW + nx];
              count++;
            }
          }
          const localMean = sum / Math.max(1, count);
          if (localMean > 0.6) v = Math.max(v, localMean * 0.94);
        }
        filled[i] = v;
      }
    }
    smoothed = filled;
  }

  if (aggressive) {
    smoothed = removeSpecklesAndFillHoles(smoothed, maskW, maskH);
  }
  smoothed = blurMask(smoothed, maskW, maskH, 1, 1);

  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] < 0.06) smoothed[i] = 0;
    else if (smoothed[i] > 0.96) smoothed[i] = 1;
  }

  return smoothed;
}

function estimateForegroundCoverage(alpha: Float32Array): number {
  let count = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > 0.45) count++;
  }
  return count / Math.max(1, alpha.length);
}

async function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(TASKS_WASM_PATH);
      try {
        return await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: SEGMENTER_MODEL_PATH,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: true,
        });
      } catch {
        return ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: SEGMENTER_MODEL_PATH,
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: true,
        });
      }
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }

  return segmenterPromise;
}

async function getLegacySelfieSegmenter(): Promise<any> {
  if (!legacySelfiePromise) {
    legacySelfiePromise = (async () => {
      const scriptUrl = `${LEGACY_SELFIE_BASE}/selfie_segmentation.js`;
      await ensureScript(scriptUrl);

      const Ctor = (window as any).SelfieSegmentation;
      if (!Ctor) throw new Error('SelfieSegmentation not found on window');

      const seg = new Ctor({
        locateFile: (file: string) => `${LEGACY_SELFIE_BASE}/${file}`,
      });
      seg.setOptions({ modelSelection: 1 });
      return seg;
    })().catch((err) => {
      legacySelfiePromise = null;
      throw err;
    });
  }

  return legacySelfiePromise;
}

async function segmentWithTasks(segmenter: ImageSegmenter, sourceCanvas: HTMLCanvasElement): Promise<SegmentMaskResult | null> {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const inferMax = getInferMaxSide();
  const longSide = Math.max(w, h);
  const scale = Math.min(1, inferMax / Math.max(1, longSide));
  const inferW = Math.max(256, Math.round(w * scale));
  const inferH = Math.max(256, Math.round(h * scale));

  const inferCanvas = createCanvas(inferW, inferH);
  const inferCtx = inferCanvas.getContext('2d');
  if (!inferCtx) return null;
  inferCtx.imageSmoothingEnabled = true;
  inferCtx.imageSmoothingQuality = 'high';
  inferCtx.drawImage(sourceCanvas, 0, 0, inferW, inferH);

  const result = segmenter.segment(inferCanvas);
  const confidence = result.confidenceMasks?.[0];
  if (!confidence) {
    result.close();
    return null;
  }

  const category = result.categoryMask;
  const out: SegmentMaskResult = {
    confData: confidence.getAsFloat32Array(),
    catData: category ? category.getAsUint8Array() : null,
    maskW: confidence.width,
    maskH: confidence.height,
    source: 'tasks',
  };
  result.close();
  return out;
}

async function segmentWithLegacySelfie(sourceCanvas: HTMLCanvasElement): Promise<SegmentMaskResult | null> {
  const seg = await waitWithTimeout(getLegacySelfieSegmenter(), 10000);

  const inferMax = Math.max(768, getInferMaxSide());
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const scale = Math.min(1, inferMax / Math.max(w, h));
  const inferW = Math.max(224, Math.round(w * scale));
  const inferH = Math.max(224, Math.round(h * scale));

  const inferCanvas = createCanvas(inferW, inferH);
  const inferCtx = inferCanvas.getContext('2d');
  if (!inferCtx) return null;
  inferCtx.imageSmoothingEnabled = true;
  inferCtx.imageSmoothingQuality = 'high';
  inferCtx.drawImage(sourceCanvas, 0, 0, inferW, inferH);

  const result = await waitWithTimeout(new Promise<any>((resolve, reject) => {
    try {
      seg.onResults((r: any) => resolve(r));
      seg.send({ image: inferCanvas }).catch((e: any) => reject(e));
    } catch (e) {
      reject(e);
    }
  }), 12000);

  if (!result?.segmentationMask) return null;

  const maskCanvas = createCanvas(inferW, inferH);
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return null;
  maskCtx.drawImage(result.segmentationMask, 0, 0, inferW, inferH);
  const img = maskCtx.getImageData(0, 0, inferW, inferH);
  const confData = new Float32Array(inferW * inferH);
  const confInv = new Float32Array(inferW * inferH);

  for (let i = 0; i < confData.length; i++) {
    const p = i * 4;
    const luma = (img.data[p] * 0.299 + img.data[p + 1] * 0.587 + img.data[p + 2] * 0.114) / 255;
    confData[i] = Math.max(0, Math.min(1, luma));
    confInv[i] = 1 - confData[i];
  }

  // Sebagian browser/device membaca polarity mask terbalik.
  // Pilih versi yang lebih masuk akal: subjek cenderung di area tengah frame.
  const scoreNormal = evaluateMaskCenterBias(confData, inferW, inferH);
  const scoreInv = evaluateMaskCenterBias(confInv, inferW, inferH);
  const finalConf = scoreInv > scoreNormal ? confInv : confData;

  return {
    confData: finalConf,
    catData: null,
    maskW: inferW,
    maskH: inferH,
    source: 'legacy',
  };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  option: VirtualBgOption,
  source: HTMLCanvasElement,
  bgImage: HTMLImageElement | null
) {
  const w = source.width;
  const h = source.height;

  if (option.type === 'blur') {
    const blurPx = Math.max(12, option.blurAmount);
    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(source, 0, 0, w, h);
    ctx.filter = 'none';
    return;
  }

  if (option.type === 'color') {
    ctx.fillStyle = option.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (option.type === 'image' && bgImage) {
    const imgA = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvA = w / h;
    let dw: number;
    let dh: number;
    let dx: number;
    let dy: number;

    if (imgA > canvA) {
      dh = h;
      dw = h * imgA;
      dx = -(dw - w) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / imgA;
      dx = 0;
      dy = -(dh - h) / 2;
    }

    ctx.drawImage(bgImage, dx, dy, dw, dh);
    return;
  }

  ctx.drawImage(source, 0, 0, w, h);
}

async function processOne(photo: CapturedPhoto, option: VirtualBgOption): Promise<CapturedPhoto> {
  if (option.type === 'none') return photo;

  try {
    const [segmenter, img] = await Promise.all([getSegmenter(), loadImage(photo.dataUrl)]);
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const sourceCanvas = createCanvas(w, h);
    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return photo;
    sourceCtx.drawImage(img, 0, 0, w, h);

    let bgImage: HTMLImageElement | null = null;
    if (option.type === 'image') {
      try {
        bgImage = await loadImage(option.src);
      } catch {
        bgImage = null;
      }
    }

    const bgCanvas = createCanvas(w, h);
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return photo;
    drawBackground(bgCtx, option, sourceCanvas, bgImage);

    const personCanvas = createCanvas(w, h);
    const personCtx = personCanvas.getContext('2d');
    if (!personCtx) return photo;
    personCtx.drawImage(sourceCanvas, 0, 0, w, h);

    const inferMax = getInferMaxSide();
    const longSide = Math.max(w, h);
    const scale = Math.min(1, inferMax / Math.max(1, longSide));
    const inferW = Math.max(256, Math.round(w * scale));
    const inferH = Math.max(256, Math.round(h * scale));

    const inferCanvas = createCanvas(inferW, inferH);
    const inferCtx = inferCanvas.getContext('2d');
    if (!inferCtx) return photo;
    inferCtx.imageSmoothingEnabled = true;
    inferCtx.imageSmoothingQuality = 'high';
    inferCtx.drawImage(sourceCanvas, 0, 0, inferW, inferH);

    let segMask: SegmentMaskResult | null = null;
    const mobile = isMobileDevice();

    // Prioritas mobile: legacy selfie dulu (lebih kompatibel di Android/iPhone).
    if (mobile) {
      try {
        segMask = await segmentWithLegacySelfie(sourceCanvas);
      } catch {
        segMask = null;
      }
    }

    if (!segMask) {
      try {
        segMask = await segmentWithTasks(segmenter, sourceCanvas);
      } catch {
        segMask = null;
      }
    }

    if (!segMask && !mobile) {
      try {
        segMask = await segmentWithLegacySelfie(sourceCanvas);
      } catch {
        segMask = null;
      }
    }

    if (!segMask) return photo;

    const { confData, catData, maskW, maskH, source } = segMask;
    const legacyMode = source === 'legacy';

    const maskCanvas = createCanvas(maskW, maskH);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      return photo;
    }

    let refined = legacyMode
      ? refineMask(confData, catData, maskW, maskH, { aggressive: false, low: 0.16, high: 0.58 })
      : refineMask(confData, catData, maskW, maskH, { aggressive: true });

    // Fallback best-practice: jika area subjek terlalu kecil, abaikan category mask
    // dan pakai confidence-only agar orang tidak hilang total.
    let coverage = estimateForegroundCoverage(refined);
    if (coverage < 0.04) {
      refined = legacyMode
        ? refineMask(confData, null, maskW, maskH, { aggressive: false, low: 0.12, high: 0.5 })
        : refineMask(confData, null, maskW, maskH, { aggressive: false, low: 0.18, high: 0.62 });
      coverage = estimateForegroundCoverage(refined);
    }

    // Safety net: jika mask hampir full foreground, coba balik polaritas.
    if (coverage > 0.98) {
      const inv = new Float32Array(confData.length);
      for (let i = 0; i < confData.length; i++) inv[i] = 1 - confData[i];
      const invRefined = legacyMode
        ? refineMask(inv, null, maskW, maskH, { aggressive: false, low: 0.12, high: 0.5 })
        : refineMask(inv, null, maskW, maskH, { aggressive: false, low: 0.18, high: 0.62 });
      const invCov = estimateForegroundCoverage(invRefined);
      if (invCov > 0.02 && invCov < 0.9) {
        refined = invRefined;
        coverage = invCov;
      }
    }

    // Rescue terakhir: jaga agar subjek tetap ada pada legacy mobile.
    if (legacyMode && coverage < 0.03) {
      const rescued = new Float32Array(refined.length);
      for (let i = 0; i < refined.length; i++) {
        const boosted = Math.max(refined[i], confData[i] * 0.88);
        rescued[i] = softStep(boosted, 0.16, 0.64);
      }
      refined = blurMask(rescued, maskW, maskH, 1, 1);
    }

    // Perjelas alpha di mobile legacy agar subjek tidak terlihat lembek/kabut.
    if (legacyMode) {
      refined = hardenAlpha(refined, 0.86);
    }

    const maskImage = maskCtx.createImageData(maskW, maskH);
    for (let i = 0; i < refined.length; i++) {
      const a = Math.round(refined[i] * 255);
      const p = i * 4;
      maskImage.data[p] = 255;
      maskImage.data[p + 1] = 255;
      maskImage.data[p + 2] = 255;
      maskImage.data[p + 3] = a;
    }
    maskCtx.putImageData(maskImage, 0, 0);

    const featherCanvas = createCanvas(w, h);
    const featherCtx = featherCanvas.getContext('2d');
    if (!featherCtx) {
      return photo;
    }
    featherCtx.imageSmoothingEnabled = true;
    featherCtx.imageSmoothingQuality = 'high';
    const featherPx = legacyMode
      ? (option.type === 'image' ? 2 : 3)
      : (option.type === 'image' ? 4 : 6);
    featherCtx.filter = `blur(${featherPx}px)`;
    featherCtx.drawImage(maskCanvas, 0, 0, maskW, maskH, 0, 0, w, h);
    featherCtx.filter = 'none';

    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.drawImage(featherCanvas, 0, 0, w, h);
    personCtx.globalCompositeOperation = 'source-over';

    const outCanvas = createCanvas(w, h);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      return photo;
    }
    outCtx.drawImage(bgCanvas, 0, 0, w, h);
    outCtx.drawImage(personCanvas, 0, 0, w, h);

    return {
      ...photo,
      dataUrl: outCanvas.toDataURL('image/jpeg', 0.98),
    };
  } catch {
    return photo;
  }
}

export async function processCapturedPhotos(
  photos: CapturedPhoto[],
  option: VirtualBgOption,
  onProgress?: (done: number, total: number) => void
): Promise<CapturedPhoto[]> {
  if (option.type === 'none') {
    onProgress?.(photos.length, photos.length);
    return photos;
  }

  const out: CapturedPhoto[] = [];
  for (let i = 0; i < photos.length; i++) {
    const processed = await processOne(photos[i], option);
    out.push(processed);
    onProgress?.(i + 1, photos.length);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  }
  return out;
}
