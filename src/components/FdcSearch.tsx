import { useEffect, useRef, useState } from 'react'
import { searchFdc, type FdcResult } from '../api/fdc'
import type { FoodItem } from '../types'

interface Props {
  onSelect: (food: Omit<FoodItem, 'id'>) => void
}

export function FdcSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FdcResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await searchFdc(query.trim())
        setResults(res)
        setOpen(true)
      } catch {
        setError('Search failed. Check your API key.')
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(result: FdcResult) {
    onSelect(result.food)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">Search USDA database</label>
        {loading && <span className="text-xs text-gray-400">Searching…</span>}
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="e.g. instant oatmeal, Clif Bar…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map(r => (
            <li key={r.fdcId}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 truncate"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <p className="mt-1 text-xs text-gray-400">No results found.</p>
      )}
    </div>
  )
}
