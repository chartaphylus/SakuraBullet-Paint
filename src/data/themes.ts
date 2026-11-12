import type { DensityConfig, DensityPresetId, PreviewPalette, ThemeId } from '../types/paint';
import { THEME_HERO_MEDIA } from './characters';

export interface ThemePaletteConfig {
  id: ThemeId;
  name: string;
  agentName: string;
  jpName: string;
  agentNumber: string;
  codename: string;
  tagline: string;
  quote: string;
  isDark: boolean;
  pageBg: string;
  dotPatternClass: string;
  heroBackdrop: string;
  surfaceBg: string;
  surfaceMutedBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentBg: string;
  accentGradient: string;
  accentHoverBg: string;
  accentText: string;
  accentSoftBg: string;
  accentSoftText: string;
  secondaryAccentText: string;
  gridColors: [string, string, string, string, string];
  gridBorder: string;
  heroImage: string;
  heroAltImage: string;
  heroFocusClass: string;
  badgeLabel: string;
}

export const THEME_CONFIGS: Record<ThemeId, ThemePaletteConfig> = {
  chisato: {
    id: 'chisato',
    name: 'Chisato Crimson',
    agentName: 'Chisato Nishikigi',
    jpName: '錦木 千束',
    agentNumber: '01',
    codename: 'FIRST LYCORIS // 01',
    tagline: 'Café LycoReco Direct Attack Mode',
    quote: '"Yang penting itu melakukan apa yang kita inginkan! Biar tidak ada penyesalan!"',
    isDark: false,
    pageBg: 'bg-[#FFF6F4]',
    dotPatternClass: 'bg-tactical-dots-light',
    heroBackdrop: 'from-[#FFF0EE] via-white to-[#FFE4E6]',
    surfaceBg: 'bg-white/95 backdrop-blur-sm',
    surfaceMutedBg: 'bg-[#FFF0ED]',
    borderColor: 'border-[#F3D2CC]',
    textPrimary: 'text-[#231517]',
    textSecondary: 'text-[#735156]',
    accentBg: 'bg-[#DC2626]',
    accentGradient: 'bg-linear-to-r from-[#E11D48] via-[#DC2626] to-[#FB7185]',
    accentHoverBg: 'hover:bg-[#B91C1C]',
    accentText: 'text-white',
    accentSoftBg: 'bg-[#FEE2E2]',
    accentSoftText: 'text-[#B91C1C]',
    secondaryAccentText: 'text-[#DC2626]',
    gridColors: ['#F9EAE7', '#FDA4AF', '#FB7185', '#E11D48', '#9F1239'],
    gridBorder: '#F2D5D0',
    heroImage: THEME_HERO_MEDIA.chisato,
    heroAltImage: THEME_HERO_MEDIA.chisatoAlt,
    heroFocusClass: 'object-[50%_18%]',
    badgeLabel: 'Non-Lethal Rubber Round',
  },
  takina: {
    id: 'takina',
    name: 'Takina Tactical',
    agentName: 'Inoue Takina',
    jpName: '井ノ上 たきな',
    agentNumber: '02',
    codename: 'SECOND AGENT // 02',
    tagline: 'Midnight Precision & Parfait Ops',
    quote: '"Efisiensi misi adalah prioritas. Semua commit akan tepat sasaran."',
    isDark: true,
    pageBg: 'bg-[#08101C]',
    dotPatternClass: 'bg-tactical-dots-dark',
    heroBackdrop: 'from-[#0D1A2E] via-[#101C2E] to-[#0B253C]',
    surfaceBg: 'bg-[#101C2E]/95 backdrop-blur-sm',
    surfaceMutedBg: 'bg-[#16263D]',
    borderColor: 'border-[#253B59]',
    textPrimary: 'text-[#F1F5F9]',
    textSecondary: 'text-[#94A3B8]',
    accentBg: 'bg-[#0284C7]',
    accentGradient: 'bg-linear-to-r from-[#0284C7] via-[#0EA5E9] to-[#2DD4BF]',
    accentHoverBg: 'hover:bg-[#0369A1]',
    accentText: 'text-white',
    accentSoftBg: 'bg-[#0C4A6E]/70',
    accentSoftText: 'text-[#7DD3FC]',
    secondaryAccentText: 'text-[#38BDF8]',
    gridColors: ['#162235', '#0E7490', '#0284C7', '#38BDF8', '#7DD3FC'],
    gridBorder: '#1E334E',
    heroImage: THEME_HERO_MEDIA.takina,
    heroAltImage: THEME_HERO_MEDIA.duo,
    heroFocusClass: 'object-[50%_22%]',
    badgeLabel: 'Tactical Precision',
  },
  duo: {
    id: 'duo',
    name: 'LycoReco Duo',
    agentName: 'Chisato & Takina',
    jpName: 'リコリス・リコイル',
    agentNumber: '01+02',
    codename: 'PARTNER PAIR // CAFE',
    tagline: 'Sakura & Midnight Dual Palette',
    quote: '"Sakana~!! Chinanago~!! Bersama kita penuhi grafik GitHub setahun penuh!"',
    isDark: false,
    pageBg: 'bg-[#FAF5F0]',
    dotPatternClass: 'bg-tactical-dots-light',
    heroBackdrop: 'from-[#FFE8EC] via-[#FFFBF7] to-[#E0F2FE]',
    surfaceBg: 'bg-white/95 backdrop-blur-sm',
    surfaceMutedBg: 'bg-[#F4ECE4]',
    borderColor: 'border-[#E2D5CA]',
    textPrimary: 'text-[#1E1B24]',
    textSecondary: 'text-[#625B6B]',
    accentBg: 'bg-[#BE123C]',
    accentGradient: 'bg-linear-to-r from-[#E11D48] via-[#9333EA] to-[#0284C7]',
    accentHoverBg: 'hover:bg-[#9F1239]',
    accentText: 'text-white',
    accentSoftBg: 'bg-[#FCE7F3]',
    accentSoftText: 'text-[#9D174D]',
    secondaryAccentText: 'text-[#BE123C]',
    gridColors: ['#EFE9E3', '#A5B4FC', '#818CF8', '#E11D48', '#881337'],
    gridBorder: '#E5DCD3',
    heroImage: THEME_HERO_MEDIA.duo,
    heroAltImage: THEME_HERO_MEDIA.motif,
    heroFocusClass: 'object-[50%_20%]',
    badgeLabel: 'Dual-Wield Café Shift',
  },
};

