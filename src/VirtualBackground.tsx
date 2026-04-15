'use client';

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

export type VirtualBgOption =
  | { type: 'blur'; blurAmount: number }
  | { type: 'color'; color: string }
  | { type: 'image'; src: string }
  | { type: 'none' };

export interface VirtualBgHandle {
  captureFrame: () => string | null;
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  bgOption: VirtualBgOption;
  cssFilter?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface Offscreens {
  bgCanvas: HTMLCanvasElement;
  personCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
  featherCanvas: HTMLCanvasElement;
  blurWorkCanvas: HTMLCanvasElement;
}

const TASKS_WASM_PATH = '/mediapipe/tasks-vision/wasm';
const SEGMENTER_MODEL_PATH = '/models/selfie_segmenter.tflite';

// Open-source inspired defaults:
// - coverage window from volcomix virtual-background ([0.5, 0.75])
// - landscape segmentation size from Jitsi (256x144)
const COVERAGE_LOW = 0.42;
const COVERAGE_HIGH = 0.82;
const SEGMENT_WIDTH = 256;
const SEGMENT_HEIGHT = 256;
const MIN_INFER_INTERVAL_MS = 33;

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

function ensureCanvasSize(c: HTMLCanvasElement, w: number, h: number) {
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
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
        runningMode: 'VIDEO',
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

const VirtualBackground = forwardRef<VirtualBgHandle, Props>(
  ({ videoRef, bgOption, cssFilter, style, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const segmenterRef = useRef<ImageSegmenter | null>(null);
    const bgImgRef = useRef<HTMLImageElement | null>(null);

    const offscreensRef = useRef<Offscreens | null>(null);
    const prevMaskRef = useRef<Float32Array | null>(null);
    const prevMaskSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
    const prevBgFrameRef = useRef<ImageData | null>(null);
    const inferCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const readyRef = useRef(false);
    const processingRef = useRef(false);
    const rafRef = useRef<number>(0);
    const lastInferTsRef = useRef(0);
    const inferSizeRef = useRef<{ w: number; h: number }>({ w: SEGMENT_WIDTH, h: SEGMENT_HEIGHT });

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        const c = canvasRef.current;
        if (!c) return null;

        // CSS transform tidak ikut tersimpan di toDataURL.
        // Balik piksel saat export agar hasil foto sama dengan preview.
        const out = document.createElement('canvas');
        out.width = c.width;
        out.height = c.height;
        const outCtx = out.getContext('2d');
        if (!outCtx) return c.toDataURL('image/jpeg', 0.95);

        outCtx.translate(out.width, 0);
        outCtx.scale(-1, 1);
        outCtx.drawImage(c, 0, 0);

        return out.toDataURL('image/jpeg', 0.95);
      },
    }));

    useEffect(() => {
      if (!offscreensRef.current) {
        offscreensRef.current = {
          bgCanvas: createCanvas(),
          personCanvas: createCanvas(),
          maskCanvas: createCanvas(),
          featherCanvas: createCanvas(),
          blurWorkCanvas: createCanvas(),
        };
      }
      if (!inferCanvasRef.current) {
        inferCanvasRef.current = createCanvas();
      }

      // Best-practice: turunkan resolusi inferensi sedikit di perangkat low-end.
      const nav = navigator as Navigator & { deviceMemory?: number };
      const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
      const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
      if (lowMemory || lowCpu) {
        inferSizeRef.current = { w: 224, h: 224 };
      }
    }, []);

