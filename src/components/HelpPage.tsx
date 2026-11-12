import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Paintbrush,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { THEME_HERO_MEDIA } from '../data/characters';
import type { ThemePaletteConfig } from '../data/themes';

interface HelpPageProps {
  theme: ThemePaletteConfig;
  onBackToStudio: () => void;
}

type HelpLang = 'id' | 'en';

const COPY = {
  id: {
    badge: 'PANDUAN & INFORMASI // NO-DB EDITION',
    title: 'Tentang Sakura Bullet Paint',
    subtitle: 'Cara termudah melukis grafik kontribusi GitHub bertema Lycoris Recoil — tanpa database.',
    backBtn: 'Kembali ke Studio Kanvas',
    aboutTitle: 'About',
    aboutParagraphs: [
      'Sakura Bullet Paint adalah cara paling praktis untuk melukis grafik kontribusi GitHub (53 × 7) sekaligus menjalankan auto-commit otomatis bertema Café LycoReco.',
      'Karena web ini berjalan 100% tanpa database atau backend server, kamu cukup menghubungkan akun GitHub milikmu sendiri menggunakan Personal Access Token (PAT) yang dibatasi ke satu repository mandiri (disimpan sementara hanya di sesi browser), beserta username dan email GitHub terverifikasi. Atau, kamu bisa memakai mode Export Script Offline tanpa perlu memasukkan token sama sekali.',
    ],
    paintTitle: 'Instructions — Mode Paint (Lukis Kalender)',
    paintSubtitle: 'Membuat pola gambar atau teks di repository GitHub publik/mandiri untuk mewarnai grafik kontribusi.',
    paintSteps: [
      {
        num: '1',
        emoji: '🎨',
        title: 'Pilih Level Warna & Kepadatan Commit',
        desc: 'Tentukan intensitas warna (Level 0–4) dan atur jumlah commit per hari mulai dari Sedikit (1–4) hingga Full Maksimal (8–50+).',
      },
      {
        num: '2',
        emoji: '🖌️',
        title: 'Lukis Grafik Kontribusi Kamu',
        desc: 'Gunakan Auto-Fill Full Year (15%–100%) dengan mode gradasi atau solid, lalu sesuaikan manual di kanvas 53 × 7 pakai kuas, Ricochet, atau Mirror.',
      },
      {
        num: '3',
        emoji: '🔒',
        title: 'Kirim Misi (Submit Paint Job)',
        desc: 'Masukkan target repository non-fork dan email akun GitHub, lalu klik Execute Mission via GitHub Actions, Direct Browser API, atau unduh script offline.',
      },
      {
        num: '4',
        emoji: '✉️',
        title: 'Pantau Proses & Cek Profil GitHub',
        desc: 'Setelah GitHub Actions selesai berjalan (biasanya dalam hitungan detik, atau cek notifikasi status di tab Actions repo kamu), grafik kontribusi di profil GitHub akan langsung terisi.',
      },
    ],
    subscribeTitle: 'Instructions — Mode Subscribe (Auto-Commit Harian / Café Shift)',
    subscribeSubtitle: 'Secara otomatis membuat commit harian di repository GitHub kamu setiap hari agar streak tetap aktif.',
    subscribeSteps: [
      {
        num: '1',
        emoji: '📈',
        title: 'Aktifkan Café Shift & Pilih Jumlah Commit/Hari',
        desc: 'Nyalakan toggle Auto-Commit Harian (Café Shift Cron) di panel pengaturan dan atur jumlah commit per hari. Semakin tinggi angkanya, semakin pekat warna hijau yang muncul seiring berjalannya waktu.',
      },
      {
        num: '2',
        emoji: '🕒',
        title: 'Eksekusi Otomatis Setiap 24 Jam',
        desc: 'Setiap hari (sekitar pukul 09:15 WIB), workflow GitHub Actions di repository kamu akan commit otomatis. Jika belum terlihat kotak hijau di hari tersebut, periksa tab Actions atau pastikan email author cocok dengan akun GitHub.',
      },
      {
        num: '3',
        emoji: '📅',
        title: 'Catatan Penting Jadwal Harian',
        desc: 'Mode Auto-Commit Harian tidak melukis seluruh kalender ke belakang sekaligus secara otomatis — fitur ini membuat commit harian mulai dari hari kamu mengaktifkannya dan mendeploy sakura-plan.json ke repo.',
      },
    ],
    tipsTitle: 'Checklist Penting Agar Kotak Hijau Muncul',
    tips: [
      'Gunakan repository baru/standalone (JANGAN Fork) — GitHub tidak menghitung commit di repo hasil fork ke grafik kontribusi.',
      'Email di kolom Author Email wajib sama persis dengan email terverifikasi akun GitHub (atau ID+username@users.noreply.github.com).',
      'Jika profil GitHub kamu sudah punya hari dengan banyak commit di repo lain, naikkan Density ke Ramai / Full agar warna tetap kontras.',
    ],
    disclaimerTitle: 'Disclaimer',
    disclaimerText:
      'Sakura Bullet Paint disediakan apa adanya ("as-is") tanpa janji atau jaminan apa pun terkait layanan ini. Sakura Bullet Paint tidak berafiliasi dengan GitHub, Inc. maupun pihak pemegang hak cipta resmi anime Lycoris Recoil dalam bentuk apa pun. Kami tidak bertanggung jawab atas segala kerusakan, kehilangan data, maupun pembatasan akun yang timbul akibat penggunaan atau ketidakmampuan menggunakan layanan ini.',
  },
  en: {
    badge: 'HELP & DOCUMENTATION // NO-DB EDITION',
    title: 'About Sakura Bullet Paint',
    subtitle: 'The most convenient way to paint your GitHub Contribution graph with a Lycoris Recoil aesthetic — with zero database.',
    backBtn: 'Back to Canvas Studio',
    aboutTitle: 'About',
    aboutParagraphs: [
      'Sakura Bullet Paint is a convenient static studio to paint your GitHub Contribution graph (53 × 7) and run scheduled daily auto-commits themed around Café LycoReco.',
      'In order to use Sakura Bullet Paint without any backend database, you connect your own GitHub account using a Fine-Grained Personal Access Token (kept only in browser sessionStorage) scoped to a dedicated standalone repository along with your GitHub username and verified email address — or export an offline script with zero token required.',
    ],
    paintTitle: 'Instructions — Paint Mode',
    paintSubtitle: 'Creates or updates a dedicated standalone GitHub repository to paint your contribution graph.',
    paintSteps: [
      {
        num: '1',
        emoji: '🎨',
        title: 'Choose Color Intensity & Commit Density',
        desc: 'Pick intensity levels (0–4) and calibrate commits per day from Light (1–4) up to Full Overdrive (8–50+).',
      },
      {
        num: '2',
        emoji: '🖌️',
        title: 'Paint Your Contribution Graph',
        desc: 'Use Full Year Auto-Fill (15%–100%) in gradient or solid mode, or fine-tune manually on the 53 × 7 grid with Pen, Ricochet, or Mirror brushes.',
      },
      {
        num: '3',
        emoji: '🔒',
        title: 'Submit the Paint Job',
        desc: 'Set your standalone non-fork repository and verified GitHub email, then click Execute Mission via GitHub Actions, Direct Browser API, or download the offline script.',
      },
      {
        num: '4',
        emoji: '✉️',
        title: 'Track the Action & Check Your Profile',
        desc: 'Once the GitHub Actions workflow completes (usually within seconds — check your repo Actions tab or email notifications if enabled), your contribution graph updates automatically.',
      },
    ],
    subscribeTitle: 'Instructions — Subscribe (Daily Café Shift Auto-Commit)',
    subscribeSubtitle: 'Automatically paints your contribution graph every day by making scheduled daily commits on your behalf.',
    subscribeSteps: [
      {
        num: '1',
        emoji: '📈',
        title: 'Choose a Daily Commit Density',
        desc: 'Enable Auto-Commit Harian (Café Shift Cron) and pick how many commits per day to generate. The higher the count, the denser your green shade becomes over time.',
      },
      {
        num: '2',
        emoji: '🕒',
        title: 'Daily Automated Execution Within 24 Hours',
        desc: 'GitHub Actions triggers daily (~02:15 UTC) to create commits on the present day. If no new shade appears, verify your Actions tab and ensure Author Email matches your GitHub account.',
      },
      {
        num: '3',
        emoji: '📅',
        title: 'Important Note on Daily Schedule',
        desc: 'Enabling Daily Café Shift does not retroactively paint your entire past year on its own — it appends daily commits starting from the day you deploy it (combine with Paint Mode for historical art).',
      },
    ],
    tipsTitle: 'Quick Checklist for Visible Contributions',
    tips: [
      'Always use a standalone repository (NOT a fork) — commits inside forked repositories are not counted on your GitHub profile graph.',
      'Your Author Email must match a verified email on your GitHub account (or your ID+username@users.noreply.github.com address).',
      'GitHub calculates green shades relative to your busiest day in that year; raise the Density slider if your profile already has high-commit days.',
    ],
    disclaimerTitle: 'Disclaimer',
    disclaimerText:
      'Sakura Bullet Paint is provided as-is and makes no promises or guarantees about this service. Sakura Bullet Paint is not affiliated with GitHub, Inc. or the official rights holders of Lycoris Recoil in any way. We are not liable for any damages or losses arising from your use or inability to use this service.',
  },
} as const;

