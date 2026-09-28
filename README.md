# Sistem Pembukuan BUMDes – Usaha Peternakan Ayam Petelur

Aplikasi web pembukuan digital BUMDes yang dirancang untuk membantu pengelolaan
keuangan usaha peternakan ayam petelur secara sederhana dan terintegrasi.

Aplikasi dibangun menggunakan **React + Vite** dan terhubung langsung dengan
**Supabase PostgreSQL** sebagai database.

> 🚀 **Live Demo System:**  
> [Klik di sini untuk membuka aplikasi](https://aliefdwiano-debug.github.io/Apk-Pembukuan-BUMDes-untuk-Usaha-Peternakan-Ayam-Petelur/)

---

## 📌 Deskripsi Proyek

**Sistem Pembukuan BUMDes** merupakan aplikasi pencatatan dan pengelolaan
keuangan untuk BUMDes yang menjalankan usaha peternakan ayam petelur.

Sistem ini dirancang untuk membantu proses pembukuan yang sebelumnya dilakukan
secara manual menjadi lebih terstruktur dan terdigitalisasi.

Aplikasi dapat digunakan untuk mencatat transaksi, mengelola data usaha,
menghasilkan jurnal dan laporan keuangan, serta mengelola data persediaan dan
aset.

---

## ✨ Fitur Utama

- **Buku Kas Harian**  
  Pencatatan transaksi pemasukan dan pengeluaran usaha.

- **Jurnal & Buku Besar**  
  Pengolahan transaksi menjadi jurnal dan pencatatan buku besar secara
  terstruktur.

- **Persediaan**  
  Pengelolaan data persediaan dan transaksi yang berkaitan dengan persediaan.

- **Perhitungan HPP**  
  Mendukung pengolahan harga pokok penjualan sesuai dengan kebutuhan usaha.

- **Aset Tetap**  
  Pencatatan dan pengelolaan aset tetap BUMDes.

- **Laporan Keuangan**  
  Penyajian laporan keuangan berdasarkan data transaksi yang telah dicatat.

- **Integrasi Database**  
  Data aplikasi tersimpan pada **Supabase PostgreSQL** dan dapat diakses
  langsung dari aplikasi web.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** React + Vite
- **Programming Language:** TypeScript
- **Database:** Supabase PostgreSQL
- **Database Client:** Supabase JS
- **Deployment:** GitHub Pages
- **CI/CD:** GitHub Actions

---

## 🏗️ Arsitektur Aplikasi

```text
User
  │
  ▼
GitHub Pages
  │
  ▼
React + Vite
  │
  │ Supabase JS
  ▼
Supabase PostgreSQL
```

Aplikasi menggunakan pendekatan **static web application** sehingga tidak
memerlukan backend atau server Node.js yang berjalan secara terpisah.

---

## 📁 Struktur Repository

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── src/
│   ├── components/
│   ├── lib/
│   │   ├── services/
│   │   ├── databaseService.ts
│   │   └── supabase.ts
│   └── ...
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── supabase_schema.sql
├── supabase_rls_policies.sql
├── .env.example
└── README.md
```

---

## 🗄️ Setup Supabase

1. Buat project pada [Supabase](https://supabase.com/).

2. Buka **SQL Editor**.

3. Jalankan isi file:

```text
supabase_schema.sql
```

4. Pastikan tabel dan Row Level Security (RLS) telah dikonfigurasi sesuai
   kebutuhan aplikasi.

5. Ambil **Project URL** dan **Anon/Publishable Key** dari project Supabase.

### Konfigurasi Lokal

Buat file `.env` berdasarkan `.env.example`:

```env
VITE_SUPABASE_URL=https://project-anda.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key-anda
```

> ⚠️ Gunakan **Anon/Publishable Key** untuk aplikasi frontend.
> Jangan pernah memasukkan **Service Role Key** ke dalam kode frontend.

---

## 🚀 Deployment

Aplikasi menggunakan **GitHub Actions** untuk melakukan build dan deployment
secara otomatis ke GitHub Pages.

### Konfigurasi GitHub Pages

1. Buka repository GitHub.
2. Masuk ke **Settings → Pages**.
3. Pilih **GitHub Actions** sebagai source.

### Konfigurasi Supabase Secrets

Masuk ke:

**Settings → Secrets and variables → Actions**

Tambahkan repository secrets berikut:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Setelah perubahan di-*push* ke branch `main`, GitHub Actions akan menjalankan
proses build dan deployment secara otomatis.

```text
GitHub Repository
       │
       ▼
GitHub Actions
       │
       ▼
Vite Build
       │
       ▼
GitHub Pages
       │
       ▼
Aplikasi Web
```

---

## 🔐 Keamanan

- Frontend hanya menggunakan **Supabase Anon/Publishable Key**.
- **Service Role Key tidak pernah disertakan** dalam kode frontend.
- Akses database dikendalikan menggunakan **Row Level Security (RLS)**
  pada Supabase.
- Environment variable Supabase digunakan pada proses build melalui GitHub
  Actions.

---

## 👨‍💻 Pengembangan Lokal

Install dependencies:

```bash
npm install
```

Jalankan aplikasi dalam mode development:

```bash
npm run dev
```

Untuk membuat production build:

```bash
npm run build
```

Hasil production build akan berada pada folder:

```text
dist/
```

---

## 📄 Database Schema

Struktur database utama dapat ditemukan pada:

```text
supabase_schema.sql
```

Konfigurasi tambahan terkait Row Level Security dapat dilihat pada:

```text
supabase_rls_policies.sql
```

---

## 📌 Catatan

Aplikasi ini dikembangkan sebagai sistem pembukuan digital untuk mendukung
pengelolaan administrasi dan keuangan BUMDes, khususnya pada usaha peternakan
ayam petelur.
