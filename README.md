# IntaraBox Photo Booth

Aplikasi photo booth berbasis web yang dibangun dengan Next.js 16 dan React 19. Fokus pada fungsionalitas pengambilan foto langsung di browser dengan integrasi pemrosesan background otomatis.

---

## Fitur Utama

- **Kamera & Kontrol**:
  - Zoom kamera (0.6x - 2.5x).
  - Countdown timer (3s, 5s, 10s) dengan efek flash.
  - Pengambilan foto dalam beberapa sesi sekaligus.

- **Pemrosesan Gambar (MediaPipe)**:
  - Penghapusan dan penggantian background secara otomatis.
  - Pemrosesan dilakukan setelah pengambilan foto untuk menjaga performa di perangkat mobile.

- **Kustomisasi Layout & Frame**:
  - Berbagai pilihan grid layout.
  - Bentuk frame beragam: Oval, Heart, Hexagon, Ticket, Star, Diamond, dan Arch.
  - Dekorasi tambahan seperti pola tiling dan stiker di sudut frame.
  - Pilihan gaya bingkai (Polaroid, Minimal, dsb) dengan warna yang bisa diatur.

- **Antarmuka Pengguna**:
  - Animasi transisi antar panel menggunakan Framer Motion.
  - Responsif untuk desktop maupun perangkat mobile.
  - Preview hasil foto dalam bentuk tumpukan kartu interaktif.

- **Ekspor Hasil**:
  - Unduh hasil foto dalam format PNG berkualitas tinggi.
  - Pilihan untuk mengunduh satu hasil tertentu atau semua hasil sekaligus.

---

## Teknologi yang Digunakan

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Animasi**: [Framer Motion](https://www.framer.com/motion/)
- **AI/ML**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)

---

## Cara Menjalankan

1. Clone repositori:
   ```bash
   git clone https://github.com/9riffegndi/myphotoboth.git
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

4. Akses `http://localhost:3000` melalui browser.

---

## Pembuat
- **Website**: [ariefgunadi.my.id](https://www.ariefgunadi.my.id/)
- **GitHub**: [@9riffegndi](https://github.com/9riffegndi)

---

## Lisensi

Proyek ini menggunakan lisensi [MIT](LICENSE).
