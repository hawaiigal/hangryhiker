interface Env {
  FDC_API_KEY: string
}

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const query = url.searchParams.get('query') ?? ''

  if (!query.trim()) {
    return Response.json({ foods: [] })
  }

  const params = new URLSearchParams({
    query,
    api_key: ctx.env.FDC_API_KEY,
    pageSize: '20',
    dataType: 'Branded,Foundation,SR Legacy',
  })

  const upstream = await fetch(`${FDC_BASE}/foods/search?${params}`)
  const data = await upstream.json()

  return Response.json(data, { status: upstream.status })
}
