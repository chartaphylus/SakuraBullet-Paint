import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
} from 'lucide-react';
import { CHARACTER_GALLERY, THEME_HERO_MEDIA } from '../data/characters';
import type { ThemePaletteConfig } from '../data/themes';
import type { ThemeId } from '../types/paint';

interface HeroShowcaseProps {
  theme: ThemePaletteConfig;
  activeThemeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  onOpenGallery: (id?: string) => void;
  totalCommits: number;
  activeDays: number;
  reactionText: string;
}

const AGENT_OPTIONS = [
  {
    id: 'chisato' as const,
    label: 'Chisato',
    fullLabel: 'Chisato Crimson',
    avatar: THEME_HERO_MEDIA.chisato,
    focus: 'object-[50%_16%]',
    defaultGalleryIndex: 0,
  },
  {
    id: 'takina' as const,
    label: 'Takina',
    fullLabel: 'Takina Tactical',
    avatar: THEME_HERO_MEDIA.takina,
    focus: 'object-[50%_16%]',
    defaultGalleryIndex: 1,
  },
  {
    id: 'duo' as const,
    label: 'Duo',
    fullLabel: 'LycoReco Duo',
    avatar: THEME_HERO_MEDIA.duo,
    focus: 'object-[50%_15%]',
    defaultGalleryIndex: 2,
  },
];

