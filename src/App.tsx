import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Download,
  Flame,
  Flower2,
  Grid3x3,
  Images,
  Paintbrush,
  Rocket,
  Share2,
  Smartphone,
} from 'lucide-react';
import { ContributionCanvas } from './components/ContributionCanvas';
import { DensityPanel } from './components/DensityPanel';
import { GalleryModal } from './components/GalleryModal';
import { HelpPage } from './components/HelpPage';
import { HeroShowcase } from './components/HeroShowcase';
import { MissionDeployPanel } from './components/MissionDeployPanel';
import { usePwaInstall } from './hooks/usePwaInstall';
import {
  GRID_COLS,
  GRID_ROWS,
  cloneGrid,
  createEmptyGrid,
} from './data/pixelTemplates';
import { DEFAULT_DENSITY_CONFIG, THEME_CONFIGS } from './data/themes';
import {
  buildCalendarCells,
  buildMissionSummary,
  decodeShareHash,
  encodeShareHash,
  invertGrid,
  randomizeGridWithDensity,
} from './lib/calendarGrid';
import type {
  BrushTool,
  CalendarMode,
  CellLevel,
  DailyShiftConfig,
  DensityConfig,
  GitHubConnection,
  GridMatrix,
  PreviewPalette,
  ThemeId,
} from './types/paint';

const STORAGE_KEY_DRAFT = 'sakura-bullet-paint:draft:v2';
const STORAGE_KEY_CONN = 'sakura-bullet-paint:conn:v1';
const SESSION_KEY_TOKEN = 'sakura-bullet-paint:token:v1';

interface SavedDraft {
  grid: GridMatrix;
  themeId: ThemeId;
  calendarMode: CalendarMode;
  selectedYear: number;
  density: DensityConfig;
  dailyShift: DailyShiftConfig;
}

function loadInitialState(): SavedDraft {
  if (typeof window !== 'undefined' && window.location.hash) {
    const shared = decodeShareHash(window.location.hash);
    if (shared?.grid) {
      return {
        grid: shared.grid,
        themeId: shared.theme || 'chisato',
        calendarMode: shared.calendarMode || 'rolling',
        selectedYear: shared.year || new Date().getFullYear(),
        density: shared.levels
          ? { preset: 'custom', levels: shared.levels }
          : DEFAULT_DENSITY_CONFIG,
        dailyShift: { enabled: false, commitsPerDay: 2, messageStyle: 'lycoreco' },
      };
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedDraft>;
      if (Array.isArray(parsed.grid) && parsed.grid.length === GRID_COLS) {
        return {
          grid: parsed.grid,
          themeId: parsed.themeId || 'chisato',
          calendarMode: parsed.calendarMode || 'rolling',
          selectedYear: parsed.selectedYear || new Date().getFullYear(),
          density: parsed.density || DEFAULT_DENSITY_CONFIG,
          dailyShift: parsed.dailyShift || {
            enabled: false,
            commitsPerDay: 2,
            messageStyle: 'lycoreco',
          },
        };
      }
    }
  } catch {
    // ignore invalid localStorage
  }

  return {
    grid: randomizeGridWithDensity(1, 4),
    themeId: 'chisato',
    calendarMode: 'rolling',
    selectedYear: new Date().getFullYear(),
    density: DEFAULT_DENSITY_CONFIG,
    dailyShift: { enabled: false, commitsPerDay: 2, messageStyle: 'lycoreco' },
  };
}

function loadInitialConnection(): GitHubConnection {
  let savedNonSecret: Partial<GitHubConnection> = {};
  let sessionToken = '';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONN);
    if (raw) savedNonSecret = JSON.parse(raw) as Partial<GitHubConnection>;
    sessionToken = sessionStorage.getItem(SESSION_KEY_TOKEN) || '';
  } catch {
    // ignore storage errors
  }
  return {
    token: sessionToken,
    owner: savedNonSecret.owner || '',
    repo: savedNonSecret.repo || 'sakura-bullet-canvas',
    branch: savedNonSecret.branch || 'main',
    authorName: savedNonSecret.authorName || '',
    authorEmail: savedNonSecret.authorEmail || '',
  };
}

