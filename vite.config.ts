import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import dynamicImport from 'vite-plugin-dynamic-import';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  base: '/', 
  plugins: [react(), dynamicImport(), commonjs()],
  assetsInclude: ['**/*.png'],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/axis-cgi': {
        target: 'http://192.168.4.152',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://greenitkr.towncast.kr',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      ignored: ['**/public/tiles/**']
    },

    hmr: true,
    fs: {
      strict: false
    },

  },
  build: {
    outDir: 'build'
  },
  optimizeDeps: {
    include: ['fabric'],
  },
})
