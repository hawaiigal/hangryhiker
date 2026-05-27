import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'fdc-proxy',
        configureServer(server) {
          server.middlewares.use(
            '/api/fdc-search',
            async (req: IncomingMessage, res: ServerResponse) => {
              const reqUrl = new URL(req.url ?? '', 'http://localhost')
              const query = reqUrl.searchParams.get('query') ?? ''

              const params = new URLSearchParams({
                query,
                api_key: env.FDC_API_KEY ?? '',
                pageSize: '20',
                dataType: 'Branded,Foundation,SR Legacy',
              })

              const upstream = await fetch(`${FDC_BASE}/foods/search?${params}`)
              const text = await upstream.text()

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = upstream.status
              res.end(text)
            },
          )
        },
      },
    ],
  }
})