export function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [grid, setGrid] = useState<GridMatrix>(initial.grid);
  const [undoStack, setUndoStack] = useState<GridMatrix[]>([]);
  const [redoStack, setRedoStack] = useState<GridMatrix[]>([]);

  const [themeId, setThemeId] = useState<ThemeId>(initial.themeId);
  const [previewPalette, setPreviewPalette] = useState<PreviewPalette>('theme');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(initial.calendarMode);
  const [selectedYear, setSelectedYear] = useState<number>(initial.selectedYear);
  const [density, setDensity] = useState<DensityConfig>(initial.density);
  const [dailyShift, setDailyShift] = useState<DailyShiftConfig>(initial.dailyShift);

  const [brushLevel, setBrushLevel] = useState<CellLevel>(4);
  const [brushTool, setBrushTool] = useState<BrushTool>('pen');
  const [connection, setConnection] = useState<GitHubConnection>(loadInitialConnection);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallerySelectedId, setGallerySelectedId] = useState('chisato-cafe');
  const [activePage, setActivePage] = useState<'studio' | 'help'>(() =>
    typeof window !== 'undefined' && window.location.hash === '#help' ? 'help' : 'studio',
  );
  const [iosInstallHint, setIosInstallHint] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [reactionText, setReactionText] = useState(
    'Kanvas Full Year siap dibidik! Atur Auto-Fill 15%–100% atau lukis manual di kotak kontribusi.',
  );

  const pwa = usePwaInstall();
  const theme = THEME_CONFIGS[themeId];

  // Sync PWA browser theme-color bar with active character theme
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        themeId === 'takina' ? '#08101C' : themeId === 'duo' ? '#BE123C' : '#E11D48',
      );
    }
  }, [themeId]);

  // Save draft to localStorage (no database needed!)
  useEffect(() => {
    try {
      const payload: SavedDraft = {
        grid,
        themeId,
        calendarMode,
        selectedYear,
        density,
        dailyShift,
      };
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));
    } catch {
      // ignore quota errors
    }
  }, [grid, themeId, calendarMode, selectedYear, density, dailyShift]);

  // Save connection preferences cleanly (token strictly in sessionStorage)
  const handleConnectionChange = useCallback((next: GitHubConnection) => {
    setConnection(next);
    try {
      sessionStorage.setItem(SESSION_KEY_TOKEN, next.token);
      localStorage.setItem(
        STORAGE_KEY_CONN,
        JSON.stringify({
          owner: next.owner,
          repo: next.repo,
          branch: next.branch,
          authorName: next.authorName,
          authorEmail: next.authorEmail,
        }),
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleClearToken = useCallback(() => {
    setConnection((prev) => ({ ...prev, token: '' }));
    try {
      sessionStorage.removeItem(SESSION_KEY_TOKEN);
    } catch {
      // ignore
    }
  }, []);

  const pushHistory = useCallback((snapshot: GridMatrix) => {
    setUndoStack((prev) => [...prev.slice(-29), cloneGrid(snapshot)]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, cloneGrid(grid)]);
      setGrid(last);
      return prev.slice(0, -1);
    });
  }, [grid]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, cloneGrid(grid)]);
      setGrid(last);
      return prev.slice(0, -1);
    });
  }, [grid]);

  // Keyboard shortcuts Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const handleBeginStroke = useCallback(() => {
    pushHistory(grid);
  }, [grid, pushHistory]);

  const handlePaintCell = useCallback(
    (col: number, row: number, forceErase = false) => {
      setGrid((prev) => {
        const next = cloneGrid(prev);
        const targetLevel: CellLevel = forceErase || brushTool === 'eraser' ? 0 : brushLevel;

        if (brushTool === 'spray' && !forceErase) {
          const maxLv = Math.max(1, targetLevel);
          next[col][row] = (Math.floor(Math.random() * maxLv) + 1) as CellLevel;
          const offsets = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          for (const [dc, dr] of offsets) {
            const nc = col + dc;
            const nr = row + dr;
            if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS && Math.random() < 0.45) {
              next[nc][nr] = (Math.floor(Math.random() * maxLv) + 1) as CellLevel;
            }
          }
        } else if (brushTool === 'mirror-x') {
          next[col][row] = targetLevel;
          next[GRID_COLS - 1 - col][row] = targetLevel;
        } else if (brushTool === 'mirror-y') {
          next[col][row] = targetLevel;
          next[col][GRID_ROWS - 1 - row] = targetLevel;
        } else {
          next[col][row] = targetLevel;
        }

        return next;
      });
    },
    [brushLevel, brushTool],
  );

  const { cells, monthLabels } = useMemo(
    () => buildCalendarCells(grid, calendarMode, selectedYear),
    [grid, calendarMode, selectedYear],
  );

  const summary = useMemo(() => buildMissionSummary(cells, density), [cells, density]);

  const handleFillDensity = (
    ratio: number,
    options?: { solid?: boolean; skipHistory?: boolean },
  ) => {
    if (!options?.skipHistory) {
      pushHistory(grid);
    }
    const maxLv = brushLevel === 0 ? 4 : brushLevel;
    const solid = options?.solid ?? false;
    setGrid(randomizeGridWithDensity(ratio, maxLv, solid));
    const pct = Math.round(ratio * 100);
    setReactionText(
      pct >= 100
        ? solid
          ? `Full Year 100% (Solid Lv.${maxLv}) aktif! Seluruh kalender penuh terisi.`
          : 'Full Year 100% aktif! Seluruh hari terisi dengan gradasi Lv.1–4.'
        : `Auto-Fill Full Year ${pct}% (${solid ? `Solid Lv.${maxLv}` : `Gradasi Lv.1–${maxLv}`}) diterapkan!`,
    );
  };

  const handleShareUrl = async () => {
    const encoded = encodeShareHash(grid, themeId, calendarMode, selectedYear, density);
    const shareUrl = `${window.location.origin}${window.location.pathname}#plan=${encoded}`;
    window.history.replaceState(null, '', `#plan=${encoded}`);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setReactionText('Link desain disalin ke clipboard! Bagikan ke teman tanpa perlu database.');
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setReactionText('URL sudah diperbarui di address bar browser kamu.');
    }
  };

  const jumpToSection = (sectionId: string) => {
    if (activePage !== 'studio') {
      setActivePage('studio');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`flex min-h-screen flex-col overflow-x-hidden ${theme.pageBg} ${theme.dotPatternClass} ${theme.textPrimary} transition-colors duration-300`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-30 border-b ${theme.borderColor} ${theme.surfaceBg} backdrop-blur-md`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${theme.accentGradient} ${theme.accentText} shadow-sm`}>
              <Flower2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display truncate text-sm font-extrabold tracking-tight sm:text-xl">
                  SAKURA BULLET PAINT
                </h1>
                <span className={`hidden rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold sm:inline-block ${theme.accentSoftBg} ${theme.accentSoftText}`}>
                  {theme.jpName}
                </span>
              </div>
              <p className={`truncate text-[11px] sm:text-xs ${theme.textSecondary}`}>
                Lycoris Recoil GitHub Contribution Studio
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Desktop Page Switcher: Studio | Help & About */}
            <nav
              aria-label="Navigasi halaman"
              className={`hidden rounded-xl border lg:inline-flex ${theme.borderColor} ${theme.surfaceMutedBg} p-0.5 text-xs`}
            >
              <button
                type="button"
                onClick={() => {
                  setActivePage('studio');
                  if (window.location.hash === '#help') {
                    window.history.replaceState(null, '', window.location.pathname);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  activePage === 'studio'
                    ? `${theme.accentBg} ${theme.accentText} shadow-sm`
                    : `${theme.textSecondary} hover:opacity-85`
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Studio
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePage('help');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  activePage === 'help'
                    ? `${theme.accentBg} ${theme.accentText} shadow-sm`
                    : `${theme.textSecondary} hover:opacity-85`
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Help / About
              </button>
            </nav>

            {pwa.canPromptInstall && (
              <button
                type="button"
                onClick={() => {
                  void pwa.triggerInstall();
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.accentSoftBg} ${theme.accentSoftText} px-2.5 py-1.5 text-xs font-bold transition hover:opacity-85`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {pwa.isIos && (
              <button
                type="button"
                onClick={() => setIosInstallHint((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.accentSoftBg} ${theme.accentSoftText} px-2.5 py-1.5 text-xs font-bold`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add to Home</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGallerySelectedId(
                  themeId === 'takina' ? 'takina-dossier' : themeId === 'duo' ? 'lycoris-duo' : 'chisato-cafe',
                );
                setGalleryOpen(true);
              }}
              aria-label="Galeri Karakter"
              className={`inline-flex items-center gap-1.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-xs font-semibold sm:px-3 ${theme.textPrimary} hover:opacity-85`}
            >
              <Images className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Galeri</span>
            </button>

            <button
              type="button"
              onClick={handleShareUrl}
              aria-label="Share Desain"
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold sm:px-3.5 ${theme.accentBg} ${theme.accentHoverBg} ${theme.accentText} transition`}
            >
              {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{shareCopied ? 'Disalin!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {iosInstallHint && (
          <div className={`border-t ${theme.borderColor} ${theme.surfaceMutedBg} px-4 py-2 text-center text-[11px] ${theme.textPrimary}`}>
            📲 Untuk install di iPhone/iPad: ketuk tombol <strong>Share (↑)</strong> di Safari lalu pilih{' '}
            <strong>Add to Home Screen</strong>.
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-3.5 py-4 sm:px-6 lg:py-6">
        {activePage === 'help' ? (
          <HelpPage
            theme={theme}
            onBackToStudio={() => {
              setActivePage('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="space-y-5">
            <HeroShowcase
              theme={theme}
              activeThemeId={themeId}
              onSelectTheme={(id) => {
                setThemeId(id);
                setReactionText(
                  id === 'chisato'
                    ? 'Chisato aktif! Semua bidikan commit memakai peluru karet ceria.'
                    : id === 'takina'
                      ? 'Takina aktif. Mode taktis siap mengeksekusi jadwal commit presisi.'
                      : 'Chisato & Takina bergabung! Shift ganda Café LycoReco dimulai.',
                );
              }}
              onOpenGallery={(id) => {
                if (id) setGallerySelectedId(id);
                setGalleryOpen(true);
              }}
              totalCommits={summary.totalCommits}
              activeDays={summary.activeDays}
              reactionText={reactionText}
            />

            <ContributionCanvas
              theme={theme}
              cells={cells}
              monthLabels={monthLabels}
              density={density}
              brushLevel={brushLevel}
              onBrushLevelChange={setBrushLevel}
              brushTool={brushTool}
              onBrushToolChange={setBrushTool}
              previewPalette={previewPalette}
              onPreviewPaletteChange={setPreviewPalette}
              calendarMode={calendarMode}
              onCalendarModeChange={setCalendarMode}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              onPaintCell={handlePaintCell}
              onBeginStroke={handleBeginStroke}
              onFillDensity={handleFillDensity}
              onInvertGrid={() => {
                pushHistory(grid);
                setGrid((prev) => invertGrid(prev));
                setReactionText('Warna kanvas dibalik (Invert)!');
              }}
              onClearGrid={() => {
                pushHistory(grid);
                setGrid(createEmptyGrid(0));
                setReactionText('Kanvas dibersihkan. Siap melukis pola baru!');
              }}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
            />

            <DensityPanel
              theme={theme}
              density={density}
              onChangeDensity={(next) => {
                setDensity(next);
                setReactionText(
                  next.preset === 'full'
                    ? 'Mode Full Maksimal aktif! Grafik GitHub akan tampak hijau pekat.'
                    : `Pengaturan intensitas diubah ke ${next.levels.slice(1).join(' / ')} commit per hari.`,
                );
              }}
              dailyShift={dailyShift}
              onChangeDailyShift={setDailyShift}
              summary={summary}
            />

            <MissionDeployPanel
              theme={theme}
              themeId={themeId}
              connection={connection}
              onChangeConnection={handleConnectionChange}
              onClearToken={handleClearToken}
              summary={summary}
              dailyShift={dailyShift}
              onDeploySuccess={(msg) => setReactionText(`🎯 ${msg}`)}
            />
          </div>
        )}
      </main>

      <footer className={`mt-10 border-t ${theme.borderColor} ${theme.surfaceBg} pt-7 pb-24 lg:pb-7`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
            {/* Brand Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${theme.accentGradient} ${theme.accentText} shadow-sm`}>
                  <Flower2 className="h-4 w-4" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-display text-sm font-extrabold tracking-tight ${theme.textPrimary}`}>
                    SAKURA BULLET PAINT
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${theme.accentSoftBg} ${theme.accentSoftText}`}>
                    {theme.jpName}
                  </span>
                </div>
              </div>
              <p className={`max-w-md text-xs leading-relaxed ${theme.textSecondary}`}>
                Studio grafis kontribusi GitHub (53 × 7) &amp; penjadwal auto-commit harian bertema{' '}
                <em>Lycoris Recoil</em>. Berjalan sepenuhnya di sisi browser tanpa database.
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px] font-semibold">
                <span className={`rounded-lg border ${theme.borderColor} ${theme.surfaceMutedBg} px-2 py-0.5 ${theme.textSecondary}`}>
                  0-DB Static App
                </span>
                <span className={`rounded-lg border ${theme.borderColor} ${theme.surfaceMutedBg} px-2 py-0.5 ${theme.textSecondary}`}>
                  Full Year 15–100%
                </span>
                <span className={`rounded-lg border ${theme.borderColor} ${theme.surfaceMutedBg} px-2 py-0.5 ${theme.textSecondary}`}>
                  PWA Installable
                </span>
              </div>
            </div>

            {/* Studio Shortcuts */}
            <div className="space-y-2.5">
              <h4 className={`font-mono text-[11px] font-bold uppercase tracking-wider ${theme.textPrimary}`}>
                Navigasi Studio
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('studio');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`transition hover:underline ${activePage === 'studio' ? theme.secondaryAccentText : theme.textSecondary}`}
                  >
                    Hero &amp; Tema Karakter
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToSection('canvas-section')}
                    className={`transition hover:underline ${theme.textSecondary}`}
                  >
                    Kanvas Full Year (53 × 7)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToSection('density-section')}
                    className={`transition hover:underline ${theme.textSecondary}`}
                  >
                    Kepadatan &amp; Café Shift
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToSection('deploy-section')}
                    className={`transition hover:underline ${theme.textSecondary}`}
                  >
                    Eksekusi ke GitHub
                  </button>
                </li>
              </ul>
            </div>

            {/* Panduan & Fitur */}
            <div className="space-y-2.5">
              <h4 className={`font-mono text-[11px] font-bold uppercase tracking-wider ${theme.textPrimary}`}>
                Informasi &amp; Galeri
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('help');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`transition hover:underline ${activePage === 'help' ? theme.secondaryAccentText : theme.textSecondary}`}
                  >
                    Help, About &amp; Panduan
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setGallerySelectedId(
                        themeId === 'takina' ? 'takina-dossier' : themeId === 'duo' ? 'lycoris-duo' : 'chisato-cafe',
                      );
                      setGalleryOpen(true);
                    }}
                    className={`transition hover:underline ${theme.textSecondary}`}
                  >
                    Galeri Artwork Lycoris (5)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleShareUrl}
                    className={`transition hover:underline ${theme.textSecondary}`}
                  >
                    Salin Link Desain Kanvas
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className={`mt-6 flex flex-col gap-2 border-t ${theme.borderColor} pt-4 text-[11px] sm:flex-row sm:items-center sm:justify-between ${theme.textSecondary}`}>
            <span>
              Not affiliated with GitHub, Inc. or the official rights holders of <em>Lycoris Recoil</em>.
            </span>
            <span className="font-mono text-[10px]">
              CAFÉ LYCORECO // THEME: {theme.name.toUpperCase()}
            </span>
          </div>
        </div>
      </footer>

      <GalleryModal
        open={galleryOpen}
        selectedId={gallerySelectedId}
        onSelectId={setGallerySelectedId}
        onClose={() => setGalleryOpen(false)}
        onApplyTheme={setThemeId}
        theme={theme}
      />

      {/* Mobile PWA Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi mobile"
        className={`fixed bottom-0 inset-x-0 z-40 border-t ${theme.borderColor} ${theme.surfaceBg} backdrop-blur-lg lg:hidden pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-1.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => jumpToSection('canvas-section')}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 ${
              activePage === 'studio' ? theme.secondaryAccentText : theme.textSecondary
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
            <span>Kanvas</span>
          </button>
          <button
            type="button"
            onClick={() => jumpToSection('density-section')}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 ${theme.textSecondary}`}
          >
            <Flame className="h-4 w-4" />
            <span>Commit</span>
          </button>
          <button
            type="button"
            onClick={() => jumpToSection('deploy-section')}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 ${theme.textSecondary}`}
          >
            <Rocket className="h-4 w-4" />
            <span>Deploy</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePage('help');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 ${
              activePage === 'help' ? theme.secondaryAccentText : theme.textSecondary
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Help</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;

