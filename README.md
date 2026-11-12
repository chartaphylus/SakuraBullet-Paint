# 🌸 Sakura Bullet Paint — Lycoris Recoil GitHub Contribution Studio

Aplikasi web & PWA **React + TypeScript + Tailwind CSS v4 + Vite** bertema *Lycoris Recoil* untuk melukis grafik kontribusi GitHub (`53 × 7`) dan menjalankan auto-commit terjadwal **100% statis tanpa database atau backend server**.

---

## ✨ Fitur Utama

- **100% Static Web (Zero Database):**
  - Draft kanvas & pengaturan tersimpan otomatis di `localStorage`.
  - Desain dapat dibagikan via URL terkompresi (`#plan=...` menggunakan `lz-string`).
  - Rencana commit disimpan langsung ke repository target milik pengguna (`sakura-plan.json`).
- **3 Mode Tema & Galeri Karakter (`image/`):**
  - **Chisato Crimson** (*Chisato Nishikigi*)
  - **Takina Tactical** (*Inoue Takina*)
  - **LycoReco Duo** (*Chisato & Takina*) + modal galeri interaktif lengkap.
- **Kanvas Kontribusi `53 × 7` & Full-Year Auto-Fill:**
  - Mendukung mode **Rolling 53 Minggu** atau **Tahun Penuh** (`2024`–`2027`).
  - **Auto-Fill Full Year (`15%–100%`)** dalam mode **Gradasi** ataupun **Solid**.
  - Kuas manual: **Pen**, **Eraser**, **Ricochet**, **Mirror-X**, dan **Mirror-Y**, lengkap dengan **Undo / Redo** (`Ctrl+Z` / `Ctrl+Y`) dan mode sentuh mobile (*Tap & Geser* / *Lukis*).
  - Pratinjau akurat palet **Tema Lycoris**, **GitHub Dark**, dan **GitHub Light**.
- **Kalibrasi Kepadatan Commit & Café Shift:**
  - Preset intensitas per level: *Sedikit (`1–4`)*, *Sedang (`2–12`)*, *Ramai (`4–25`)*, *Full Maksimal (`8–50`)*, serta nilai *Custom*.
  - Dukungan jadwal **Auto-Commit Harian (Café Shift Cron)** via GitHub Actions.
- **3 Metode Eksekusi Misi:**
  1. **GitHub Actions Auto-Pilot** — Mengirim `sakura-plan.json` + workflow `.github/workflows/sakura-bullet-paint.yml` + `scripts/execute-mission.mjs` (memakai `git fast-import` di runner Ubuntu, mendukung cron harian dan *Reset Repo*).
  2. **Direct Browser API** — Membuat blob, tree, dan backdated commit langsung dari browser melalui GitHub Git Data API.
  3. **Export Script Offline (`.ps1` / `.sh`)** — Menghasilkan script PowerShell atau Bash untuk dijalankan secara lokal tanpa memasukkan token ke website.
- **PWA Siap Install:** Dilengkapi `public/manifest.webmanifest` dan Service Worker (`public/sw.js`) untuk desktop & mobile.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript 5.7, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React, `lz-string`
- **Build & Test:** Vite 7, Vitest 3
- **Automation Runner:** GitHub Actions + Node.js (`git fast-import`)

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- **Node.js 20+** (disarankan Node.js 22 LTS)
- **npm**

### Instalasi & Development
```bash
npm install
npm run dev
```

### Pengujian & Production Build
```bash
npm test
npm run build
npm run preview
```

---

## ☁️ Deploy ke Vercel / Static Hosting

Project ini merupakan aplikasi frontend statis murni tanpa environment variable atau serverless function yang wajib diatur. Konfigurasi di [vercel.json](./vercel.json) sudah mengatur `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, SPA `rewrites`, dan HTTP security headers secara otomatis:

1. Push repository ini ke GitHub, lalu hubungkan ke Vercel.
2. Pastikan di Vercel **Settings → Build and Deployment** tidak ada *Override* yang salah (Framework Preset `Vite`, Output Directory `dist`).
3. Klik **Deploy**.

---

## 🔐 Privasi, Keamanan & Proteksi Halaman

- **Zero Backend Token Handling:** Personal Access Token (PAT) tidak pernah dikirim ke server pihak ketiga maupun disimpan ke database. Token hanya disimpan sementara di `sessionStorage` browser dan berkomunikasi langsung ke `https://api.github.com` dengan kebijakan `no-referrer`.
- **Token Scope Minimal:** Gunakan **Fine-grained Personal Access Token** dengan batasan:
  - **Repository access:** *Only select repositories* → pilih **1 repository khusus kanvas** (bukan fork).
  - **Permissions:** `Contents: Read and write` dan `Workflows: Read and write`.
- **HTTP Security Headers & Hardening (`vercel.json` & Vite):**
  - Terkonfigurasi **Content-Security-Policy (CSP)**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`, dan `Strict-Transport-Security`.
  - Validasi ketat input owner/repo/branch, tanggal (`YYYY-MM-DD`), state URL `#plan=...` / `localStorage`, serta sanitasi script `git fast-import`, Bash (`.sh`), dan PowerShell (`.ps1`).
  - Production build menonaktifkan Source Map (`sourcemap: false`) serta menghapus `console`/`debugger`.
