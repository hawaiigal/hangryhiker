import { db } from '../db'
import type { FoodItem, MealItem, Recipe, Trip, TripDay } from '../types'

// ---- Schema versions ----
// v1: single-trip export (legacy, read-only)
// v2: flexible export — any combination of trips, food items, recipes

export interface TripExport {
  schemaVersion: 1
  exportedAt: string
  trip: { name: string; days: TripDay[] }
  foodItems: (FoodItem & { id: number })[]
  recipes: (Recipe & { id: number })[]
}

export interface AppExport {
  schemaVersion: 2
  exportedAt: string
  trips: { name: string; days: TripDay[] }[]
  foodItems: (FoodItem & { id: number })[]
  recipes: (Recipe & { id: number })[]
}

export type AnyExport = TripExport | AppExport

export type DedupStrategy = 'skip' | 'overwrite' | 'keep'

export interface ImportPreview {
  tripCount: number
  tripNames: string[]
  newFoodCount: number
  newRecipeCount: number
  conflictingFoodItems: (FoodItem & { id: number })[]
  conflictingRecipes: (Recipe & { id: number })[]
}

// ---- Internal helpers ----

function foodKey(item: FoodItem): string {
  return `${item.name.trim().toLowerCase()}||${(item.brand ?? '').trim().toLowerCase()}`
}

function recipeKey(recipe: Recipe): string {
  return recipe.name.trim().toLowerCase()
}

function normalizeToV2(data: AnyExport): AppExport {
  if (data.schemaVersion === 1) {
    return {
      schemaVersion: 2,
      exportedAt: data.exportedAt,
      trips: [data.trip],
      foodItems: data.foodItems,
      recipes: data.recipes,
    }
  }
  return data
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Export builders ----

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
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    trip: { name: trip.name, days: trip.days },
    foodItems,
    recipes,
  }
}

export async function buildLibraryExport(): Promise<AppExport> {
  const foodItems = (await db.foodItems.toArray()) as (FoodItem & { id: number })[]
  const recipes = (await db.recipes.toArray()) as (Recipe & { id: number })[]
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    trips: [],
    foodItems,
    recipes,
  }
}

export async function buildFullBackupExport(): Promise<AppExport> {
  const foodItems = (await db.foodItems.toArray()) as (FoodItem & { id: number })[]
  const recipes = (await db.recipes.toArray()) as (Recipe & { id: number })[]
  const allTrips = (await db.trips.toArray()) as (Trip & { id: number })[]
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    trips: allTrips.map(({ name, days }) => ({ name, days })),
    foodItems,
    recipes,
  }
}

// ---- Download helpers ----

export function downloadTripExport(data: TripExport, tripName: string) {
  const filename = `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_meal_plan.json`
  downloadJson(data, filename)
}

export function downloadAppExport(data: AppExport, label: string) {
  downloadJson(data, `hangry_hiker_${label}_${dateStamp()}.json`)
}

// ---- Validation ----

export function validateExport(data: unknown): AnyExport {
  if (!data || typeof data !== 'object') throw new Error('Invalid file')
  const d = data as Record<string, unknown>

  // Support legacy exports that used `version` instead of `schemaVersion`
  const sv = d.schemaVersion ?? d.version

  if (sv === 1) {
    if (!d.trip || !Array.isArray(d.foodItems) || !Array.isArray(d.recipes)) {
      throw new Error('Invalid schema v1 export: missing required fields')
    }
    return { ...d, schemaVersion: 1 } as unknown as TripExport
  }
  if (sv === 2) {
    if (!Array.isArray(d.trips) || !Array.isArray(d.foodItems) || !Array.isArray(d.recipes)) {
      throw new Error('Invalid schema v2 export: missing required fields')
    }
    return d as unknown as AppExport
  }
  throw new Error(`Unsupported schema version: ${sv ?? 'unknown'}`)
}

// ---- Import ----

export async function previewImport(data: AnyExport): Promise<ImportPreview> {
  const normalized = normalizeToV2(data)

  const existingFood = await db.foodItems.toArray()
  const existingRecipes = await db.recipes.toArray()

  const existingFoodKeys = new Set(existingFood.map(foodKey))
  const existingRecipeKeys = new Set(existingRecipes.map(recipeKey))

  const conflictingFoodItems = normalized.foodItems.filter(f => existingFoodKeys.has(foodKey(f)))
  const conflictingRecipes = normalized.recipes.filter(r => existingRecipeKeys.has(recipeKey(r)))

  return {
    tripCount: normalized.trips.length,
    tripNames: normalized.trips.map(t => t.name),
    newFoodCount: normalized.foodItems.length - conflictingFoodItems.length,
    newRecipeCount: normalized.recipes.length - conflictingRecipes.length,
    conflictingFoodItems,
    conflictingRecipes,
  }
}

export async function executeImport(data: AnyExport, strategy: DedupStrategy): Promise<number[]> {
  const normalized = normalizeToV2(data)

  const existingFood = (await db.foodItems.toArray()) as (FoodItem & { id: number })[]
  const existingRecipes = (await db.recipes.toArray()) as (Recipe & { id: number })[]

  const existingFoodByKey = new Map<string, (FoodItem & { id: number })[]>()
  for (const f of existingFood) {
    const key = foodKey(f)
    const arr = existingFoodByKey.get(key) ?? []
    arr.push(f)
    existingFoodByKey.set(key, arr)
  }

  const existingRecipesByKey = new Map<string, (Recipe & { id: number })[]>()
  for (const r of existingRecipes) {
    const key = recipeKey(r)
    const arr = existingRecipesByKey.get(key) ?? []
    arr.push(r)
    existingRecipesByKey.set(key, arr)
  }

  const foodIdMap = new Map<number, number>()
  for (const item of normalized.foodItems) {
    const { id: oldId, ...itemData } = item
    const matches = existingFoodByKey.get(foodKey(item))
    if (matches) {
      if (strategy === 'overwrite') {
        await Promise.all(matches.map(m => db.foodItems.update(m.id, itemData)))
      }
      if (strategy !== 'keep') {
        foodIdMap.set(oldId, matches[0].id)
        continue
      }
    }
    const newId = (await db.foodItems.add(itemData)) as number
    foodIdMap.set(oldId, newId)
  }

  const recipeIdMap = new Map<number, number>()
  for (const recipe of normalized.recipes) {
    const { id: oldId, ...recipeData } = recipe
    const remapped = {
      ...recipeData,
      ingredients: recipeData.ingredients.map(ing => ({
        ...ing,
        foodItemId: foodIdMap.get(ing.foodItemId) ?? ing.foodItemId,
      })),
    }
    const matches = existingRecipesByKey.get(recipeKey(recipe))
    if (matches) {
      if (strategy === 'overwrite') {
        await Promise.all(matches.map(m => db.recipes.update(m.id, remapped)))
      }
      if (strategy !== 'keep') {
        recipeIdMap.set(oldId, matches[0].id)
        continue
      }
    }
    const newId = (await db.recipes.add(remapped)) as number
    recipeIdMap.set(oldId, newId)
  }

  const newTripIds: number[] = []
  for (const trip of normalized.trips) {
    const remappedDays: TripDay[] = trip.days.map(day => ({
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
    const newId = (await db.trips.add({ name: trip.name, days: remappedDays })) as number
    newTripIds.push(newId)
  }

  return newTripIds
}
