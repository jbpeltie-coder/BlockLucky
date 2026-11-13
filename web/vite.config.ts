import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

// Site BlockLucky : TanStack Start (rendu serveur) + React + Tailwind.
// Nitro produit la version hébergée (préréglage Cloudflare Workers, modifiable via NITRO_PRESET).
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({
      server: { entry: 'server' },
      importProtection: { behavior: 'error', client: { files: ['**/server/**'], specifiers: ['server-only'] } },
    }),
    ...(command === 'build' ? [nitro({ preset: process.env['NITRO_PRESET'] || 'cloudflare-module' })] : []),
    viteReact(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@tanstack/react-query', '@tanstack/query-core'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
}));
