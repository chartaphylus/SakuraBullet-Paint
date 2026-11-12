import { BarChart3, Clock, Flame } from 'lucide-react';
import { DENSITY_PRESETS, type ThemePaletteConfig } from '../data/themes';
import type { MissionSummary } from '../lib/calendarGrid';
import type { CellLevel, DailyShiftConfig, DensityConfig, DensityPresetId } from '../types/paint';

interface DensityPanelProps {
  theme: ThemePaletteConfig;
  density: DensityConfig;
  onChangeDensity: (d: DensityConfig) => void;
  dailyShift: DailyShiftConfig;
  onChangeDailyShift: (c: DailyShiftConfig) => void;
  summary: MissionSummary;
}

export function DensityPanel({
  theme,
  density,
  onChangeDensity,
  dailyShift,
  onChangeDailyShift,
  summary,
}: DensityPanelProps) {
  const selectPreset = (preset: Exclude<DensityPresetId, 'custom'>) => {
    onChangeDensity({
      preset,
      levels: [...DENSITY_PRESETS[preset].levels] as [0, number, number, number, number],
    });
  };

  const updateLevelValue = (idx: 1 | 2 | 3 | 4, raw: number) => {
    const clamped = Math.max(1, Math.min(100, Number.isFinite(raw) ? Math.round(raw) : 1));
    const next: [0, number, number, number, number] = [...density.levels] as [0, number, number, number, number];
    next[idx] = clamped;
    onChangeDensity({
      preset: 'custom',
      levels: next,
    });
  };

  const maxLevelCommits = Math.max(1, density.levels[4]);
  const firepowerPercent = Math.min(100, Math.round((maxLevelCommits / 50) * 100));

  return (
    <section
      id="density-section"
      className={`scroll-mt-20 overflow-hidden rounded-2xl border ${theme.borderColor} ${theme.surfaceBg} shadow-sm transition-colors`}
    >
      <div className="grid divide-y divide-current/10 lg:grid-cols-[1.45fr_1fr] lg:divide-x lg:divide-y-0">
        {/* Left: Commit Intensity Calibration */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className={`font-display flex items-center gap-2 text-base font-extrabold ${theme.textPrimary}`}>
                <Flame className={`h-4 w-4 ${theme.secondaryAccentText}`} />
                Banyak Commit per Hari (Sedikit → Full)
              </h3>
              <p className={`text-xs ${theme.textSecondary}`}>
                Atur intensitas commit untuk Level 1–4 agar gradasi warna tampil kontras di GitHub.
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${theme.accentSoftBg} ${theme.accentSoftText}`}>
              PEAK: {maxLevelCommits}/hr
            </span>
          </div>

          {/* Preset Pills */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(DENSITY_PRESETS) as Array<Exclude<DensityPresetId, 'custom'>>).map((key) => {
              const item = DENSITY_PRESETS[key];
              const active = density.preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? `${theme.accentBg} border-transparent ${theme.accentText} shadow-sm`
                      : `${theme.borderColor} ${theme.surfaceMutedBg} ${theme.textPrimary} hover:border-rose-400`
                  }`}
                >
                  <span className="text-xs font-extrabold">{item.shortLabel}</span>
                  <span className={`mt-0.5 font-mono text-[11px] ${active ? 'text-white/90' : theme.textSecondary}`}>
                    {item.levels.slice(1).join('·')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level 1..4 Fine-Tune Inputs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([1, 2, 3, 4] as const).map((lv) => (
              <label
                key={lv}
                className={`flex items-center justify-between gap-2 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-2.5 py-2`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-[3px] border border-black/15"
                    style={{ backgroundColor: theme.gridColors[lv] }}
                  />
                  <span className={`text-xs font-semibold ${theme.textSecondary}`}>L{lv}</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={density.levels[lv]}
                  onChange={(e) => updateLevelValue(lv, Number(e.target.value))}
                  className={`w-14 rounded-lg border ${theme.borderColor} ${theme.surfaceBg} px-1.5 py-1 text-right font-mono text-sm font-bold outline-none sm:text-xs ${theme.textPrimary}`}
                />
              </label>
            ))}
          </div>

          {/* Subtle Intensity Bar */}
          <div className="space-y-1">
            <div className={`h-1.5 w-full overflow-hidden rounded-full ${theme.surfaceMutedBg}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${theme.accentGradient}`}
                style={{ width: `${Math.max(8, firepowerPercent)}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] opacity-65">
              <span>Sedikit</span>
              <span>Sedang</span>
              <span>Ramai</span>
              <span>Full Overdrive</span>
            </div>
          </div>

          {/* Daily Cron Shift Row */}
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3.5 py-2.5`}>
            <div className="flex items-center gap-2.5">
              <Clock className={`h-4 w-4 shrink-0 ${theme.secondaryAccentText}`} />
              <div>
                <div className={`text-xs font-bold ${theme.textPrimary}`}>
                  Auto-Commit Harian (Cron Schedule)
                </div>
                <div className={`text-[11px] ${theme.textSecondary}`}>
                  GitHub Actions commit otomatis tiap hari ~09:15 WIB.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dailyShift.enabled && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={dailyShift.commitsPerDay}
                    onChange={(e) =>
                      onChangeDailyShift({
                        ...dailyShift,
                        commitsPerDay: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                      })
                    }
                    className={`w-14 rounded-lg border ${theme.borderColor} ${theme.surfaceBg} px-2 py-1 font-mono text-xs font-bold ${theme.textPrimary}`}
                  />
                  <span className={`text-[11px] ${theme.textSecondary}`}>c/hr</span>
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  onChangeDailyShift({
                    ...dailyShift,
                    enabled: !dailyShift.enabled,
                  })
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  dailyShift.enabled
                    ? `${theme.accentBg} ${theme.accentText}`
                    : `border ${theme.borderColor} ${theme.surfaceBg} ${theme.textSecondary}`
                }`}
              >
                {dailyShift.enabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Clean Summary & Message Style */}
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-6">
          <div className="space-y-3.5">
            <h3 className={`font-display flex items-center gap-2 text-base font-extrabold ${theme.textPrimary}`}>
              <BarChart3 className={`h-4 w-4 ${theme.secondaryAccentText}`} />
              Ringkasan Misi
            </h3>

            {/* 3 Clean KPI Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-2.5`}>
                <div className={`text-[10px] font-semibold uppercase ${theme.textSecondary}`}>Hari Aktif</div>
                <div className={`mt-0.5 font-mono text-base font-extrabold ${theme.textPrimary}`}>
                  {summary.activeDays}
                </div>
              </div>
              <div className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-2.5`}>
                <div className={`text-[10px] font-semibold uppercase ${theme.textSecondary}`}>Peak / Hr</div>
                <div className={`mt-0.5 font-mono text-base font-extrabold ${theme.textPrimary}`}>
                  {summary.peakCommits}
                </div>
              </div>
              <div className={`rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-2.5`}>
                <div className={`text-[10px] font-semibold uppercase ${theme.textSecondary}`}>Total</div>
                <div className={`mt-0.5 font-mono text-base font-extrabold ${theme.secondaryAccentText}`}>
                  {summary.totalCommits.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Level Distribution Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as CellLevel[]).map((lv) => (
                <div
                  key={lv}
                  className={`flex items-center justify-between rounded-lg border ${theme.borderColor} ${theme.surfaceMutedBg} px-2 py-1.5 font-mono text-[11px]`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-xs border border-black/15"
                    style={{ backgroundColor: theme.gridColors[lv] }}
                  />
                  <span className={`font-bold ${theme.textPrimary}`}>{summary.levelCounts[lv]}d</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className={`flex items-center justify-between gap-2 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} px-3 py-2`}>
              <span className={`text-xs font-bold ${theme.textPrimary}`}>Gaya Pesan Commit</span>
              <select
                value={dailyShift.messageStyle}
                onChange={(e) =>
                  onChangeDailyShift({
                    ...dailyShift,
                    messageStyle: e.target.value as DailyShiftConfig['messageStyle'],
                  })
                }
                className={`rounded-lg border ${theme.borderColor} ${theme.surfaceBg} px-2.5 py-1 text-xs font-semibold outline-none ${theme.textPrimary}`}
              >
                <option value="lycoreco">Café LycoReco</option>
                <option value="chisato">Chisato Non-Lethal</option>
                <option value="takina">Takina Tactical</option>
                <option value="minimal">Minimalist Clean</option>
              </select>
            </div>

            <p className={`text-[11px] leading-relaxed ${theme.textSecondary}`}>
              {summary.totalCommits > 400
                ? '💡 Di atas 400 commit: disarankan memakai metode GitHub Actions di bawah agar selesai hitungan detik.'
                : '✨ Ringan (<400 commit): cocok memakai GitHub Actions maupun Direct Browser API.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
