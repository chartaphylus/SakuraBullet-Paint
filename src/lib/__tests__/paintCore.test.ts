import LZString from 'lz-string';
import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS, createEmptyGrid } from '../../data/pixelTemplates';
import {
  buildCalendarCells,
  buildMissionSummary,
  decodeShareHash,
  encodeShareHash,
  randomizeGridWithDensity,
} from '../calendarGrid';
import {
  generateBashMissionScript,
  generatePowerShellMissionScript,
} from '../scriptGenerator';
import { isRestrictedSourceShortcut } from '../sourceGuard';
import type { DensityConfig } from '../../types/paint';

describe('Calendar Grid & Date Math', () => {
  it('builds exact 53x7 cells for year mode and excludes out-of-year cells', () => {
    const grid = createEmptyGrid(4);
    const { cells, monthLabels } = buildCalendarCells(grid, 'year', 2026);
    expect(cells).toHaveLength(GRID_COLS);
    expect(cells[0]).toHaveLength(GRID_ROWS);

    const inRangeDates = cells.flat().filter((c) => c.inRange);
    expect(inRangeDates).toHaveLength(365);
    expect(inRangeDates[0].dateStr).toBe('2026-01-01');
    expect(inRangeDates[inRangeDates.length - 1].dateStr).toBe('2026-12-31');
    expect(monthLabels[0].label).toBe('Jan');
  });

  it('caps rolling 52-week mode at todayUtc', () => {
    const grid = createEmptyGrid(2);
    const today = new Date(Date.UTC(2026, 10, 12)); // 2026-11-12 (Thursday)
    const { cells } = buildCalendarCells(grid, 'rolling', 2026, today);
    const inRange = cells.flat().filter((c) => c.inRange);
    const last = inRange[inRange.length - 1];
    expect(last.dateStr).toBe('2026-11-12');
    expect(last.isToday).toBe(true);
    // Friday & Saturday of final week should be out of range
    expect(cells[52][5].inRange).toBe(false);
    expect(cells[52][6].inRange).toBe(false);
  });
});

describe('Density Calibration & Mission Summary', () => {
  it('computes light vs full commit counts accurately', () => {
    const grid = createEmptyGrid(0);
    grid[10][1] = 1;
    grid[10][2] = 4;

    const today = new Date(Date.UTC(2026, 5, 10));
    const { cells } = buildCalendarCells(grid, 'rolling', 2026, today);

    const light: DensityConfig = { preset: 'light', levels: [0, 1, 2, 3, 4] };
    const full: DensityConfig = { preset: 'full', levels: [0, 8, 18, 30, 50] };

    const sLight = buildMissionSummary(cells, light);
    const sFull = buildMissionSummary(cells, full);

    expect(sLight.activeDays).toBe(2);
    expect(sLight.totalCommits).toBe(5);
    expect(sFull.totalCommits).toBe(58);
    expect(sFull.peakCommits).toBe(50);
  });
});

