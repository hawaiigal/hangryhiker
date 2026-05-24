import { db } from '../db'
import type { FoodItem, MealItem, Recipe, TripDay } from '../types'

export interface TripExport {
  version: 1
  exportedAt: string
  trip: { name: string; days: TripDay[] }
  foodItems: (FoodItem & { id: number })[]
  recipes: (Recipe & { id: number })[]
}

export async function buildTripExport(tripId: number): Promise<TripExport> {
  const trip = await db.trips.get(tripId)
  if (!trip) throw new Error('Trip not found')

  const foodIds = new Set<number>()
  const recipeIds = new Set<number>()

  for (const day of trip.days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        if (item.foodItemId != null) foodIds.add(item.foodItemId)
        if (item.recipeId != null) recipeIds.add(item.recipeId)
      }
    }
  }

  const recipes = recipeIds.size > 0
    ? ((await db.recipes.bulkGet([...recipeIds])).filter(Boolean) as (Recipe & { id: number })[])
    : []

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      foodIds.add(ing.foodItemId)
    }
  }

  const foodItems = foodIds.size > 0
    ? ((await db.foodItems.bulkGet([...foodIds])).filter(Boolean) as (FoodItem & { id: number })[])
    : []

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    trip: { name: trip.name, days: trip.days },
    foodItems,
    recipes,
  }
}

export function downloadTripExport(data: TripExport, tripName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_meal_plan.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importTripExport(data: TripExport): Promise<number> {
  if (data.version !== 1) throw new Error('Unsupported export version')
  if (!data.trip || !Array.isArray(data.foodItems) || !Array.isArray(data.recipes)) {
    throw new Error('Invalid export file')
  }

  const foodIdMap = new Map<number, number>()
  for (const item of data.foodItems) {
    const { id: oldId, ...itemData } = item
    const newId = await db.foodItems.add(itemData)
    foodIdMap.set(oldId, newId as number)
  }

  const recipeIdMap = new Map<number, number>()
  for (const recipe of data.recipes) {
    const { id: oldId, ...recipeData } = recipe
    const newId = await db.recipes.add({
      ...recipeData,
      ingredients: recipeData.ingredients.map(ing => ({
        ...ing,
        foodItemId: foodIdMap.get(ing.foodItemId) ?? ing.foodItemId,
      })),
    })
    recipeIdMap.set(oldId, newId as number)
  }

  const remappedDays: TripDay[] = data.trip.days.map(day => ({
    ...day,
    meals: day.meals.map(meal => ({
      ...meal,
      items: meal.items.map((item: MealItem) => ({
        ...item,
        ...(item.foodItemId != null && { foodItemId: foodIdMap.get(item.foodItemId) ?? item.foodItemId }),
        ...(item.recipeId != null && { recipeId: recipeIdMap.get(item.recipeId) ?? item.recipeId }),
      })),
    })),
  }))

  return (await db.trips.add({ name: data.trip.name, days: remappedDays })) as number
}
