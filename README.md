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

Project ini merupakan aplikasi frontend statis murni tanpa environment variable atau serverless function yang wajib diatur:

1. Push repository ini ke GitHub (atau upload folder project ke Vercel).
2. Di Vercel, pilih konfigurasi berikut:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Klik **Deploy**.

---

## 🔐 Privasi & Penggunaan Token GitHub

- Personal Access Token (PAT) **tidak pernah dikirim ke server pihak ketiga** maupun disimpan ke database. Token hanya disimpan sementara di `sessionStorage` browser dan berkomunikasi langsung ke `https://api.github.com`.
- Untuk keamanan optimal, gunakan **Fine-grained Personal Access Token** yang dibatasi:
  - **Repository access:** *Only select repositories* → pilih **1 repository khusus kanvas** (bukan fork).
  - **Permissions:** `Contents: Read and write` dan `Workflows: Read and write`.
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
│   └── sakura-bullet-paint.yml   # Workflow runner untuk repo kanvas mandiri
├── image/                        # Aset ilustrasi tema Lycoris Recoil
├── public/
│   ├── icons/                    # Ikon PWA (192x192, 512x512, apple-touch-icon)
│   ├── manifest.webmanifest      # Konfigurasi PWA
│   └── sw.js                     # Service Worker offline cache
├── scripts/
│   └── execute-mission.mjs       # Eksekutor git fast-import untuk GitHub Actions
├── src/
│   ├── components/               # UI Kanvas, Density, Hero, Galeri, Deploy & Help
│   ├── data/                     # Konfigurasi karakter & 3 tema warna
│   ├── hooks/                    # Hook instalasi PWA
│   ├── lib/                      # Grid kalender, GitHub API, generator script & template
│   ├── types/                    # Definisi tipe TypeScript
│   ├── App.tsx
│   └── index.css
├── index.html
├── package.json
├── LICENSE
└── README.md
```

---

## ⚖️ Lisensi & Disclaimer

- Kode sumber aplikasi ini dirilis di bawah lisensi **[MIT License](./LICENSE)**.
- **Disclaimer:** *Sakura Bullet Paint* disediakan apa adanya (*"as-is"*) tanpa jaminan apa pun dan **tidak berafiliasi dengan GitHub, Inc.** maupun pemegang hak cipta resmi anime *Lycoris Recoil*. Seluruh aset visual di folder `image/` hanya digunakan untuk tema antarmuka non-komersial dan personal.
