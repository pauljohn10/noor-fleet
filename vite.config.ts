import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev server middleware plugin for /api/admin-users
function devAdminApiPlugin(): Plugin {
  return {
    name: 'dev-admin-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/admin-users', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/admin-users.ts');
          await mod.default(req, res);
        } catch (err: any) {
          console.error('[Vite Dev Admin API Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Internal Dev API Error' }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devAdminApiPlugin()]
});
