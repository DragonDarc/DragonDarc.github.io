import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative paths also work for project Pages: /repository-name/.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', sourcemap: false },
});
