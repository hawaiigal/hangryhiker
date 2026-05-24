import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { db } from '../db'
import { createEmptyDays } from '../utils/trip'

export function TripNew() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [days, setDays] = useState('5')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numDays = parseInt(days, 10)
    if (!name.trim()) return setError('Trip name is required.')
    if (isNaN(numDays) || numDays < 1 || numDays > 30) return setError('Days must be between 1 and 30.')
    setError('')

    const id = await db.trips.add({
      name: name.trim(),
      days: createEmptyDays(numDays),
    })
    navigate(`/trips/${id}`)
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600'

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/trips" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Trips
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">New trip</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip name *</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="e.g. JMT Section, Desolation Wilderness"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of days</label>
          <input
            className={inputCls}
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={e => { setDays(e.target.value); setError('') }}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link
            to="/trips"
            className="flex-1 text-center border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700"
          >
            Create trip
          </button>
        </div>
      </form>
    </div>
  )
}
