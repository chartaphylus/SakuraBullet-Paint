import { useEffect, useRef, useState } from 'react';
import {
  Contrast,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  Maximize2,
  Paintbrush,
  Play,
  Redo2,
  Shuffle,
  Sparkles,
  SprayCan,
  Trash2,
  Undo2,
} from 'lucide-react';
import { GRID_COLS } from '../data/pixelTemplates';
import { GITHUB_PREVIEW_COLORS, type ThemePaletteConfig } from '../data/themes';
import type {
  BrushTool,
  CalendarCell,
  CalendarMode,
  CellLevel,
  DensityConfig,
  MonthLabel,
  PreviewPalette,
} from '../types/paint';

interface ContributionCanvasProps {
  theme: ThemePaletteConfig;
  cells: CalendarCell[][];
  monthLabels: MonthLabel[];
  density: DensityConfig;
  brushLevel: CellLevel;
  onBrushLevelChange: (lv: CellLevel) => void;
  brushTool: BrushTool;
  onBrushToolChange: (tool: BrushTool) => void;
  previewPalette: PreviewPalette;
  onPreviewPaletteChange: (p: PreviewPalette) => void;
  calendarMode: CalendarMode;
  onCalendarModeChange: (m: CalendarMode) => void;
  selectedYear: number;
  onYearChange: (y: number) => void;
  onPaintCell: (col: number, row: number, forceErase?: boolean) => void;
  onBeginStroke: () => void;
  onFillDensity: (ratio: number, options?: { solid?: boolean; skipHistory?: boolean }) => void;
  onInvertGrid: () => void;
  onClearGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const YEAR_OPTIONS = [2024, 2025, 2026, 2027];
const AUTO_FILL_PRESETS = [
  { label: '15%', pct: 15 },
  { label: '25%', pct: 25 },
  { label: '50%', pct: 50 },
  { label: '75%', pct: 75 },
  { label: '90%', pct: 90 },
  { label: '100% Full', pct: 100 },
] as const;

export function ContributionCanvas({
  theme,
  cells,
  monthLabels,
  density,
  brushLevel,
  onBrushLevelChange,
  brushTool,
  onBrushToolChange,
  previewPalette,
  onPreviewPaletteChange,
  calendarMode,
  onCalendarModeChange,
  selectedYear,
  onYearChange,
  onPaintCell,
  onBeginStroke,
  onFillDensity,
  onInvertGrid,
  onClearGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ContributionCanvasProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<CalendarCell | null>(null);
  const [sweepCol, setSweepCol] = useState<number | null>(null);
  const [touchMode, setTouchMode] = useState<'scroll' | 'paint'>('scroll');
  const [zoomLarge, setZoomLarge] = useState(false);
  const [autoFillPct, setAutoFillPct] = useState(100);
  const [fillSolid, setFillSolid] = useState(false);

  const strokeStartedRef = useRef(false);
  const sliderActiveRef = useRef(false);
  const lastTouchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const handlePointerUp = () => {
      setIsDrawing(false);
      setEraseMode(false);
      strokeStartedRef.current = false;
      sliderActiveRef.current = false;
      lastTouchKeyRef.current = null;
    };
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (sweepCol === null) return;
    if (sweepCol > GRID_COLS + 2) {
      setSweepCol(null);
      return;
    }
    const timer = window.setTimeout(() => setSweepCol((c) => (c === null ? null : c + 1)), 28);
    return () => window.clearTimeout(timer);
  }, [sweepCol]);

  const activePaintLevel = brushLevel === 0 ? 4 : brushLevel;

  const paletteColors =
    previewPalette === 'theme'
      ? theme.gridColors
      : GITHUB_PREVIEW_COLORS[previewPalette];

  const isGitHubDark = previewPalette === 'github-dark';
  const canvasSurfaceClass =
    previewPalette === 'github-dark'
      ? 'bg-[#0d1117] border-[#30363d] text-[#e6edf3]'
      : previewPalette === 'github-light'
        ? 'bg-white border-[#d0d7de] text-[#1f2328]'
        : `${theme.surfaceMutedBg} ${theme.borderColor} ${theme.textPrimary}`;

