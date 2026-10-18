import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// If running through a symlink/junction (e.g. ORCA_Agent -> ORCA agent), align cwd with realpath
// to prevent Vite's dependency optimizer from mismatching internal relative paths
try {
  process.chdir(fs.realpathSync(process.cwd()));
} catch (e) {
  // ignore
}

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
