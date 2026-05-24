import type { MealType, TripDay } from '../types'

export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

export function createEmptyDays(count: number): TripDay[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `Day ${i + 1}`,
    meals: MEAL_TYPES.map(type => ({ type, items: [] })),
  }))
}
