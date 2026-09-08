import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相对路径：兼容 GitHub Pages 子路径托管（https://<用户名>.github.io/together/）
  base: './',
  plugins: [react()],
});