export function HeroShowcase({
  theme,
  activeThemeId,
  onSelectTheme,
  onOpenGallery,
  totalCommits,
  activeDays,
  reactionText,
}: HeroShowcaseProps) {
  const [photoIdx, setPhotoIdx] = useState(() => {
    const matched = AGENT_OPTIONS.find((a) => a.id === activeThemeId);
    return matched ? matched.defaultGalleryIndex : 0;
  });

  useEffect(() => {
    const matched = AGENT_OPTIONS.find((a) => a.id === activeThemeId);
    if (matched) setPhotoIdx(matched.defaultGalleryIndex);
  }, [activeThemeId]);

  const currentPhoto = CHARACTER_GALLERY[photoIdx] ?? CHARACTER_GALLERY[0];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev - 1 + CHARACTER_GALLERY.length) % CHARACTER_GALLERY.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev + 1) % CHARACTER_GALLERY.length);
  };

  return (
    <section
      className={`overflow-hidden rounded-2xl border ${theme.borderColor} bg-linear-to-br ${theme.heroBackdrop} p-4 shadow-sm sm:p-5 lg:p-6 transition-colors`}
    >
      {/* Mobile Showcase Layout (< md): Clean Full-Width Text + Ambient Atmospheric Photo Card */}
      <div className="space-y-3.5 md:hidden">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${theme.accentSoftBg} ${theme.accentSoftText}`}
            >
              {theme.jpName} · NO-DB PWA
            </span>
            <span className={`font-mono text-[11px] font-semibold ${theme.textSecondary}`}>
              {activeDays}d ·{' '}
              <strong className={theme.secondaryAccentText}>
                {totalCommits.toLocaleString()}c
              </strong>
            </span>
          </div>

          <h2 className="font-display text-lg font-extrabold leading-snug tracking-tight">
            Lukis GitHub Contribution{' '}
            <span className={`bg-clip-text text-transparent ${theme.accentGradient}`}>
              Café LycoReco
            </span>
          </h2>

          <p className={`text-xs leading-relaxed ${theme.textSecondary}`}>{reactionText}</p>
        </div>

        {/* Mobile Atmospheric Portrait Spotlight Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 p-3 shadow-md">
          {/* Blurred Atmospheric Wallpaper */}
          <img
            src={currentPhoto.src}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-xl"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/75 via-black/55 to-black/75" />

          <div className="relative flex items-center gap-3.5">
            {/* Crisp Portrait Poster (aspect-3/4 preserves full vertical character/poster art) */}
            <button
              type="button"
              onClick={() => onOpenGallery(currentPhoto.id)}
              className="group relative w-26 shrink-0 overflow-hidden rounded-xl shadow-xl ring-1 ring-white/25"
              title="Tap untuk perbesar gambar"
            >
              <div className="aspect-3/4">
                <img
                  src={currentPhoto.src}
                  alt={currentPhoto.title}
                  className={`h-full w-full object-cover ${currentPhoto.objectPosition}`}
                />
              </div>
              <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur-sm">
                <Expand className="h-3 w-3" />
              </span>
            </button>

            {/* Right Metadata & Quick Carousel Controls */}
            <div className="min-w-0 flex-1 space-y-2 text-white">
              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-rose-300">
                  {currentPhoto.tag}
                </span>
                <h3 className="font-display truncate text-sm font-extrabold leading-tight">
                  {currentPhoto.title}
                </h3>
                <p className="truncate text-[11px] text-white/75">{currentPhoto.subtitle}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 p-0.5 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    aria-label="Foto sebelumnya"
                    className="rounded-md p-1 hover:bg-white/15"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 font-mono text-[10px] font-bold">
                    {photoIdx + 1}/{CHARACTER_GALLERY.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    aria-label="Foto berikutnya"
                    className="rounded-md p-1 hover:bg-white/15"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenGallery(currentPhoto.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                  <Images className="h-3 w-3" />
                  Galeri
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clean 3-Column Agent Theme Switcher */}
        <div className="grid grid-cols-3 gap-2">
          {AGENT_OPTIONS.map((agent) => {
            const active = activeThemeId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectTheme(agent.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                  active
                    ? `${theme.accentBg} border-transparent ${theme.accentText} shadow-sm`
                    : `${theme.borderColor} ${theme.surfaceBg} ${theme.textPrimary}`
                }`}
              >
                <img
                  src={agent.avatar}
                  alt={agent.label}
                  className={`h-5 w-5 rounded-full object-cover ${agent.focus}`}
                />
                <span>{agent.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Showcase Layout (>= md): Balanced Editorial Left + Full-Bleed Glass Portrait Right */}
      <div className="hidden items-center justify-between gap-8 md:flex">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 font-mono text-[10px] font-bold tracking-wider ${theme.accentSoftBg} ${theme.accentSoftText}`}
              >
                {theme.jpName} · NO-DB PWA
              </span>
              <span className={`font-mono text-xs font-semibold ${theme.textSecondary}`}>
                {activeDays} hari aktif ·{' '}
                <strong className={theme.secondaryAccentText}>
                  {totalCommits.toLocaleString()} commits
                </strong>
              </span>
            </div>

            <h2 className="font-display text-2xl font-extrabold tracking-tight lg:text-3xl">
              Lukis GitHub Contribution{' '}
              <span className={`bg-clip-text text-transparent ${theme.accentGradient}`}>
                Café LycoReco
              </span>
            </h2>

            <p className={`max-w-2xl text-sm leading-relaxed ${theme.textSecondary}`}>
              {reactionText}
            </p>
          </div>

          {/* Agent Theme Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {AGENT_OPTIONS.map((agent) => {
              const active = activeThemeId === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectTheme(agent.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? `${theme.accentBg} border-transparent ${theme.accentText} shadow-sm`
                      : `${theme.borderColor} ${theme.surfaceBg} ${theme.textPrimary} hover:border-rose-400`
                  }`}
                >
                  <img
                    src={agent.avatar}
                    alt={agent.label}
                    className={`h-6 w-6 rounded-full object-cover ${agent.focus} ring-1 ${
                      active ? 'ring-white/50' : 'ring-black/10'
                    }`}
                  />
                  <span>{agent.fullLabel}</span>
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Sleek Numbered Artwork Selector Pills (replaces awkward tiny 32px square cutouts) */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className={`inline-flex flex-wrap items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.surfaceBg} p-1`}>
              {CHARACTER_GALLERY.map((item, idx) => {
                const selected = idx === photoIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPhotoIdx(idx)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      selected
                        ? `${theme.accentSoftBg} ${theme.accentSoftText} font-bold`
                        : `${theme.textSecondary} hover:opacity-85`
                    }`}
                  >
                    {idx + 1}. {item.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onOpenGallery(currentPhoto.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceBg} px-3 py-1.5 text-xs font-semibold ${theme.textPrimary} transition hover:border-rose-400`}
            >
              <Images className="h-3.5 w-3.5" />
              <span>Buka Galeri Penuh</span>
            </button>
          </div>
        </div>

        {/* Right: Full-Bleed Borderless Visual Showcase Card with Atmospheric Aura */}
        <div className="relative shrink-0 pr-1">
          {/* Soft ambient glow behind artwork */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-2 rounded-3xl opacity-30 blur-xl ${theme.accentGradient}`}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenGallery(currentPhoto.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenGallery(currentPhoto.id);
              }
            }}
            className="group relative w-50 cursor-pointer overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-black/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl lg:w-54"
            title="Klik untuk membuka ukuran penuh di Galeri"
          >
            <div className="aspect-3/4 w-full overflow-hidden">
              <img
                src={currentPhoto.src}
                alt={currentPhoto.title}
                className={`h-full w-full object-cover ${currentPhoto.objectPosition} transition duration-500 group-hover:scale-105`}
              />
            </div>

            {/* Subtle Top Controls inside Image */}
            <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between">
              <span className="rounded-full bg-black/55 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                {photoIdx + 1} / {CHARACTER_GALLERY.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  aria-label="Artwork sebelumnya"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  aria-label="Artwork berikutnya"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Clean Full-Bleed Gradient Scrim (no awkward solid white footer box) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/45 to-transparent p-3.5 pt-10 text-white">
              <div className="font-mono text-[9px] font-bold tracking-wider text-rose-300">
                {currentPhoto.tag}
              </div>
              <div className="font-display truncate text-sm font-extrabold leading-tight">
                {currentPhoto.title}
              </div>
              <div className="truncate text-[11px] text-white/80">{currentPhoto.subtitle}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
