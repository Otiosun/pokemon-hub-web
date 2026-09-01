import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        comments: false,
        minify: {
          compress: {
            maxIterations: 10,
          },
          mangle: true,
        },
      },
    },
  },
  server: {
    port: 4174,
  },
  preview: {
    port: 4174,
  },
});
