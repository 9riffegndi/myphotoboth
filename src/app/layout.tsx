import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyPhotoBooth — Strip Foto Online Gratis',
  description: 'Buat strip foto kolase dengan kamera online gratis. Layout kisi, filter, efek cahaya, warna frame, dan stiker. Langsung di browser.',
  keywords: ['photo booth', 'kamera online', 'strip foto', 'kolase foto', 'filter foto'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
