import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';

export default defineConfig({
  base: '/',
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  server: {
    host: true,
    port: 3000,
    origin: 'http://askqa.konasl.net',

    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const allowedHosts = ['localhost', '10.88.231.44', 'askqa.konasl.net'];
        const hostHeader = req.headers.host?.split(':')[0];

        if (!hostHeader || !allowedHosts.includes(hostHeader)) {
          res.statusCode = 403;
          res.end(`Host "${hostHeader}" not allowed`);
        } else {
          next();
        }
      });
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'load-js-files-as-jsx',
          setup(build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: 'jsx',
              contents: await fs.readFile(args.path, 'utf8'),
            }));
          },
        },
      ],
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-macros'],
      },
    }),
  ],
});
