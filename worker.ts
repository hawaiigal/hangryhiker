const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1'

interface Env {
  ASSETS: Fetcher
  FDC_API_KEY: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/fdc-search') {
      const query = url.searchParams.get('query') ?? ''

      if (!query.trim()) {
        return Response.json({ foods: [] })
      }

      const params = new URLSearchParams({
        query,
        api_key: env.FDC_API_KEY,
        pageSize: '20',
        dataType: 'Branded,Foundation,SR Legacy',
      })

      const upstream = await fetch(`${FDC_BASE}/foods/search?${params}`)
      const data = await upstream.json()

      return Response.json(data, { status: upstream.status })
    }

    return env.ASSETS.fetch(request)
  },
}
