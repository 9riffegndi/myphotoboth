# Virtual Background Handover

## Scope
Fitur virtual background untuk halaman photo booth:
- Blur background
- Solid color background
- Image background
- Capture hasil komposit ke foto akhir

## Main Files
- src/VirtualBackground.tsx
- src/VirtualBgPanel.tsx
- src/app/page.tsx
- public/mediapipe/selfie_segmentation/*
- public/bg-virtual/*

## Current Architecture
1. Camera source:
- Video asli tetap dirender di DOM sebagai sumber frame (videoRef).
- Saat virtual background aktif, video dibuat opacity 0, lalu canvas VirtualBackground ditampilkan.

2. Segmentation engine:
- MediaPipe Selfie Segmentation dijalankan dari aset lokal public/mediapipe/selfie_segmentation.
- Script entry: /mediapipe/selfie_segmentation/selfie_segmentation.js
- locateFile diarahkan ke folder public yang sama.

3. Rendering pipeline di VirtualBackground.tsx:
- Ambil frame video.
- Render background target (blur/solid/image) ke offscreen canvas.
- Render foreground (video + css filter) ke offscreen canvas.
- Ambil segmentationMask dari MediaPipe.
- Lakukan temporal smoothing mask antar frame.
- Lakukan edge feathering (blur mask) untuk tepi lebih halus.
- Lakukan manual alpha compositing: out = fg * alpha + bg * (1 - alpha).
- Gambar hasil akhir ke canvas utama.

4. Capture integration:
- Saat virtual bg aktif, captureFrame() membaca dataURL dari canvas VirtualBackground.
- Saat virtual bg nonaktif, capture dari elemen video fallback.

## UI / State Wiring
- Panel pemilihan ada di src/VirtualBgPanel.tsx.
- State aktif ada di src/app/page.tsx:
  - activeBgId
  - bgOption
  - virtualBgEnabled
- Handler pilih background: handleSelectBg(id, opt).

## Assets
1. MediaPipe runtime (lokal):
- public/mediapipe/selfie_segmentation/selfie_segmentation.js
- public/mediapipe/selfie_segmentation/selfie_segmentation.binarypb
- public/mediapipe/selfie_segmentation/selfie_segmentation.tflite
- public/mediapipe/selfie_segmentation/selfie_segmentation_landscape.tflite
- public/mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.js
- public/mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.wasm

2. Preset BG image:
- public/bg-virtual/cafe1.jpeg
- public/bg-virtual/cafe2.jpeg

## Known Risks / Common Failure Points
1. Runtime abort (Module.arguments...):
- Umumnya terkait runtime WASM legacy atau init engine berulang.
- Pastikan tidak ada double-init instance tanpa cleanup yang benar.

2. Background tidak berubah:
- Cek bgOption benar-benar berubah dari panel.
- Cek image path di preset sesuai file di public/bg-virtual.
- Cek bg image sudah onload sebelum compositing.

3. Mask objek kasar / rambut jelek:
- Tuning parameter smoothing (prev/current weight).
- Tuning blur radius untuk feathering.
- Tuning modelSelection (0 vs 1) sesuai framing.

4. FPS drop:
- Manual compositing pixel-loop cukup berat di resolusi tinggi.
- Opsi optimasi: proses di resolusi lebih rendah lalu upscale.

## Quick Debug Checklist
1. Buka Network dan pastikan file mediapipe lokal loaded 200.
2. Pastikan tidak ada 404 pada /bg-virtual/*.
3. Cek console:
- init error
- send error
- segmentationMask undefined
4. Verifikasi virtualBgEnabled true saat mode selain none.
5. Verifikasi canvas VirtualBackground benar-benar visible saat aktif.

## If Continuing Improvements
Priority suggestions:
1. Tambah adaptive threshold berdasarkan luminance frame.
2. Tambah temporal clamp untuk gerakan cepat (anti ghosting).
3. Pisahkan quality mode:
- quality: high (rapi, lebih berat)
- quality: balanced (default)
- quality: performance (cepat)
4. Profiling compositing loop dan pindahkan ke WebGL shader jika perlu.

## Validation Commands
- npm run dev
- npm run build

## Notes
File ini dibuat sebagai handover untuk agent lanjutan agar bisa langsung lanjut tuning kualitas, stabilitas runtime, dan performa tanpa membaca seluruh codebase dari awal.
