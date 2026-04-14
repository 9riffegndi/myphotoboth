import type { GridLayout, FilterOption, GlowColor, FrameColor, StickerCategory, BorderStyle } from './types';

/* ═══════════════════════════════════════════════
   GRID LAYOUTS
   canvasW × canvasH = dimensi output final
   Camera selalu 4:3; setiap slot menampung 1 foto
═══════════════════════════════════════════════ */
export const GRID_LAYOUTS: GridLayout[] = [
  {
    id: 'single',
    photoCount: 1,
    label: '1 Foto',
    thumbnail: '',
    cols: 1, rows: 1,
    canvasW: 1200, canvasH: 900,        // Landscape 4:3
    slots: [{ x: 0, y: 0, w: 100, h: 100 }],
  },
  {
    id: 'single_port',
    photoCount: 1,
    label: '1 Portrait',
    thumbnail: '',
    cols: 1, rows: 1,
    canvasW: 900, canvasH: 1200,         // Portrait 3:4
    slots: [{ x: 0, y: 0, w: 100, h: 100 }],
  },
  {
    id: 'strip2v',
    photoCount: 2,
    label: '2 Strip',
    thumbnail: '',
    cols: 1, rows: 2,
    canvasW: 900, canvasH: 1350,
    slots: [
      { x: 0, y: 0,  w: 100, h: 50 },
      { x: 0, y: 50, w: 100, h: 50 },
    ],
  },
  {
    id: 'strip3v',
    photoCount: 3,
    label: '3 Strip',
    thumbnail: '',
    cols: 1, rows: 3,
    canvasW: 600, canvasH: 1350,         // Classic photo strip portrait
    slots: [
      { x: 0, y: 0,     w: 100, h: 33.33 },
      { x: 0, y: 33.33, w: 100, h: 33.33 },
      { x: 0, y: 66.66, w: 100, h: 33.34 },
    ],
  },
  {
    id: 'strip4v',
    photoCount: 4,
    label: '4 Strip',
    thumbnail: '',
    cols: 1, rows: 4,
    canvasW: 600, canvasH: 1600,
    slots: [
      { x: 0, y: 0,  w: 100, h: 25 },
      { x: 0, y: 25, w: 100, h: 25 },
      { x: 0, y: 50, w: 100, h: 25 },
      { x: 0, y: 75, w: 100, h: 25 },
    ],
  },
  {
    id: 'grid2x2',
    photoCount: 4,
    label: '4 Kotak',
    thumbnail: '',
    cols: 2, rows: 2,
    canvasW: 1200, canvasH: 1200,
    slots: [
      { x: 0,  y: 0,  w: 50, h: 50 },
      { x: 50, y: 0,  w: 50, h: 50 },
      { x: 0,  y: 50, w: 50, h: 50 },
      { x: 50, y: 50, w: 50, h: 50 },
    ],
  },
  {
    id: 'strip3h',
    photoCount: 3,
    label: '3 Baris',
    thumbnail: '',
    cols: 3, rows: 1,
    canvasW: 1500, canvasH: 600,          // Landscape strip
    slots: [
      { x: 0,     y: 0, w: 33.33, h: 100 },
      { x: 33.33, y: 0, w: 33.33, h: 100 },
      { x: 66.66, y: 0, w: 33.34, h: 100 },
    ],
  },
];

/* ═══════════════════════════════════════════════
   FILTER OPTIONS
═══════════════════════════════════════════════ */
export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'normal',  name: 'Normal',   cssFilter: 'none' },
  { id: 'lembut',  name: 'Lembut',   cssFilter: 'brightness(1.06) saturate(0.85) contrast(0.93)' },
  { id: 'bw',      name: 'B&W',      cssFilter: 'grayscale(1) contrast(1.08)' },
  { id: 'bw-soft', name: 'B&WSoft',  cssFilter: 'grayscale(1) brightness(1.14) contrast(0.88)' },
  { id: 'bw-hard', name: 'B&WHard',  cssFilter: 'grayscale(1) brightness(0.88) contrast(1.35)' },
  { id: 'warm',    name: 'Hangat',   cssFilter: 'sepia(0.22) saturate(1.3) brightness(1.05) hue-rotate(-8deg)' },
  { id: 'cool',    name: 'Sejuk',    cssFilter: 'saturate(0.75) brightness(1.04) hue-rotate(188deg) contrast(0.96)' },
  { id: 'retro',   name: 'Retro',    cssFilter: 'sepia(0.42) saturate(1.25) contrast(1.05) brightness(1.02)' },
  { id: 'fade',    name: 'Fade',     cssFilter: 'brightness(1.1) saturate(0.6) contrast(0.85)' },
  { id: 'vivid',   name: 'Vivid',    cssFilter: 'saturate(1.5) contrast(1.05) brightness(1.02)' },
  { id: 'sinema',  name: 'Sinema',   cssFilter: 'contrast(1.18) saturate(0.88) brightness(0.94)' },
  { id: 'malam',   name: 'Malam',    cssFilter: 'brightness(0.72) saturate(0.82) hue-rotate(195deg) contrast(1.12)' },
];

