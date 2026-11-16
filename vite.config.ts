import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three',
                test: /node_modules[\\/](three|@pixiv[\\/]three-vrm|three-stdlib|three-mesh-bvh)/,
                priority: 30,
              },
              {
                name: 'physics',
                test: /node_modules[\\/]@dimforge/,
                priority: 20,
              },
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|scheduler)/,
                priority: 10,
              },
              {
                name: 'vendor',
                test: /node_modules/,
                priority: 1,
              },
            ],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
