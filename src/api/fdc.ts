import type { FoodItem } from '../types'

// Nutrient IDs used by FoodData Central
const NID = {
  calories: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sodium: 1093,
} as const

interface FdcNutrient {
  nutrientId: number
  value: number
}

interface FdcFood {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients: FdcNutrient[]
}

interface SearchResponse {
  foods: FdcFood[]
}

export interface FdcResult {
  fdcId: number
  label: string
  food: Omit<FoodItem, 'id'>
}

function nutrient(nutrients: FdcNutrient[], id: number): number {
  return nutrients.find(n => n.nutrientId === id)?.value ?? 0
}

function toGrams(size: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u === 'oz') return size * 28.3495
  return size  // g, ml, or unknown — treat as grams
}

function mapFood(f: FdcFood): Omit<FoodItem, 'id'> {
  const brand = (f.brandName || f.brandOwner || '').trim() || undefined
  const servingSizeG = f.servingSize && f.servingSizeUnit
    ? toGrams(f.servingSize, f.servingSizeUnit)
    : 100

  return {
    name: f.description,
    brand,
    servingSizeG,
    calories: nutrient(f.foodNutrients, NID.calories),
    protein: nutrient(f.foodNutrients, NID.protein),
    fat: nutrient(f.foodNutrients, NID.fat),
    carbs: nutrient(f.foodNutrients, NID.carbs),
    fiber: nutrient(f.foodNutrients, NID.fiber),
    sodium: nutrient(f.foodNutrients, NID.sodium),
  }
}

export async function searchFdc(query: string): Promise<FdcResult[]> {
  const res = await fetch(`/api/fdc-search?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error(`Search failed (${res.status})`)

  const data: SearchResponse = await res.json()

  return data.foods.map(f => ({
    fdcId: f.fdcId,
    label: f.brandName || f.brandOwner
      ? `${f.description} — ${f.brandName || f.brandOwner}`
      : f.description,
    food: mapFood(f),
  }))
}
