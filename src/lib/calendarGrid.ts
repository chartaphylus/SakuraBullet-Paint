import LZString from 'lz-string';
import { GRID_COLS, GRID_ROWS, createEmptyGrid } from '../data/pixelTemplates';
import type {
  CalendarCell,
  CalendarMode,
  CellLevel,
  DensityConfig,
  GridMatrix,
  MissionCommitEntry,
  MonthLabel,
  ThemeId,
} from '../types/paint';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toUtcDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addUtcDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function buildCalendarCells(
  grid: GridMatrix,
  mode: CalendarMode,
  year: number,
  todayUtc: Date = getTodayUtc(),
): { cells: CalendarCell[][]; monthLabels: MonthLabel[] } {
  let startSunday: Date;
  if (mode === 'year') {
    const jan1 = new Date(Date.UTC(year, 0, 1));
    startSunday = addUtcDays(jan1, -jan1.getUTCDay());
  } else {
    const thisWeekSunday = addUtcDays(todayUtc, -todayUtc.getUTCDay());
    startSunday = addUtcDays(thisWeekSunday, -52 * 7);
  }

  const todayStr = toUtcDateString(todayUtc);
  const cells: CalendarCell[][] = [];
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;

  for (let col = 0; col < GRID_COLS; col++) {
    const colCells: CalendarCell[] = [];
    let firstInRangeDateInCol: Date | null = null;

    for (let row = 0; row < GRID_ROWS; row++) {
      const cellDate = addUtcDays(startSunday, col * 7 + row);
      const dateStr = toUtcDateString(cellDate);
      const inRange =
        mode === 'year'
          ? cellDate.getUTCFullYear() === year
          : cellDate.getTime() <= todayUtc.getTime();

      if (inRange && !firstInRangeDateInCol) {
        firstInRangeDateInCol = cellDate;
      }

      const level = (grid[col]?.[row] ?? 0) as CellLevel;
      colCells.push({
        col,
        row,
        dateStr,
        inRange,
        isToday: dateStr === todayStr,
        level,
      });
    }

    if (firstInRangeDateInCol) {
      const m = firstInRangeDateInCol.getUTCMonth();
      if (m !== lastMonth) {
        const lastCol = monthLabels.length > 0 ? monthLabels[monthLabels.length - 1].col : -10;
        if (col - lastCol >= 3) {
          monthLabels.push({ col, label: MONTH_SHORT[m] });
        }
        lastMonth = m;
      }
    }

    cells.push(colCells);
  }

  return { cells, monthLabels };
}

export interface MissionSummary {
  activeDays: number;
  totalCommits: number;
  peakCommits: number;
  levelCounts: [number, number, number, number, number];
  commits: MissionCommitEntry[];
}

export function buildMissionSummary(
  cells: CalendarCell[][],
  density: DensityConfig,
): MissionSummary {
  const commits: MissionCommitEntry[] = [];
  const levelCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let totalCommits = 0;
  let peakCommits = 0;

  for (let col = 0; col < cells.length; col++) {
    for (let row = 0; row < cells[col].length; row++) {
      const cell = cells[col][row];
      if (!cell.inRange) continue;
      levelCounts[cell.level] += 1;
      if (cell.level === 0) continue;

      const count = Math.max(0, Math.round(density.levels[cell.level] ?? 0));
      if (count <= 0) continue;

      commits.push({
        date: cell.dateStr,
        count,
        level: cell.level,
      });
      totalCommits += count;
      if (count > peakCommits) peakCommits = count;
    }
  }

  return {
    activeDays: commits.length,
    totalCommits,
    peakCommits,
    levelCounts,
    commits,
  };
}

export function randomizeGridWithDensity(
  fillRatio: number, // 0..1
  maxLevel: CellLevel = 4,
  solid = false,
): GridMatrix {
  const grid = createEmptyGrid(0);
  const clampedRatio = Math.max(0, Math.min(1, fillRatio));
  const safeMax = (maxLevel > 0 ? maxLevel : 4) as CellLevel;
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (clampedRatio >= 1 || Math.random() <= clampedRatio) {
        grid[c][r] = solid
          ? safeMax
          : (Math.min(safeMax, Math.floor(Math.random() * safeMax) + 1) as CellLevel);
      }
    }
  }
  return grid;
}

export function invertGrid(grid: GridMatrix): GridMatrix {
  return grid.map((col) =>
    col.map((lv) => (lv === 0 ? 4 : lv === 4 ? 0 : ((4 - lv) as CellLevel))),
  );
}

interface ShareableState {
  g: string; // 53*7 = 371 chars of '0'..'4'
  t?: ThemeId;
  m?: CalendarMode;
  y?: number;
  d?: [0, number, number, number, number];
}

export function encodeShareHash(
  grid: GridMatrix,
  theme: ThemeId,
  calendarMode: CalendarMode,
  year: number,
  density: DensityConfig,
): string {
  let flat = '';
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      flat += String(grid[c]?.[r] ?? 0);
    }
  }
  const payload: ShareableState = {
    g: flat,
    t: theme,
    m: calendarMode,
    y: year,
    d: density.levels,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShareHash(hashStr: string): {
  grid?: GridMatrix;
  theme?: ThemeId;
  calendarMode?: CalendarMode;
  year?: number;
  levels?: [0, number, number, number, number];
} | null {
  try {
    const clean = hashStr.replace(/^#/, '').replace(/^plan=/, '');
    if (!clean) return null;
    const raw = LZString.decompressFromEncodedURIComponent(clean);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShareableState;
    if (!parsed.g || parsed.g.length !== GRID_COLS * GRID_ROWS) return null;

    const grid = createEmptyGrid(0);
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const ch = Number(parsed.g[c * GRID_ROWS + r]);
        grid[c][r] = (ch >= 0 && ch <= 4 ? ch : 0) as CellLevel;
      }
    }

    return {
      grid,
      theme: parsed.t,
      calendarMode: parsed.m,
      year: parsed.y,
      levels: parsed.d,
    };
  } catch {
    return null;
  }
}

