import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { CHARACTER_GALLERY } from '../data/characters';
import type { ThemePaletteConfig } from '../data/themes';
import type { ThemeId } from '../types/paint';

interface GalleryModalProps {
  open: boolean;
  selectedId: string;
  onSelectId: (id: string) => void;
  onClose: () => void;
  onApplyTheme: (id: ThemeId) => void;
  theme: ThemePaletteConfig;
}

export function GalleryModal({
  open,
  selectedId,
  onSelectId,
  onClose,
  onApplyTheme,
  theme,
}: GalleryModalProps) {
  const activeIdx = Math.max(
    0,
    CHARACTER_GALLERY.findIndex((item) => item.id === selectedId),
  );
  const activeItem = CHARACTER_GALLERY[activeIdx] || CHARACTER_GALLERY[0];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        const prev = (activeIdx - 1 + CHARACTER_GALLERY.length) % CHARACTER_GALLERY.length;
        onSelectId(CHARACTER_GALLERY[prev].id);
      }
      if (e.key === 'ArrowRight') {
        const next = (activeIdx + 1) % CHARACTER_GALLERY.length;
        onSelectId(CHARACTER_GALLERY[next].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeIdx, onClose, onSelectId]);

  if (!open) return null;

  const mappedTheme: ThemeId =
    activeItem.character === 'takina'
      ? 'takina'
      : activeItem.character === 'duo' || activeItem.character === 'motif'
        ? 'duo'
        : 'chisato';

  const goPrev = () => {
    const prev = (activeIdx - 1 + CHARACTER_GALLERY.length) % CHARACTER_GALLERY.length;
    onSelectId(CHARACTER_GALLERY[prev].id);
  };

  const goNext = () => {
    const next = (activeIdx + 1) % CHARACTER_GALLERY.length;
    onSelectId(CHARACTER_GALLERY[next].id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border ${theme.borderColor} ${theme.surfaceBg} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b ${theme.borderColor} px-4 py-3 sm:px-5`}>
          <div className="min-w-0">
            <span className={`font-mono text-[10px] font-bold uppercase ${theme.secondaryAccentText}`}>
              {activeItem.tag} · {activeIdx + 1} / {CHARACTER_GALLERY.length}
            </span>
            <h3 className={`font-display truncate text-base font-bold sm:text-lg ${theme.textPrimary}`}>
              Galeri Karakter Lycoris Recoil
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-1.5 ${theme.textSecondary} hover:bg-black/10`}
            aria-label="Tutup galeri"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 sm:p-5 md:grid-cols-[1.2fr_0.85fr]">
          {/* Atmospheric Full Artwork Viewer */}
          <div className="relative flex min-h-70 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-3">
            <img
              src={activeItem.src}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-2xl"
            />
            <img
              src={activeItem.src}
              alt={activeItem.title}
              className="relative max-h-[56vh] w-auto rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
            />

            <button
              type="button"
              onClick={goPrev}
              aria-label="Gambar sebelumnya"
              className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Gambar berikutnya"
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div>
              <h4 className={`font-display text-lg font-extrabold sm:text-xl ${theme.textPrimary}`}>
                {activeItem.title}
              </h4>
              <p className={`text-xs font-semibold sm:text-sm ${theme.secondaryAccentText}`}>
                {activeItem.subtitle}
              </p>
              <p className={`mt-2.5 text-xs leading-relaxed sm:text-sm ${theme.textSecondary}`}>
                {activeItem.caption}
              </p>

              <button
                type="button"
                onClick={() => {
                  onApplyTheme(mappedTheme);
                  onClose();
                }}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold sm:w-auto ${theme.accentBg} ${theme.accentHoverBg} ${theme.accentText} transition`}
              >
                <Sparkles className="h-4 w-4" />
                Pakai Tema {mappedTheme === 'chisato' ? 'Chisato' : mappedTheme === 'takina' ? 'Takina' : 'Duo'}
              </button>
            </div>

            <div>
              <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                Pilih Artwork ({CHARACTER_GALLERY.length})
              </p>
              <div className="grid grid-cols-5 gap-2">
                {CHARACTER_GALLERY.map((item) => {
                  const selected = item.id === activeItem.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectId(item.id)}
                      className={`overflow-hidden rounded-xl border-2 transition ${
                        selected
                          ? 'border-rose-500 ring-2 ring-rose-500/30'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="aspect-3/4">
                        <img
                          src={item.src}
                          alt={item.title}
                          className={`h-full w-full object-cover ${item.objectPosition}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
