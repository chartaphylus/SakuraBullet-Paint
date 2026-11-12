import type { CellLevel, GridMatrix } from '../types/paint';

export const GRID_COLS = 53;
export const GRID_ROWS = 7;

export function createEmptyGrid(fillLevel: CellLevel = 0): GridMatrix {
  return Array.from({ length: GRID_COLS }, () =>
    Array.from({ length: GRID_ROWS }, () => fillLevel),
  );
}

export function cloneGrid(grid: GridMatrix): GridMatrix {
  return grid.map((col) => [...col]);
}
