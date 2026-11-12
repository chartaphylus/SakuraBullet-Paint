export type CellLevel = 0 | 1 | 2 | 3 | 4;

export type GridMatrix = CellLevel[][]; // [col: 0..52][row: 0..6]

export type ThemeId = 'chisato' | 'takina' | 'duo';

export type PreviewPalette = 'theme' | 'github-dark' | 'github-light';

export type CalendarMode = 'rolling' | 'year';

export type BrushTool = 'pen' | 'spray' | 'eraser' | 'mirror-x' | 'mirror-y';

export type DensityPresetId = 'light' | 'standard' | 'heavy' | 'full' | 'custom';

export interface DensityConfig {
  preset: DensityPresetId;
  levels: [0, number, number, number, number];
}

export interface DailyShiftConfig {
  enabled: boolean;
  commitsPerDay: number;
  messageStyle: 'lycoreco' | 'chisato' | 'takina' | 'minimal';
}

export interface CalendarCell {
  col: number;
  row: number;
  dateStr: string; // YYYY-MM-DD
  inRange: boolean;
  isToday: boolean;
  level: CellLevel;
}

export interface MonthLabel {
  col: number;
  label: string;
}

export interface GitHubConnection {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  authorName: string;
  authorEmail: string;
}

export interface MissionCommitEntry {
  date: string;
  count: number;
  level: CellLevel;
}

export interface SakuraPlanPayload {
  version: 1;
  theme: ThemeId;
  mode: 'paint' | 'reset' | 'idle';
  generatedAt: string;
  authorName: string;
  authorEmail: string;
  messageStyle: DailyShiftConfig['messageStyle'];
  dailyShift: DailyShiftConfig;
  commits: MissionCommitEntry[];
}

export interface CharacterMediaItem {
  id: string;
  title: string;
  subtitle: string;
  character: 'chisato' | 'takina' | 'duo' | 'motif';
  tag: string;
  src: string;
  objectPosition: string;
  caption: string;
}