/* ═══════════════════════════════════════════════
   GLOW COLORS
═══════════════════════════════════════════════ */
export const GLOW_COLORS: GlowColor[] = [
  { id: 'off',     color: null },
  { id: 'custom',  color: 'custom', isCustom: true },
  { id: 'white',   color: '#eeeeee' },
  { id: 'amber',   color: '#fbbf24' },
  { id: 'rose',    color: '#fb7185' },
  { id: 'violet',  color: '#a78bfa' },
  { id: 'cyan',    color: '#67e8f9' },
  { id: 'emerald', color: '#34d399' },
  { id: 'sky',     color: '#38bdf8' },
  { id: 'orange',  color: '#fb923c' },
];

/* ═══════════════════════════════════════════════
   FRAME COLORS
═══════════════════════════════════════════════ */
export const FRAME_COLORS: FrameColor[] = [
  { id: 'custom',     background: 'custom' },
  { id: 'white',      background: '#ffffff' },
  { id: 'black',      background: '#0a0a0a' },
  { id: 'cream',      background: '#faf8f3' },
  { id: 'light-gray', background: '#f0f0ee' },
  { id: 'warm-gray',  background: '#e8e4dc' },
  { id: 'blush',      background: '#f7e8e8' },
  { id: 'lavender',   background: '#ede8f5' },
  { id: 'sky-blue',   background: '#e8f1f8' },
  { id: 'sage',       background: '#e8f0e8' },
  { id: 'peach',      background: '#f5ece5' },
  { id: 'navy',       background: '#1a2238' },
  { id: 'forest',     background: '#1a2e1a' },
  { id: 'grad-light', background: 'linear-gradient(135deg, #f8f8f6 0%, #ececea 100%)' },
  { id: 'grad-warm',  background: 'linear-gradient(135deg, #faf4ee 0%, #f0e8de 100%)' },
  { id: 'grad-dark',  background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' },
];

/* ═══════════════════════════════════════════════
   BORDER STYLES
═══════════════════════════════════════════════ */
export const BORDER_STYLES: BorderStyle[] = [
  { id: 'flush',    label: 'Tanpa',    paddingRatio: 0,     gapRatio: 0,     photoRadius: 0   },
  { id: 'thin',     label: 'Tipis',    paddingRatio: 0.025, gapRatio: 0.015, photoRadius: 0   },
  { id: 'medium',   label: 'Sedang',   paddingRatio: 0.04,  gapRatio: 0.025, photoRadius: 0   },
  { id: 'thick',    label: 'Tebal',    paddingRatio: 0.065, gapRatio: 0.035, photoRadius: 0   },
  { id: 'round',    label: 'Bulat',    paddingRatio: 0.04,  gapRatio: 0.025, photoRadius: 16  },
  { id: 'polaroid', label: 'Polaroid', paddingRatio: 0.03,  gapRatio: 0.02,  photoRadius: 4   },
  { id: 'film',     label: 'Film',     paddingRatio: 0.015, gapRatio: 0.008, photoRadius: 0   },
  { id: 'arch',     label: 'Lengkung', paddingRatio: 0.04,  gapRatio: 0.025, photoRadius: 999 },
];

/* ═══════════════════════════════════════════════
   COUNTDOWN OPTIONS
═══════════════════════════════════════════════ */
export const COUNTDOWN_OPTIONS = [3, 5, 10] as const;
export type CountdownSeconds = (typeof COUNTDOWN_OPTIONS)[number];

/* ═══════════════════════════════════════════════
   STICKER CATEGORIES (dari public/asset-kolase)
   Diurutkan dari yang paling cocok untuk kolase estetik
═══════════════════════════════════════════════ */
export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'stars',
    label: 'Starfall',
    emoji: '✦',
    needsBackground: false,  // sparkle shapes → ok tanpa backing
    images: [
      '/asset-kolase/stars/Whisk_89f00c0ab3b480786824045bd61231dbdr.png',
      '/asset-kolase/stars/Whisk_9a3b7f9d05fe938b9a04c0d9bc05f078dr.png',
      '/asset-kolase/stars/Whisk_c18892c1efff65c925b45d25f9facbfcdr.png',
      '/asset-kolase/stars/Whisk_d67020b5d2d3d8a81294557233407ea7dr.png',
    ],
  },
  {
    id: 'bunga',
    label: 'Wildflower',
    emoji: '🌸',
    needsBackground: false,  // pola bunga flat
    images: [
      '/asset-kolase/bunga/Whisk_0186b3934c5910c8de0428ec0d81a887dr.png',
      '/asset-kolase/bunga/Whisk_13bf7725e9c5a6e890949859902f9067dr.png',
      '/asset-kolase/bunga/Whisk_c6c482b5af861e4994743f574f89c57bdr.png',
      '/asset-kolase/bunga/Whisk_da9471bfa33634387414124be1d07e17dr.png',
    ],
  },
  {
    id: 'pita',
    label: 'Ribbon Dream',
    emoji: '🎀',
    needsBackground: false,  // pita dekoratif
    images: [
      '/asset-kolase/pita/Whisk_0589b89e504179f96d94a79a5e82e789dr.png',
      '/asset-kolase/pita/Whisk_34cd3067585304fa88e4000307befbb6dr.png',
      '/asset-kolase/pita/Whisk_739ffb48eac523590e64c290275c8c4ddr.png',
      '/asset-kolase/pita/Whisk_76687d2c7b9539aae6b42c1b70782d14dr.png',
    ],
  },
  {
    id: 'bulan',
    label: 'Moonlight',
    emoji: '🌙',
    needsBackground: false,  // shape bulan/bintang
    images: [
      '/asset-kolase/bulan/Whisk_4ff5daffc942f0a9d1f4ca370823aa14dr.png',
      '/asset-kolase/bulan/Whisk_95d4946ca362fcd88444f17f2b7b011cdr.png',
      '/asset-kolase/bulan/Whisk_ef0aa13d3be25ddb8d04a468bd10a826dr.png',
      '/asset-kolase/bulan/Whisk_fbf9ee5ea65dfb2b8e7467ab5f8e77b7dr.png',
    ],
  },
  {
    id: 'awan',
    label: 'Cloud Nine',
    emoji: '☁️',
    needsBackground: false,  // awan putih → butuh backing di bg putih; di gelap bagus
    images: [
      '/asset-kolase/awan/Whisk_2af4579ed421658a65f402143facce8cdr.png',
      '/asset-kolase/awan/Whisk_336e5e14f4264caad1d415dc6eade957dr.png',
      '/asset-kolase/awan/Whisk_95edb4e935ebb628f8348d15cc5669bfdr.png',
      '/asset-kolase/awan/Whisk_ab32688c956d1c887ba49cd54971e905dr.png',
    ],
  },
  {
    id: 'kucing',
    label: 'Meow Meow',
    emoji: '🐱',
    needsBackground: true,   // karakter berwarna
    images: [
      '/asset-kolase/kucing/Whisk_612ed16f276034eaff74b08141eb3f34dr.png',
      '/asset-kolase/kucing/Whisk_62390cb17fd6fa7b04741da54ca6f94bdr.png',
      '/asset-kolase/kucing/Whisk_680bdffb5e46e44812f41795d29f9cd4dr.png',
      '/asset-kolase/kucing/Whisk_c0e3ba9b95a98aaa0964358dd1e79118dr.png',
    ],
  },
  {
    id: 'panda',
    label: 'Panda Gang',
    emoji: '🐼',
    needsBackground: true,   // karakter panda berwarna
    images: [
      '/asset-kolase/panda/Whisk_2d9780034a0e515862c40545d9c7348fdr.png',
      '/asset-kolase/panda/Whisk_79361d8eaef7b66bab4470fe581eb909dr.png',
      '/asset-kolase/panda/Whisk_a1e0b7e877bc223a96d41a60f9037068dr.png',
      '/asset-kolase/panda/Whisk_f9743c67d1b1e4a87014e4a8342e3d65dr.png',
    ],
  },
  {
    id: 'anakayam',
    label: 'Chickling',
    emoji: '🐥',
    needsBackground: true,   // karakter ayam berwarna
    images: [
      '/asset-kolase/anakayam/Whisk_50b0bee785886699d224e83d8eb52731dr.png',
      '/asset-kolase/anakayam/Whisk_a8e93d5b452f655ab4544dc3a60d5c5adr.png',
      '/asset-kolase/anakayam/Whisk_b0933fa1ecdfcd6a12a4d2bae23c7183dr.png',
      '/asset-kolase/anakayam/Whisk_ccb5a0ab96426088b00435fc8e48c066dr.png',
    ],
  },
  {
    id: 'anjing',
    label: 'Good Boy',
    emoji: '🐶',
    needsBackground: true,   // karakter anjing
    images: [
      '/asset-kolase/anjing/Whisk_062917b3b989485b07f4eb19b9c3c9bbdr.png',
      '/asset-kolase/anjing/Whisk_1d2f20ad5c27c6ab8e5402a280dfdc65dr.png',
    ],
  },
  {
    id: 'bonekalucu',
    label: 'Kawaii Doll',
    emoji: '🪆',
    needsBackground: true,   // karakter boneka berwarna
    images: [
      '/asset-kolase/bonekalucu/Whisk_4ce5288131c0da0a0c543b29937f783cdr.png',
      '/asset-kolase/bonekalucu/Whisk_a1ae1a7d6e0fef0aff648b30c4d3d8c6dr.png',
      '/asset-kolase/bonekalucu/Whisk_ead2972eaa19d12bf074b4394c4be480dr.png',
      '/asset-kolase/bonekalucu/Whisk_fa4c2c1ec7186439b2741d9dff49204fdr.png',
    ],
  },
  {
    id: 'balon',
    label: 'Party Balloon',
    emoji: '🎈',
    needsBackground: true,   // balon berwarna
    images: [
      '/asset-kolase/balon/Whisk_39a5c2f745a767288914452114729f3fdr.png',
      '/asset-kolase/balon/Whisk_5a4ad797b651d1ea3c04bfd32b0f4cb0dr.png',
      '/asset-kolase/balon/Whisk_6a067ccceb34bd6b360434fe43330f06dr.png',
      '/asset-kolase/balon/Whisk_ae72610356cb4abaf28434b192401723dr.png',
    ],
  },
  {
    id: 'cake',
    label: 'Birthday Cake',
    emoji: '🎂',
    needsBackground: true,   // kue berwarna
    images: [
      '/asset-kolase/cake/Whisk_3f5309bbf9e97b2b5df4a461052c67fadr.png',
      '/asset-kolase/cake/Whisk_66f2d0c18dc900ba8d04e4d9b98eaed9dr.png',
      '/asset-kolase/cake/Whisk_9536af9f9b5f6ddb3ba4fdb2bc444808dr.png',
      '/asset-kolase/cake/Whisk_b8618a536f2e67e86084180219d1b678dr.png',
    ],
  },
  {
    id: 'api',
    label: 'Fire Vibes',
    emoji: '🔥',
    needsBackground: false,  // api → glow shape oke di semua bg
    images: [
      '/asset-kolase/api/Whisk_26550cb531e85bcac1f41a702c26089ddr.png',
      '/asset-kolase/api/Whisk_766f78ade62ad658ddd4e76d6e3d63a3dr.png',
      '/asset-kolase/api/Whisk_94b8b75685bd2a7bfb9437b66199c6c9dr.png',
      '/asset-kolase/api/Whisk_f74a3d88a293c33b3fa4f1266a39a031dr.png',
    ],
  },
  {
    id: 'antidesign',
    label: 'Y2K Static',
    emoji: '✤',
    needsBackground: false,  // abstract shapes
    images: [
      '/asset-kolase/antidesign/Whisk_60a69271fa4d6a98fc2458b22328a5cedr.png',
      '/asset-kolase/antidesign/Whisk_b8f4fabb006dd60bbcd4467a895ffc22dr.png',
      '/asset-kolase/antidesign/Whisk_e627e2ae48f8a2bbb5a4ddeb5fc38db9dr.png',
      '/asset-kolase/antidesign/Whisk_e95252507de83f5955e48dda0e722189dr.png',
    ],
  },
  {
    id: 'sapi',
    label: 'Cow Vibes',
    emoji: '🐄',
    needsBackground: true,
    images: [
      '/asset-kolase/sapi/Whisk_4a66d2e16d626679f0b4ace875b498ebdr.png',
      '/asset-kolase/sapi/Whisk_da0daea20324f12a8e94d89c463d1bd9dr.png',
    ],
  },
  {
    id: 'anakayam-ayam',
    label: 'Ayam Gemas',
    emoji: '🐣',
    needsBackground: true,
    images: [
      '/asset-kolase/ayam2/Whisk_3idzmfjmyqjmjfwmtigm5ewlycdz00somzgntig-removebg-preview.png',
      '/asset-kolase/ayam2/Whisk_3mdm2ugmxmtokdzytgtmhjwljvjn00snhbjytyz-removebg-preview.png',
      '/asset-kolase/ayam2/Whisk_kzmzlhtyyugo4izmtidziltl5ajz00syyydotat-removebg-preview.png',
    ],
  },
  {
    id: 'anakayam-bintang',
    label: 'Ayam Star',
    emoji: '🤩',
    needsBackground: true,
    images: [
      '/asset-kolase/anakayam/bintang/Whisk_b31457c5ffad1238d7e4a6f1f30a8146dr.png',
    ],
  },
  {
    id: 'anakayam-kucing',
    label: 'Ayam Kucing',
    emoji: '😻',
    needsBackground: true,
    images: [
      '/asset-kolase/kucing2/Whisk_2iwm0mdn4ugmjrtytq2n2iwlmfwn00iyjrmytej-removebg-preview.png',
      '/asset-kolase/kucing2/Whisk_lfgohrtn3yjm0ctmtimzifwlygtz00ymibtztat-removebg-preview.png',
      '/asset-kolase/kucing2/Whisk_uwnmj2mlhzn1edo00sojzwytqdnwqtl2gjmz0iy-removebg-preview.png',
      '/asset-kolase/kucing2/Whisk_yegnzygo5ewy3mzytyzyjfwlxemm00im0ktmted-removebg-preview.png',
    ],
  },
  {
    id: 'anakayam-love',
    label: 'Ayam Cinta',
    emoji: '💘',
    needsBackground: true,
    images: [
      '/asset-kolase/anakayam/love/Whisk_1a9770169889be5aefb4cc9703fd0f55dr.png',
      '/asset-kolase/anakayam/love/Whisk_7f8c565c703239787cc49927e5ccfa7fdr.png',
      '/asset-kolase/anakayam/love/Whisk_9dcd0edf1a034dfa3ab4a5fffc0482c9dr.png',
    ],
  },
  {
    id: 'bunga2',
    label: 'Floral Dream',
    emoji: '🌸',
    needsBackground: false,
    images: [
      '/asset-kolase/bunga2/carnation-flower.png',
      '/asset-kolase/bunga2/hydrangea-flower (1).png',
      '/asset-kolase/bunga2/hydrangea-flower.png',
      '/asset-kolase/bunga2/snapdragon-flower.png',
    ],
  },
  {
    id: 'character',
    label: 'Cool Characters',
    emoji: '👾',
    needsBackground: true,
    images: [
      '/asset-kolase/character/14.png',
      '/asset-kolase/character/16.png',
      '/asset-kolase/character/2.png',
      '/asset-kolase/character/25.png',
      '/asset-kolase/character/29.png',
      '/asset-kolase/character/4.png',
    ],
  },
  {
    id: 'antidesign2',
    label: 'Y2K Static 2',
    emoji: '💿',
    needsBackground: false,
    images: [
      '/asset-kolase/antidesign2/5.png',
      '/asset-kolase/antidesign2/Vector (1).png',
      '/asset-kolase/antidesign2/Vector.png',
      '/asset-kolase/antidesign2/cswc.png',
    ],
  },
  {
    id: 'api-color',
    label: 'Api Warna',
    emoji: '🔥',
    needsBackground: false,
    images: [
      '/asset-kolase/api-color/Whisk_010cf08c603f269b84e43bdfc2262bd6dr-removebg-preview.png',
      '/asset-kolase/api-color/Whisk_1b5cdfb86c3541583854155fbd25f319dr-removebg-preview.png',
      '/asset-kolase/api-color/Whisk_a80f6f98004742ba7f44e94983e39efbdr-removebg-preview.png',
    ],
  },
];