export const GITHUB_PREVIEW_COLORS: Record<Exclude<PreviewPalette, 'theme'>, [string, string, string, string, string]> = {
  'github-dark': ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  'github-light': ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

export const DENSITY_PRESETS: Record<Exclude<DensityPresetId, 'custom'>, {
  label: string;
  shortLabel: string;
  desc: string;
  levels: [0, number, number, number, number];
}> = {
  light: {
    label: 'Sedikit (Light)',
    shortLabel: 'Sedikit',
    desc: '1–4 commit/hari. Cocok untuk akun baru atau tampilan tipis.',
    levels: [0, 1, 2, 3, 4],
  },
  standard: {
    label: 'Sedang (Agent)',
    shortLabel: 'Sedang',
    desc: '2–12 commit/hari. Seimbang untuk profil aktif.',
    levels: [0, 2, 5, 8, 12],
  },
  heavy: {
    label: 'Ramai (Burst)',
    shortLabel: 'Ramai',
    desc: '4–25 commit/hari. Kontras kuat terhadap aktivitas lain.',
    levels: [0, 4, 9, 16, 25],
  },
  full: {
    label: 'Full Maksimal',
    shortLabel: 'Full',
    desc: '8–50 commit/hari. Hijau pekat maksimal di grafik GitHub.',
    levels: [0, 8, 18, 30, 50],
  },
};

export const DEFAULT_DENSITY_CONFIG: DensityConfig = {
  preset: 'standard',
  levels: [0, 2, 5, 8, 12],
};

export const THEMED_COMMIT_MESSAGES: Record<'lycoreco' | 'chisato' | 'takina' | 'minimal', string[]> = {
  lycoreco: [
    '☕ Brewed daily house blend at Café LycoReco',
    '🍨 Prepared Takina special chocolate parfait',
    '🌸 Tended crimson spider lily planter outside LycoReco',
    '🎯 Logged peaceful neighborhood patrol report',
    '🥐 Delivered fresh morning café order on time',
    '🔫 Cleaned custom rubber-round pistol case',
  ],
  chisato: [
    '🎯 Non-lethal rubber bullet bullseye!',
    '☕ Chisato signature latte art practice',
    '❤️ Making my own choices — zero regrets!',
    '✨ Dodged incoming bug at point-blank range',
    '🌸 Bright smile shift at Café LycoReco',
  ],
  takina: [
    '📊 Optimized Café LycoReco inventory ledger',
    '🍨 Precision-crafted hot chocolate parfait',
    '🎯 First Lycoris tactical sweep complete',
    '🐟 Sakana~ quick break between missions',
    '⚡ Zero-waste operational checkpoint logged',
  ],
  minimal: [
    'chore(sakura): update contribution canvas log',
    'docs(lycoreco): record daily shift entry',
    'feat(paint): append pixel commit point',
  ],
};

