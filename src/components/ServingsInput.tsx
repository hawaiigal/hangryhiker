import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
  size?: 'sm' | 'md'
  className?: string
}

export function ServingsInput({ value, onChange, min = 0.5, step = 0.5, size = 'md', className }: Props) {
  function adjust(delta: number) {
    onChange(Math.max(min, Math.round((value + delta) * 2) / 2))
  }

  function handleInput(raw: string) {
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= min) onChange(v)
  }

  const btnSize = size === 'sm' ? 'icon-xs' : 'icon-sm'
  const inputCls = size === 'sm'
    ? 'w-12 text-xs py-0.5'
    : 'w-14 text-sm py-1'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button type="button" variant="outline" size={btnSize} onClick={() => adjust(-step)}>−</Button>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => handleInput(e.target.value)}
        className={cn(
          'text-center border border-input rounded px-1 focus:outline-none focus:ring-2 focus:ring-ring',
          inputCls,
        )}
      />
      <Button type="button" variant="outline" size={btnSize} onClick={() => adjust(step)}>+</Button>
    </div>
  )
}
