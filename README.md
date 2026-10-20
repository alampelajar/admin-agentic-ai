# Agentic AI — Admin Dashboard

Frontend dashboard untuk administrator platform Agentic AI. Aplikasi ini menggunakan React dan Vite, dengan tampilan bergaya shadcn/ui serta komponen UI lokal.

## Teknologi

- React 19
- Vite 8
- Tailwind CSS 4
- Komponen UI lokal dengan pola desain shadcn/ui
- React Router
- Recharts untuk visualisasi data

## Fitur utama

- Login administrator
- Dashboard administrasi
- Halaman pengelolaan model AI sistem/global
- Pengaturan relasi model dengan Agent yang dipilih
- Status model dan aksi pengelolaan model
- Refresh sesi autentikasi saat didukung backend

## Persyaratan

- Node.js versi yang kompatibel dengan Vite 8
- npm
- Backend Agentic AI berjalan dan endpoint admin tersedia
- Akun administrator yang valid pada backend

## Instalasi dan menjalankan

1. Clone repo:

   ```bash
   git clone https://github.com/alampelajar/admin-agentic-ai.git
   cd admin-agentic-ai
   ```

2. Pasang dependency:

   ```bash
   npm install
   ```

3. Buat file `.env` di root repo dan atur alamat backend:

   ```env
   VITE_API_URL=http://localhost:8080
   ```

   `VITE_API_URL` harus menunjuk ke root backend, bukan ke path `/api`. Secara default aplikasi menggunakan `http://localhost:8080`.

4. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   Buka URL lokal yang diberikan Vite di terminal (biasanya `http://localhost:5173`).

## Perintah yang tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm run preview` | Meninjau build produksi secara lokal |
| `npm run lint` | Menjalankan Oxlint |

## Integrasi backend

Dashboard menggunakan endpoint admin pada backend Agentic AI. Pastikan backend sedang berjalan, URL `VITE_API_URL` benar, dan konfigurasi CORS backend mengizinkan origin dashboard.

Login memerlukan akun administrator yang valid. README ini tidak menyertakan kredensial default; gunakan akun yang sudah disiapkan secara aman di lingkungan backend.

## Kontribusi

1. Buat branch baru untuk perubahan.
2. Jalankan `npm run lint` dan `npm run build`.
3. Ajukan pull request dengan ringkasan perubahan dan hasil pengujian.