export function HelpPage({ theme, onBackToStudio }: HelpPageProps) {
  const [lang, setLang] = useState<HelpLang>('id');
  const t = COPY[lang];

  return (
    <div className="space-y-5">
      {/* Top Help Hero Banner */}
      <section
        className={`relative overflow-hidden rounded-3xl border ${theme.borderColor} bg-linear-to-br ${theme.heroBackdrop} p-5 shadow-md sm:p-7`}
      >
        <div className="grid items-center gap-6 md:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-wider ${theme.accentSoftBg} ${theme.accentSoftText}`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {t.badge}
              </span>

              {/* ID / EN Switcher */}
              <div className={`inline-flex rounded-xl border ${theme.borderColor} ${theme.surfaceBg} p-0.5 text-xs`}>
                <button
                  type="button"
                  onClick={() => setLang('id')}
                  className={`rounded-lg px-2.5 py-1 font-mono font-bold transition ${
                    lang === 'id' ? `${theme.accentBg} ${theme.accentText}` : theme.textSecondary
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`rounded-lg px-2.5 py-1 font-mono font-bold transition ${
                    lang === 'en' ? `${theme.accentBg} ${theme.accentText}` : theme.textSecondary
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <h2 className={`font-display text-2xl font-extrabold tracking-tight sm:text-3xl ${theme.textPrimary}`}>
              {t.title}
            </h2>
            <p className={`text-sm leading-relaxed ${theme.textSecondary}`}>{t.subtitle}</p>

            <div className="pt-1">
              <button
                type="button"
                onClick={onBackToStudio}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold ${theme.accentGradient} ${theme.accentText} shadow-sm transition hover:scale-[1.02]`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.backBtn}
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-47.5">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -inset-2 rounded-3xl opacity-25 blur-xl ${theme.accentGradient}`}
            />
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-black/15">
              <div className="aspect-3/4 overflow-hidden">
                <img
                  src={THEME_HERO_MEDIA.duo}
                  alt="Lycoris Recoil Help Guide"
                  className="h-full w-full object-cover object-[50%_12%]"
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/85 via-black/35 to-transparent px-3 py-2.5 pt-8 text-white">
                <span className="font-mono text-[10px] font-bold text-rose-200">GUIDE // LYCORECO</span>
                <Sparkles className="h-3.5 w-3.5 text-rose-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className={`rounded-3xl border ${theme.borderColor} ${theme.surfaceBg} p-5 shadow-md sm:p-6`}>
        <h3 className={`font-display text-lg font-extrabold ${theme.textPrimary}`}>{t.aboutTitle}</h3>
        <div className={`mt-2.5 space-y-2.5 text-sm leading-relaxed ${theme.textSecondary}`}>
          {t.aboutParagraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </section>

      {/* Instructions: Paint + Subscribe Side-by-Side / Stacked */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Paint Instructions */}
        <section className={`rounded-3xl border ${theme.borderColor} ${theme.surfaceBg} p-5 shadow-md sm:p-6`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${theme.accentSoftBg} ${theme.accentSoftText}`}>
              <Paintbrush className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`font-display text-base font-extrabold sm:text-lg ${theme.textPrimary}`}>
                {t.paintTitle}
              </h3>
              <p className={`mt-0.5 text-xs ${theme.textSecondary}`}>{t.paintSubtitle}</p>
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {t.paintSteps.map((step) => (
              <li
                key={step.num}
                className={`flex gap-3 rounded-2xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-3.5`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-extrabold ${theme.accentBg} ${theme.accentText}`}
                >
                  {step.num}
                </span>
                <div>
                  <h4 className={`text-xs font-bold sm:text-sm ${theme.textPrimary}`}>
                    {step.emoji} {step.title}
                  </h4>
                  <p className={`mt-1 text-xs leading-relaxed ${theme.textSecondary}`}>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Subscribe / Daily Shift Instructions */}
        <section className={`rounded-3xl border ${theme.borderColor} ${theme.surfaceBg} p-5 shadow-md sm:p-6`}>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${theme.accentSoftBg} ${theme.accentSoftText}`}>
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`font-display text-base font-extrabold sm:text-lg ${theme.textPrimary}`}>
                {t.subscribeTitle}
              </h3>
              <p className={`mt-0.5 text-xs ${theme.textSecondary}`}>{t.subscribeSubtitle}</p>
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {t.subscribeSteps.map((step) => (
              <li
                key={step.num}
                className={`flex gap-3 rounded-2xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-3.5`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-extrabold ${theme.accentBg} ${theme.accentText}`}
                >
                  {step.num}
                </span>
                <div>
                  <h4 className={`text-xs font-bold sm:text-sm ${theme.textPrimary}`}>
                    {step.emoji} {step.title}
                  </h4>
                  <p className={`mt-1 text-xs leading-relaxed ${theme.textSecondary}`}>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Checklist + Disclaimer */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className={`rounded-3xl border ${theme.borderColor} ${theme.surfaceBg} p-5 shadow-md sm:p-6`}>
          <h3 className={`font-display flex items-center gap-2 text-base font-extrabold ${theme.textPrimary}`}>
            <AlertCircle className={`h-4 w-4 ${theme.secondaryAccentText}`} />
            {t.tipsTitle}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {t.tips.map((tip, idx) => (
              <li
                key={idx}
                className={`flex items-start gap-2.5 rounded-xl border ${theme.borderColor} ${theme.surfaceMutedBg} p-3 text-xs leading-relaxed ${theme.textPrimary}`}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`flex flex-col justify-between rounded-3xl border ${theme.borderColor} ${theme.surfaceBg} p-5 shadow-md sm:p-6`}>
          <div>
            <h3 className={`font-display flex items-center gap-2 text-base font-extrabold ${theme.textPrimary}`}>
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              {t.disclaimerTitle}
            </h3>
            <p className={`mt-2.5 text-xs leading-relaxed sm:text-sm ${theme.textSecondary}`}>
              {t.disclaimerText}
            </p>
          </div>
          <div className={`mt-4 flex items-center justify-between border-t border-dashed border-current/15 pt-3 font-mono text-[11px] ${theme.textSecondary}`}>
            <span>SAKURA BULLET PAINT // NO-DB</span>
            <span>CAFÉ LYCORECO</span>
          </div>
        </section>
      </div>
    </div>
  );
}