describe('Full Year Auto-Fill (15% - 100%), Share Hash & Scripts', () => {
  it('supports 15% to 100% full year auto-fill in both varied and solid modes', () => {
    const variedFull = randomizeGridWithDensity(1, 4, false);
    expect(variedFull).toHaveLength(GRID_COLS);
    const variedLevels = new Set(variedFull.flat());
    expect(variedLevels.has(0)).toBe(false);
    expect(variedLevels.size).toBeGreaterThan(1);

    const solidFull = randomizeGridWithDensity(1, 4, true);
    expect(solidFull.flat().every((lv) => lv === 4)).toBe(true);

    const lightFill = randomizeGridWithDensity(0.15, 3, false);
    const filledCount = lightFill.flat().filter((lv) => lv > 0).length;
    expect(filledCount).toBeGreaterThan(10);
    expect(filledCount).toBeLessThan(150);
  });

  it('roundtrips full-year auto-fill URL hash state', () => {
    const grid = randomizeGridWithDensity(0.75, 4);
    const density: DensityConfig = { preset: 'standard', levels: [0, 2, 5, 8, 12] };
    const hash = encodeShareHash(grid, 'takina', 'year', 2026, density);
    const decoded = decodeShareHash(`#plan=${hash}`);

    expect(decoded).not.toBeNull();
    expect(decoded?.theme).toBe('takina');
    expect(decoded?.calendarMode).toBe('year');
    expect(decoded?.year).toBe(2026);
    expect(decoded?.levels).toEqual([0, 2, 5, 8, 12]);
    expect(decoded?.grid).toEqual(grid);
  });

  it('generates Bash and PowerShell mission scripts', () => {
    const entries = [{ date: '2026-05-01', count: 3, level: 2 as const }];
    const sh = generateBashMissionScript({
      authorName: 'Chisato',
      authorEmail: 'chisato@example.com',
      repoName: 'sakura-canvas',
      entries,
      messageStyle: 'chisato',
    });
    const ps1 = generatePowerShellMissionScript({
      authorName: 'Takina',
      authorEmail: 'takina@example.com',
      repoName: 'sakura-canvas',
      entries,
      messageStyle: 'takina',
    });

    expect(sh).toContain('git fast-import');
    expect(sh).toContain('chisato@example.com');
    expect(ps1).toContain('git fast-import');
    expect(ps1).toContain('takina@example.com');
  });
});

describe('Security Hardening & View-Source Guard', () => {
  it('sanitizes untrusted theme, mode, year, and density from share hash', () => {
    const malicious = LZString.compressToEncodedURIComponent(
      JSON.stringify({
        g: '2'.repeat(GRID_COLS * GRID_ROWS),
        t: '__proto__',
        m: 'invalid-mode',
        y: 99999,
        d: [99, -5, 9999, 10, 20],
      }),
    );

    const decoded = decodeShareHash(`#plan=${malicious}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.theme).toBeUndefined();
    expect(decoded?.calendarMode).toBeUndefined();
    expect(decoded?.year).toBeUndefined();
    expect(decoded?.levels).toEqual([0, 0, 500, 10, 20]);
  });

  it('strips shell and fast-import injection tokens in generated scripts', () => {
    const entries = [
      { date: '2026-05-01', count: 2, level: 1 as const },
      { date: 'not-a-date\nrm -rf /', count: 99, level: 4 as const },
    ];
    const sh = generateBashMissionScript({
      authorName: 'Chisato $(id) `whoami` <x>\ncommit',
      authorEmail: 'bad\nemail@example.com',
      repoName: '../evil/repo',
      entries,
      messageStyle: 'chisato',
    });
    const ps1 = generatePowerShellMissionScript({
      authorName: "Takina'; Invoke-WebRequest evil",
      authorEmail: 'takina@example.com\r\n<inject>',
      repoName: 'sakura-canvas',
      entries,
      messageStyle: 'takina',
    });

    expect(sh).not.toContain('$(id)');
    expect(sh).not.toContain('`whoami`');
    expect(sh).not.toContain('not-a-date');
    expect(sh).not.toContain('../evil');
    expect(ps1).not.toContain('not-a-date');
    expect(ps1).not.toContain('<inject>');
  });

  it('detects View Source and DevTools shortcuts while preserving editing shortcuts', () => {
    expect(
      isRestrictedSourceShortcut({ key: 'u', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(true);
    expect(
      isRestrictedSourceShortcut({ key: 'F12', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(true);
    expect(
      isRestrictedSourceShortcut({ key: 'I', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }),
    ).toBe(true);
    expect(
      isRestrictedSourceShortcut({ key: 's', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(true);

    // Allowed normal shortcuts
    expect(
      isRestrictedSourceShortcut({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(false);
    expect(
      isRestrictedSourceShortcut({ key: 'c', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(false);
    expect(
      isRestrictedSourceShortcut({ key: 'v', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBe(false);
  });
});
