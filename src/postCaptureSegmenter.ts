'use client';

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { CapturedPhoto, VirtualBgOption } from './types';

const TASKS_WASM_PATH = '/mediapipe/tasks-vision/wasm';
const SEGMENTER_MODEL_PATH = '/models/selfie_segmenter.tflite';

const COVERAGE_LOW = 0.28;
const COVERAGE_HIGH = 0.72;

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
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

function refineMask(
  confData: Float32Array,
  catData: Uint8Array | null,
  maskW: number,
  maskH: number
): Float32Array {
  const alpha = new Float32Array(confData.length);

  for (let i = 0; i < confData.length; i++) {
    let v = Math.max(0, Math.min(1, confData[i] ?? 0));
    if (catData) {
      const cat = catData[i] ?? 0;
      // Jangan terlalu menekan background label agar subjek tidak hilang.
      if (cat === 0) v *= 0.9;
      else v = Math.min(1, v * 1.04 + 0.01);
    }
    alpha[i] = softStep(v, COVERAGE_LOW, COVERAGE_HIGH);
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
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: SEGMENTER_MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: true,
      });
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }

  return segmenterPromise;
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

    const result = segmenter.segment(sourceCanvas);
    const confidence = result.confidenceMasks?.[0];
    if (!confidence) {
      result.close();
      return photo;
    }

    const category = result.categoryMask;
    const confData = confidence.getAsFloat32Array();
    const catData = category ? category.getAsUint8Array() : null;
    const maskW = confidence.width;
    const maskH = confidence.height;

    const maskCanvas = createCanvas(maskW, maskH);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      result.close();
      return photo;
    }

    let refined = refineMask(confData, catData, maskW, maskH);

    // Fallback best-practice: jika area subjek terlalu kecil, abaikan category mask
    // dan pakai confidence-only agar orang tidak hilang total.
    const coverage = estimateForegroundCoverage(refined);
    if (coverage < 0.02) {
      refined = refineMask(confData, null, maskW, maskH);
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
      result.close();
      return photo;
    }
    featherCtx.imageSmoothingEnabled = true;
    featherCtx.imageSmoothingQuality = 'high';
    featherCtx.filter = `blur(${option.type === 'image' ? 4 : 6}px)`;
    featherCtx.drawImage(maskCanvas, 0, 0, maskW, maskH, 0, 0, w, h);
    featherCtx.filter = 'none';

    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.drawImage(featherCanvas, 0, 0, w, h);
    personCtx.globalCompositeOperation = 'source-over';

    const outCanvas = createCanvas(w, h);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      result.close();
      return photo;
    }
    outCtx.drawImage(bgCanvas, 0, 0, w, h);
    outCtx.drawImage(personCanvas, 0, 0, w, h);

    result.close();

    return {
      ...photo,
      dataUrl: outCanvas.toDataURL('image/jpeg', 0.95),
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
