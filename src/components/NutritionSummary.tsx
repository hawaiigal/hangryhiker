import { calDensity, densityLabel, formatWeight } from '../utils/nutrition'
import type { NutritionTotals, WeightUnit } from '../types'

interface Props {
  totals: NutritionTotals
  weightUnit: WeightUnit
  /** Show only weight, calories, and density — for compact list rows */
  compact?: boolean
}

export function NutritionSummary({ totals, weightUnit, compact = false }: Props) {
  const density = totals.weightG > 0
    ? calDensity(totals.calories, totals.weightG, weightUnit)
    : 0

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <Stat label="Weight" value={formatWeight(totals.weightG, weightUnit)} />
      <Stat label="Cal" value={String(Math.round(totals.calories))} />
      <Stat label={densityLabel(weightUnit)} value={density.toFixed(1)} highlight />
      {!compact && (
        <>
          <Stat label="Carbs" value={`${totals.carbs.toFixed(1)}g`} />
          <Stat label="Fiber" value={`${totals.fiber.toFixed(1)}g`} />
          <Stat label="Protein" value={`${totals.protein.toFixed(1)}g`} />
          <Stat label="Fat" value={`${totals.fat.toFixed(1)}g`} />
          <Stat label="Sodium" value={`${Math.round(totals.sodium)}mg`} />
        </>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className="text-gray-500">
      {label}{' '}
      <span className={highlight ? 'font-semibold text-brand-700' : 'font-medium text-gray-800'}>
        {value}
      </span>
    </span>
  )
}
