export type GridLayout = {
  id: string;
  photoCount: number;
  label: string;
  thumbnail: string;
  cols: number;
  rows: number;
  canvasW: number;
  canvasH: number;
  slots: Array<{ x: number; y: number; w: number; h: number }>;
};

export type FilterOption = {
  id: string;
  name: string;
  cssFilter: string;
};

export type GlowColor = {
  id: string;
  color: string | null;
  isCustom?: boolean;
};

export type FrameColor = {
  id: string;
  background: string;
  isCustom?: boolean;
};

export type CapturedPhoto = {
  id: string;
  dataUrl: string;
  filter: string;
  timestamp: number;
};

export type ActivePanel = 'grid' | 'filter' | 'glow' | null;

export type StickerCategory = {
  id: string;
  label: string;
  emoji: string;
  images: string[];
  needsBackground: boolean; // true = perlu backing putih di frame gelap
};

export type BorderStyle = {
  id: string;
  label: string;
  paddingRatio: number;
  gapRatio: number;
  photoRadius: number;
};
