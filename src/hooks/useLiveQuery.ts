import { useState, useEffect } from 'react'
import { liveQuery } from 'dexie'

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: unknown[] = [],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: setValue,
      error: (err) => console.error('Live query error:', err),
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}
