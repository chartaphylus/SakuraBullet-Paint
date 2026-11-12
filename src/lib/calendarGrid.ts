import LZString from 'lz-string';
import { GRID_COLS, GRID_ROWS, createEmptyGrid } from '../data/pixelTemplates';
import type {
  CalendarCell,
  CalendarMode,
  CellLevel,
  DailyShiftConfig,
  DensityConfig,
  DensityPresetId,
  GridMatrix,
  MissionCommitEntry,
  MonthLabel,
  ThemeId,
} from '../types/paint';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_THEMES = new Set<ThemeId>(['chisato', 'takina', 'duo']);
const VALID_MODES = new Set<CalendarMode>(['rolling', 'year']);
const VALID_PRESETS = new Set<DensityPresetId>(['light', 'standard', 'heavy', 'full', 'custom']);
const VALID_MESSAGE_STYLES = new Set<DailyShiftConfig['messageStyle']>([
  'lycoreco',
  'chisato',
  'takina',
  'minimal',
]);

export function sanitizeThemeId(value: unknown, fallback: ThemeId = 'chisato'): ThemeId {
  return typeof value === 'string' && VALID_THEMES.has(value as ThemeId)
    ? (value as ThemeId)
    : fallback;
}

export function sanitizeCalendarMode(value: unknown, fallback: CalendarMode = 'rolling'): CalendarMode {
  return typeof value === 'string' && VALID_MODES.has(value as CalendarMode)
    ? (value as CalendarMode)
    : fallback;
}

export function sanitizeYear(value: unknown, fallback: number = new Date().getFullYear()): number {
  const num = Number(value);
  if (Number.isInteger(num) && num >= 2020 && num <= 2035) {
    return num;
  }
  return fallback;
}

export function sanitizeDensityLevels(value: unknown): [0, number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 5) return undefined;
  const nums = value.map((item, idx) => {
    if (idx === 0) return 0;
    const n = Math.round(Number(item));
    return Number.isFinite(n) ? Math.max(0, Math.min(500, n)) : 0;
  });
  return [0, nums[1], nums[2], nums[3], nums[4]];
}

export function sanitizeDensityConfig(
  value: unknown,
  fallback: DensityConfig,
): DensityConfig {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as { preset?: unknown; levels?: unknown };
  const levels = sanitizeDensityLevels(raw.levels);
  if (!levels) return fallback;
  const preset =
    typeof raw.preset === 'string' && VALID_PRESETS.has(raw.preset as DensityPresetId)
      ? (raw.preset as DensityPresetId)
      : 'custom';
  return { preset, levels };
}

export function sanitizeDailyShiftConfig(
  value: unknown,
  fallback: DailyShiftConfig,
): DailyShiftConfig {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as { enabled?: unknown; commitsPerDay?: unknown; messageStyle?: unknown };
  const commitsPerDay = Math.round(Number(raw.commitsPerDay));
  return {
    enabled: Boolean(raw.enabled),
    commitsPerDay: Number.isFinite(commitsPerDay)
      ? Math.max(1, Math.min(50, commitsPerDay))
      : fallback.commitsPerDay,
    messageStyle:
      typeof raw.messageStyle === 'string' &&
      VALID_MESSAGE_STYLES.has(raw.messageStyle as DailyShiftConfig['messageStyle'])
        ? (raw.messageStyle as DailyShiftConfig['messageStyle'])
        : fallback.messageStyle,
  };
}

export function sanitizeGridMatrix(value: unknown): GridMatrix | undefined {
  if (!Array.isArray(value) || value.length !== GRID_COLS) return undefined;
  const next = createEmptyGrid(0);
  for (let c = 0; c < GRID_COLS; c++) {
    const col = value[c];
    if (!Array.isArray(col) || col.length !== GRID_ROWS) return undefined;
    for (let r = 0; r < GRID_ROWS; r++) {
      const lv = Math.round(Number(col[r]));
      next[c][r] = (lv >= 0 && lv <= 4 ? lv : 0) as CellLevel;
    }
  }
  return next;
}

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
    t: sanitizeThemeId(theme),
    m: sanitizeCalendarMode(calendarMode),
    y: sanitizeYear(year),
    d: sanitizeDensityLevels(density.levels) || [0, 2, 5, 8, 12],
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
    if (!hashStr || hashStr.length > 8192) return null;
    const clean = hashStr.replace(/^#/, '').replace(/^plan=/, '');
    if (!clean) return null;
    const raw = LZString.decompressFromEncodedURIComponent(clean);
    if (!raw || raw.length > 16384) return null;
    const parsed = JSON.parse(raw) as Partial<ShareableState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.g !== 'string' || parsed.g.length !== GRID_COLS * GRID_ROWS) return null;

    const grid = createEmptyGrid(0);
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const ch = Number(parsed.g[c * GRID_ROWS + r]);
        grid[c][r] = (Number.isInteger(ch) && ch >= 0 && ch <= 4 ? ch : 0) as CellLevel;
      }
    }

    return {
      grid,
      theme: VALID_THEMES.has(parsed.t as ThemeId) ? parsed.t : undefined,
      calendarMode: VALID_MODES.has(parsed.m as CalendarMode) ? parsed.m : undefined,
      year:
        parsed.y !== undefined && Number.isInteger(Number(parsed.y)) && Number(parsed.y) >= 2020 && Number(parsed.y) <= 2035
          ? Number(parsed.y)
          : undefined,
      levels: sanitizeDensityLevels(parsed.d),
    };
  } catch {
    return null;
  }
}