    useEffect(() => {
      bgImgRef.current = null;
      if (bgOption.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          bgImgRef.current = img;
        };
        img.src = bgOption.src;
      }
    }, [bgOption]);

    const drawBackground = useCallback(
      (
        bgCtx: CanvasRenderingContext2D,
        video: HTMLVideoElement,
        personCtx: CanvasRenderingContext2D,
        blurWorkCanvas: HTMLCanvasElement,
        w: number,
        h: number
      ) => {
        bgCtx.clearRect(0, 0, w, h);

        if (bgOption.type === 'blur') {
          const blurPx = Math.max(8, Math.round(Math.min(w, h) * 0.016), bgOption.blurAmount);

          if (prevBgFrameRef.current) {
            ensureCanvasSize(blurWorkCanvas, w, h);
            const bwCtx = blurWorkCanvas.getContext('2d');
            if (bwCtx) {
              bwCtx.putImageData(prevBgFrameRef.current, 0, 0);
              bgCtx.filter = `blur(${blurPx}px)`;
              bgCtx.drawImage(blurWorkCanvas, 0, 0, w, h);
              bgCtx.filter = 'none';
            }
          } else {
            bgCtx.filter = `blur(${blurPx}px)`;
            bgCtx.drawImage(video, 0, 0, w, h);
            bgCtx.filter = 'none';
          }

          try {
            prevBgFrameRef.current = personCtx.getImageData(0, 0, w, h);
          } catch {
            // Ignore security/data extraction transient issues.
          }
          return;
        }

        if (bgOption.type === 'color') {
          bgCtx.fillStyle = bgOption.color;
          bgCtx.fillRect(0, 0, w, h);
          return;
        }

        if (bgOption.type === 'image' && bgImgRef.current) {
          const img = bgImgRef.current;
          const imgA = img.naturalWidth / img.naturalHeight;
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

          bgCtx.drawImage(img, dx, dy, dw, dh);
          return;
        }

        bgCtx.drawImage(video, 0, 0, w, h);
      },
      [bgOption]
    );

    const renderFrame = useCallback(
      (
        confidenceMask: Float32Array,
        categoryMask: Uint8Array | null,
        maskW: number,
        maskH: number,
        video: HTMLVideoElement,
        w: number,
        h: number
      ) => {
        const canvas = canvasRef.current;
        const off = offscreensRef.current;
        if (!canvas || !off) return;

        ensureCanvasSize(canvas, w, h);
        ensureCanvasSize(off.bgCanvas, w, h);
        ensureCanvasSize(off.personCanvas, w, h);
        ensureCanvasSize(off.maskCanvas, maskW, maskH);
        ensureCanvasSize(off.featherCanvas, w, h);
        ensureCanvasSize(off.blurWorkCanvas, w, h);

        if (!prevMaskRef.current || prevMaskSizeRef.current.w !== maskW || prevMaskSizeRef.current.h !== maskH) {
          prevMaskRef.current = new Float32Array(maskW * maskH);
          prevMaskSizeRef.current = { w: maskW, h: maskH };
        }

        const outCtx = canvas.getContext('2d');
        const bgCtx = off.bgCanvas.getContext('2d');
        const personCtx = off.personCanvas.getContext('2d');
        const maskCtx = off.maskCanvas.getContext('2d');
        const featherCtx = off.featherCanvas.getContext('2d');
        if (!outCtx || !bgCtx || !personCtx || !maskCtx || !featherCtx) return;

        personCtx.clearRect(0, 0, w, h);
        if (cssFilter && cssFilter !== 'none') personCtx.filter = cssFilter;
        personCtx.drawImage(video, 0, 0, w, h);
        personCtx.filter = 'none';

        drawBackground(bgCtx, video, personCtx, off.blurWorkCanvas, w, h);

        const prev = prevMaskRef.current;
        const maskImage = maskCtx.createImageData(maskW, maskH);
        const maskPx = maskImage.data;

        for (let i = 0; i < prev.length; i++) {
          let current = Math.max(0, Math.min(1, confidenceMask[i] ?? 0));

          // Gabungkan category mask untuk menekan false positive di background kompleks.
          if (categoryMask) {
            const cat = categoryMask[i] ?? 0;
            if (cat === 0) {
              // Jika model menyebut background, turunkan confidence kecuali sangat tinggi.
              current = current > 0.92 ? current : current * 0.25;
            }
          }
          const diff = Math.abs(current - prev[i]);
          const currWeight = diff > 0.18 ? 0.55 : 0.38;
          const smoothed = prev[i] * (1 - currWeight) + current * currWeight;

          const t = smoothed <= COVERAGE_LOW
            ? 0
            : smoothed >= COVERAGE_HIGH
              ? 1
              : (smoothed - COVERAGE_LOW) / (COVERAGE_HIGH - COVERAGE_LOW);
          const soft = t * t * (3 - 2 * t);

          prev[i] = soft;

          const a = Math.round(soft * 255);
          const p = i * 4;
          maskPx[p] = 255;
          maskPx[p + 1] = 255;
          maskPx[p + 2] = 255;
          maskPx[p + 3] = a;
        }

        maskCtx.putImageData(maskImage, 0, 0);

        featherCtx.clearRect(0, 0, w, h);
        // Jitsi uses ~blur(4px) for image and blur(8px) for blur mode.
        const featherPx = bgOption.type === 'image' ? 6 : 10;
        featherCtx.imageSmoothingEnabled = true;
        featherCtx.imageSmoothingQuality = 'high';
        featherCtx.filter = `blur(${featherPx}px)`;
        featherCtx.drawImage(off.maskCanvas, 0, 0, maskW, maskH, 0, 0, w, h);
        featherCtx.filter = 'none';

        personCtx.globalCompositeOperation = 'destination-in';
        personCtx.drawImage(off.featherCanvas, 0, 0, w, h);
        personCtx.globalCompositeOperation = 'source-over';

        outCtx.clearRect(0, 0, w, h);
        outCtx.drawImage(off.bgCanvas, 0, 0, w, h);
        outCtx.drawImage(off.personCanvas, 0, 0, w, h);
      },
      [bgOption.type, cssFilter, drawBackground]
    );

    const startLoop = useCallback(() => {
      const tick = () => {
        const video = videoRef.current;
        const segmenter = segmenterRef.current;

        if (
          readyRef.current &&
          segmenter &&
          video &&
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          !processingRef.current &&
          performance.now() - lastInferTsRef.current >= MIN_INFER_INTERVAL_MS
        ) {
          processingRef.current = true;
          const now = performance.now();
          lastInferTsRef.current = now;
          try {
            const inferCanvas = inferCanvasRef.current;
            if (!inferCanvas) {
              rafRef.current = requestAnimationFrame(tick);
              processingRef.current = false;
              return;
            }

            const inferSize = inferSizeRef.current;
            ensureCanvasSize(inferCanvas, inferSize.w, inferSize.h);
            const inferCtx = inferCanvas.getContext('2d');
            if (!inferCtx) {
              rafRef.current = requestAnimationFrame(tick);
              processingRef.current = false;
              return;
            }

            inferCtx.drawImage(video, 0, 0, inferSize.w, inferSize.h);

            const result = segmenter.segmentForVideo(inferCanvas, now);
            const mask = result.confidenceMasks?.[0];
            const category = result.categoryMask;
            if (mask) {
              const w = video.videoWidth;
              const h = video.videoHeight;
              const confidence = mask.getAsFloat32Array();
              const categoryData = category ? category.getAsUint8Array() : null;
              renderFrame(confidence, categoryData, mask.width, mask.height, video, w, h);
            }
            result.close();
          } catch (e) {
            console.error('[VirtualBg] segment error:', e);
          } finally {
            processingRef.current = false;
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, [renderFrame, videoRef]);

    useEffect(() => {
      let alive = true;
      readyRef.current = false;

      async function init() {
        try {
          const segmenter = await getSegmenter();
          if (!alive) return;

          segmenterRef.current = segmenter;
          readyRef.current = true;
          startLoop();
        } catch (e) {
          console.error('[VirtualBg] init error:', e);
        }
      }

      init();

      return () => {
        alive = false;
        readyRef.current = false;
        processingRef.current = false;
        cancelAnimationFrame(rafRef.current);
        segmenterRef.current = null;
      };
    }, [startLoop]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          WebkitTransform: 'scaleX(-1)',
          ...style,
        }}
      />
    );
  }
);

VirtualBackground.displayName = 'VirtualBackground';
export default VirtualBackground;