  // 13px cells + 3px gap cleanly fits all 53 columns on 1024px+ desktop viewports without scrolling
  const cellPx = zoomLarge ? 16 : 13;
  const colStepPx = cellPx + 3;

  const handleCellDown = (e: React.PointerEvent, cell: CalendarCell) => {
    if (!cell.inRange) return;
    if (e.pointerType === 'touch' && touchMode === 'scroll') {
      if (!strokeStartedRef.current) {
        onBeginStroke();
        strokeStartedRef.current = true;
      }
      onPaintCell(cell.col, cell.row, false);
      setHoveredCell(cell);
      return;
    }

    e.preventDefault();
    const isRightClick = e.button === 2;
    if (!strokeStartedRef.current) {
      onBeginStroke();
      strokeStartedRef.current = true;
    }
    setIsDrawing(true);
    setEraseMode(isRightClick);
    lastTouchKeyRef.current = `${cell.col}-${cell.row}`;
    onPaintCell(cell.col, cell.row, isRightClick);
  };

  const handleCellEnter = (cell: CalendarCell) => {
    setHoveredCell(cell);
    if (!isDrawing || !cell.inRange) return;
    onPaintCell(cell.col, cell.row, eraseMode);
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || e.pointerType === 'mouse') return;
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!target) return;
    const colStr = target.dataset.col;
    const rowStr = target.dataset.row;
    const inRange = target.dataset.inrange === 'true';
    if (colStr === undefined || rowStr === undefined || !inRange) return;

    const key = `${colStr}-${rowStr}`;
    if (lastTouchKeyRef.current === key) return;
    lastTouchKeyRef.current = key;

    const col = Number(colStr);
    const row = Number(rowStr);
    if (cells[col]?.[row]) {
      setHoveredCell(cells[col][row]);
      onPaintCell(col, row, eraseMode);
    }
  };

  return (
    <section
      id="canvas-section"
      className={`scroll-mt-20 rounded-2xl border ${theme.borderColor} ${theme.surfaceBg} p-4 shadow-sm sm:p-6 transition-colors`}
    >
      {/* Header Row: Title + View / Palette Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className={`font-display text-base font-extrabold sm:text-lg ${theme.textPrimary}`}>
            Kanvas Full Year (53 × 7)
          </h2>
          <button
            type="button"
            onClick={() => setSweepCol(0)}
            disabled={sweepCol !== null}
            title="Jalankan animasi simulasi sapuan commit"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${theme.accentSoftBg} ${theme.accentSoftText} hover:opacity-85 disabled:opacity-50`}
          >
            <Play className="h-3 w-3" />
            {sweepCol !== null ? 'Simulasi...' : 'Simulasi'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-0.5 text-xs`}>
            <button
              type="button"
              onClick={() => onCalendarModeChange('rolling')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                calendarMode === 'rolling'
                  ? `${theme.accentBg} ${theme.accentText}`
                  : theme.textSecondary
              }`}
            >
              52 Minggu
            </button>
            <button
              type="button"
              onClick={() => onCalendarModeChange('year')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                calendarMode === 'year'
                  ? `${theme.accentBg} ${theme.accentText}`
                  : theme.textSecondary
              }`}
            >
              Tahun
            </button>
            {calendarMode === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className={`ml-0.5 rounded-lg bg-transparent px-1.5 py-1 font-mono text-xs font-semibold outline-none ${theme.textPrimary}`}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y} className="text-slate-900">
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={`inline-flex rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-0.5 text-xs`}>
            {(
              [
                { id: 'theme', label: 'Lycoris' },
                { id: 'github-dark', label: 'GH Dark' },
                { id: 'github-light', label: 'GH Light' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPreviewPaletteChange(opt.id)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  previewPalette === opt.id
                    ? `${theme.accentBg} ${theme.accentText}`
                    : theme.textSecondary
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brush Tools + Intensity Level Swatches (Single Clean Row) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="canvas-scroll flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
          {(
            [
              { id: 'pen', label: 'Kuas', icon: Paintbrush },
              { id: 'spray', label: 'Ricochet', icon: SprayCan },
              { id: 'mirror-x', label: 'Mirror X', icon: FlipHorizontal2 },
              { id: 'mirror-y', label: 'Mirror Y', icon: FlipVertical2 },
              { id: 'eraser', label: 'Hapus', icon: Eraser },
            ] as const
          ).map(({ id, label, icon: Icon }) => {
            const active = brushTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onBrushToolChange(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? `${theme.accentBg} border-transparent ${theme.accentText} shadow-sm`
                    : `${theme.borderColor} ${theme.surfaceMutedBg} ${theme.textPrimary} hover:border-rose-400`
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-semibold ${theme.textSecondary}`}>Level:</span>
          {([0, 1, 2, 3, 4] as CellLevel[]).map((lv) => {
            const active = brushLevel === lv && brushTool !== 'eraser';
            const commits = density.levels[lv];
            return (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  onBrushLevelChange(lv);
                  if (brushTool === 'eraser' && lv > 0) onBrushToolChange('pen');
                }}
                title={`Level ${lv}: ${commits} commit/hari`}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-xs font-mono transition ${
                  active
                    ? 'border-rose-500 ring-2 ring-rose-500/25 font-bold'
                    : `${theme.borderColor} opacity-85 hover:opacity-100`
                } ${theme.textPrimary}`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-sm border border-black/15"
                  style={{ backgroundColor: paletteColors[lv] }}
                />
                <span>{lv === 0 ? '0' : `${commits}c`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile-Only Touch Mode & Zoom Helper (hidden cleanly on sm+) */}
      <div className={`mt-3 flex items-center justify-between gap-2 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-[11px] sm:hidden`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTouchMode('scroll')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold transition ${
              touchMode === 'scroll'
                ? `${theme.accentBg} ${theme.accentText}`
                : theme.textSecondary
            }`}
          >
            <Hand className="h-3 w-3" />
            Tap & Geser
          </button>
          <button
            type="button"
            onClick={() => setTouchMode('paint')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold transition ${
              touchMode === 'paint'
                ? `${theme.accentBg} ${theme.accentText}`
                : theme.textSecondary
            }`}
          >
            <Paintbrush className="h-3 w-3" />
            Lukis
          </button>
        </div>

        <button
          type="button"
          onClick={() => setZoomLarge((z) => !z)}
          className={`inline-flex items-center gap-1 rounded-lg border ${theme.borderColor} ${theme.surfaceBg} px-2 py-1 font-bold ${theme.textPrimary}`}
        >
          <Maximize2 className="h-3 w-3" />
          {zoomLarge ? 'Besar' : 'Normal'}
        </button>
      </div>

      {/* 53x7 Contribution Calendar Surface */}
      <div
        className={`mt-3.5 rounded-2xl border p-3 sm:p-4 transition-colors ${canvasSurfaceClass}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className={`canvas-scroll overflow-x-auto pb-1 ${touchMode === 'paint' ? 'touch-none' : ''}`}>
          <div className="mx-auto w-max select-none">
            {/* Month Labels */}
            <div className="relative mb-1.5 ml-8 h-4 text-[10px] font-semibold opacity-75">
              {monthLabels.map((m) => (
                <span
                  key={`${m.label}-${m.col}`}
                  className="absolute top-0"
                  style={{ left: `${m.col * colStepPx}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex items-start gap-2">
              {/* Weekday Labels */}
              <div className="grid grid-rows-7 gap-0.75 pt-px text-[10px] opacity-70">
                {DAY_LABELS.map((d, idx) => (
                  <span
                    key={d}
                    style={{ height: `${cellPx}px`, lineHeight: `${cellPx}px` }}
                    className={`w-6 text-right transition ${
                      hoveredCell?.row === idx ? 'font-bold opacity-100 text-rose-500' : ''
                    }`}
                  >
                    {idx % 2 === 1 ? d : ''}
                  </span>
                ))}
              </div>

              {/* Grid Cells */}
              <div
                className={`grid gap-0.75 ${touchMode === 'paint' ? 'touch-none' : ''}`}
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${cellPx}px)` }}
                onPointerMove={handleGridPointerMove}
                onPointerLeave={() => setHoveredCell(null)}
              >
                {cells.map((colCells, colIdx) => {
                  const isSwept = sweepCol !== null && colIdx === sweepCol;
                  const isSweptTail = sweepCol !== null && colIdx === sweepCol - 1;
                  return (
                    <div key={colIdx} className="grid grid-rows-7 gap-0.75">
                      {colCells.map((cell) => {
                        const bg = cell.inRange ? paletteColors[cell.level] : 'transparent';
                        const isCrosshair =
                          hoveredCell &&
                          cell.inRange &&
                          (hoveredCell.col === cell.col || hoveredCell.row === cell.row);
                        const litBySweep = (isSwept || isSweptTail) && cell.level > 0 && cell.inRange;

                        return (
                          <button
                            key={`${cell.col}-${cell.row}`}
                            type="button"
                            data-col={cell.col}
                            data-row={cell.row}
                            data-inrange={cell.inRange ? 'true' : 'false'}
                            disabled={!cell.inRange}
                            onPointerDown={(e) => handleCellDown(e, cell)}
                            onPointerEnter={() => handleCellEnter(cell)}
                            aria-label={`${cell.dateStr} level ${cell.level}`}
                            className={`rounded-[3px] transition-transform duration-100 ${
                              cell.inRange
                                ? 'cursor-crosshair hover:scale-125 hover:z-10'
                                : 'cursor-default opacity-15'
                            } ${cell.isToday ? 'ring-1 ring-amber-400' : ''} ${
                              litBySweep ? 'scale-125 brightness-125 ring-2 ring-white/80 z-10' : ''
                            }`}
                            style={{
                              width: `${cellPx}px`,
                              height: `${cellPx}px`,
                              backgroundColor: bg,
                              opacity:
                                !cell.inRange
                                  ? 0.15
                                  : isCrosshair && cell.level === 0
                                    ? 0.85
                                    : 1,
                              boxShadow:
                                litBySweep
                                  ? `0 0 8px ${paletteColors[cell.level]}`
                                  : isCrosshair && hoveredCell?.col === cell.col && hoveredCell?.row === cell.row
                                    ? '0 0 0 2px rgba(244,63,94,0.65)'
                                    : undefined,
                              border: cell.inRange
                                ? `1px solid ${
                                    isCrosshair
                                      ? 'rgba(244, 63, 94, 0.35)'
                                      : isGitHubDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(27,31,35,0.08)'
                                  }`
                                : '1px dashed rgba(148,163,184,0.2)',
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info & Legend */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs opacity-90">
          <div className="font-mono text-[11px]">
            {hoveredCell && hoveredCell.inRange ? (
              <span>
                <strong>{hoveredCell.dateStr}</strong> ({DAY_LABELS[hoveredCell.row]}) · Lv.{hoveredCell.level} ·{' '}
                <strong>{density.levels[hoveredCell.level]}c</strong>
              </span>
            ) : (
              <span>
                <span className="hidden sm:inline">Klik & seret untuk melukis, klik kanan untuk hapus.</span>
                <span className="sm:hidden">Tap kotak untuk melukis atau lihat detail tanggal.</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Sedikit</span>
            {([0, 1, 2, 3, 4] as CellLevel[]).map((lv) => (
              <span
                key={lv}
                className="h-3 w-3 rounded-[3px] border border-black/15"
                style={{ backgroundColor: paletteColors[lv] }}
              />
            ))}
            <span>Full</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Full Year Auto-Fill (15% - 100%) + Utilities */}
      <div className={`mt-4 space-y-3 border-t ${theme.borderColor} pt-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-bold ${theme.textPrimary}`}>
            <Sparkles className={`h-3.5 w-3.5 ${theme.secondaryAccentText}`} />
            Auto-Fill Full Year (15% – 100%)
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Gradient vs Solid Toggle */}
            <div className={`inline-flex rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-0.5 text-[11px]`}>
              <button
                type="button"
                onClick={() => {
                  setFillSolid(false);
                  onFillDensity(autoFillPct / 100, { solid: false });
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  !fillSolid ? `${theme.accentBg} ${theme.accentText}` : theme.textSecondary
                }`}
              >
                Gradasi Lv.1–{activePaintLevel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFillSolid(true);
                  onFillDensity(autoFillPct / 100, { solid: true });
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  fillSolid ? `${theme.accentBg} ${theme.accentText}` : theme.textSecondary
                }`}
              >
                Solid Lv.{activePaintLevel}
              </button>
            </div>
          </div>
        </div>

        {/* 15% - 100% Slider + Presets */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className={`flex flex-1 items-center gap-3 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2`}>
            <span className={`font-mono text-[11px] font-bold ${theme.textSecondary}`}>15%</span>
            <input
              type="range"
              min={15}
              max={100}
              step={5}
              value={autoFillPct}
              aria-label="Persentase Auto-Fill Full Year"
              onPointerDown={() => {
                if (!sliderActiveRef.current) {
                  sliderActiveRef.current = true;
                  onBeginStroke();
                }
              }}
              onChange={(e) => {
                const nextPct = Number(e.target.value);
                setAutoFillPct(nextPct);
                onFillDensity(nextPct / 100, {
                  solid: fillSolid,
                  skipHistory: sliderActiveRef.current,
                });
              }}
              className="h-2 w-full cursor-pointer accent-rose-600"
            />
            <span className={`rounded-lg px-2 py-0.5 font-mono text-xs font-extrabold ${theme.accentSoftBg} ${theme.accentSoftText}`}>
              {autoFillPct}%
            </span>
            <button
              type="button"
              onClick={() => onFillDensity(autoFillPct / 100, { solid: fillSolid })}
              title="Acak ulang pola di persentase ini"
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${theme.accentBg} ${theme.accentHoverBg} ${theme.accentText} transition`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Acak</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:shrink-0">
            {AUTO_FILL_PRESETS.map((btn) => {
              const active = autoFillPct === btn.pct;
              return (
                <button
                  key={btn.pct}
                  type="button"
                  onClick={() => {
                    setAutoFillPct(btn.pct);
                    onFillDensity(btn.pct / 100, { solid: fillSolid });
                  }}
                  className={`rounded-xl border px-2.5 py-2 font-mono text-[11px] font-bold transition ${
                    active
                      ? `${theme.accentBg} border-transparent ${theme.accentText} shadow-sm`
                      : `${theme.borderColor} ${theme.surfaceMutedBg} ${theme.textPrimary} hover:border-rose-400`
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`inline-flex items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-xs font-semibold ${theme.textPrimary} disabled:opacity-40`}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`inline-flex items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-xs font-semibold ${theme.textPrimary} disabled:opacity-40`}
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </button>
            <button
              type="button"
              onClick={onInvertGrid}
              className={`inline-flex items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-xs font-semibold ${theme.textPrimary} hover:border-rose-400`}
            >
              <Contrast className="h-3.5 w-3.5" />
              Invert
            </button>
            <button
              type="button"
              onClick={onClearGrid}
              className={`inline-flex items-center gap-1 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:border-rose-400`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kosongkan
            </button>
          </div>

          <span className={`font-mono text-[11px] font-semibold ${theme.textSecondary}`}>
            Rentang: {calendarMode === 'year' ? `Full Year ${selectedYear}` : '52 Minggu Terakhir'}
          </span>
        </div>
      </div>
    </section>
  );
}
