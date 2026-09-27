import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Nama repository GitHub (dipakai sebagai base path untuk GitHub Pages).
// URL akhir: https://aliefdwiano-debug.github.io/Apk-Pembukuan-BUMDes-untuk-Usaha-Peternakan-Ayam-Petelur/
const REPO_NAME = 'Apk-Pembukuan-BUMDes-untuk-Usaha-Peternakan-Ayam-Petelur';

export default defineConfig(({ command }) => {
  return {
    // Saat build (GitHub Actions -> GitHub Pages) gunakan base path repo.
    // Saat dev server lokal, tetap gunakan '/' agar path aset normal.
    base: command === 'build' ? `/${REPO_NAME}/` : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
