import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { db } from '../db'
import { createEmptyDays } from '../utils/trip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/trips" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Trips
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">New trip</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>Trip name *</Label>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="e.g. JMT Section, Desolation Wilderness"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label>Number of days</Label>
          <Input
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={e => { setDays(e.target.value); setError('') }}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/trips">Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1">Create trip</Button>
        </div>
      </form>
    </div>
  )
}