- **Proteksi View Source & Antarmuka:**
  - Shortcut `Ctrl+U` / `Cmd+Option+U`, `Ctrl+S`, `F12`, `Ctrl+Shift+I/J/C`, drag gambar, serta klik kanan global pada halaman dinonaktifkan secara aman — sembari tetap mengizinkan *Paste* di kolom input PAT/Email dan *Copy* pada preview script offline maupun log.
  - *Catatan keamanan web statis:* Jika kamu ingin kode React asli aplikasi ini tidak terbaca orang lain di GitHub, atur repository website ini sebagai **Private** sebelum di-deploy ke Vercel.
- Jika tidak ingin memasukkan token ke browser, gunakan tab **Export Script (`.ps1` / `.sh`)** dan jalankan secara lokal.

---

## ✅ Checklist Agar Kotak Hijau Muncul di Profil GitHub

1. **Gunakan repository mandiri (standalone), BUKAN hasil fork** — GitHub tidak menghitung commit di repository fork ke grafik kontribusi.
2. **Email author harus cocok** dengan email terverifikasi pada akun GitHub kamu (atau alamat `ID+username@users.noreply.github.com`).
3. Jika kamu sudah memakai tool lain (seperti *Paint GitHub*), gunakan **nama repository target yang berbeda** agar riwayat dan workflow masing-masing tidak saling menimpa.
4. Jika warna terlihat tipis dibanding hari paling sibuk di akunmu, naikkan preset kepadatan ke **Ramai** atau **Full Maksimal**.

---

## 📁 Struktur Proyek

```text
sakura-bullet-paint/
├── .github/workflows/
│   └── sakura-bullet-paint.yml   # Template workflow runner untuk repo kanvas mandiri
├── image/                        # 5 aset ilustrasi tema Lycoris Recoil
├── public/
│   ├── icons/                    # Ikon PWA (192x192, 512x512, apple-touch-icon)
│   ├── manifest.webmanifest      # Manifest konfigurasi PWA
│   └── sw.js                     # Service Worker offline cache
├── scripts/
│   └── execute-mission.mjs       # Eksekutor git fast-import untuk GitHub Actions
├── src/
│   ├── components/
│   │   ├── ContributionCanvas.tsx  # Kanvas 53×7, Full Year 15%–100%, kuas & preview
│   │   ├── DensityPanel.tsx        # Kalibrasi kepadatan commit & jadwal Café Shift
│   │   ├── GalleryModal.tsx        # Modal galeri interaktif seluruh artwork
│   │   ├── HelpPage.tsx            # Halaman About, panduan ID/EN & disclaimer
│   │   ├── HeroShowcase.tsx        # Hero & selector tema karakter mobile/desktop
│   │   └── MissionDeployPanel.tsx  # Eksekusi Actions, Browser API & Export .ps1/.sh
│   ├── data/
│   │   ├── characters.ts           # Daftar media galeri & focal point karakter
│   │   ├── pixelTemplates.ts       # Utilitas dimensi & kloning matriks 53×7
│   │   └── themes.ts               # Konfigurasi 3 tema warna, pesan commit & preset
│   ├── hooks/
│   │   └── usePwaInstall.ts        # Hook deteksi & prompt instalasi PWA
│   ├── lib/
│   │   ├── __tests__/
│   │   │   └── paintCore.test.ts   # Unit test grid, hash URL, sanitasi & guard
│   │   ├── calendarGrid.ts         # Perhitungan kalender, sanitasi state & share hash
│   │   ├── githubApi.ts            # Klien GitHub REST & Git Data API + validasi input
│   │   ├── repoTemplateFiles.ts    # Template runner, workflow & README repo target
│   │   ├── scriptGenerator.ts      # Generator script offline Bash (.sh) & PowerShell (.ps1)
│   │   └── sourceGuard.ts          # Proteksi View Source, klik kanan & frame-busting
│   ├── types/
│   │   └── paint.ts                # Definisi tipe TypeScript aplikasi
│   ├── App.tsx                     # Root studio, state draft/sesi, header & footer
│   ├── index.css                   # Entrypoint Tailwind CSS v4 & utility animasi
│   ├── main.tsx                    # Bootstrap React & registrasi Service Worker
│   └── vite-env.d.ts               # Tipe environment Vite
├── .gitignore
├── index.html                      # Entrypoint HTML, metadata PWA & no-referrer
├── LICENSE                         # Lisensi MIT
├── package.json                    # Dependencies, scripts & allowScripts (esbuild)
├── package-lock.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vercel.json                     # Vite build/dist config, SPA rewrites & security headers
└── vite.config.ts                  # Konfigurasi Vite (base '/', minify & sourcemap: false)
```

---

## ⚖️ Lisensi & Disclaimer

- Kode sumber aplikasi ini dirilis di bawah lisensi **[MIT License](./LICENSE)**.
- **Disclaimer:** *Sakura Bullet Paint* disediakan apa adanya (*"as-is"*) tanpa jaminan apa pun dan **tidak berafiliasi dengan GitHub, Inc.** maupun pemegang hak cipta resmi anime *Lycoris Recoil*. Seluruh aset visual di folder `image/` hanya digunakan untuk tema antarmuka non-komersial dan personal.
