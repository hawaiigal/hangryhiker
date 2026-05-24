import type { FoodItem } from '../types'

const BASE = 'https://api.nal.usda.gov/fdc/v1'

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
  label: string          // display string for the dropdown
  food: Omit<FoodItem, 'id'>
}

function nutrient(nutrients: FdcNutrient[], id: number): number {
  return nutrients.find(n => n.nutrientId === id)?.value ?? 0
}

function toGrams(size: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u === 'oz') return size * 28.3495
  if (u === 'ml' || u === 'g') return size
  return size  // assume grams for anything else
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
  const key = import.meta.env.VITE_FDC_API_KEY
  if (!key) throw new Error('VITE_FDC_API_KEY is not set')

  const params = new URLSearchParams({
    query,
    api_key: key,
    pageSize: '20',
    dataType: 'Branded,Foundation,SR Legacy',
  })

  const res = await fetch(`${BASE}/foods/search?${params}`)
  if (!res.ok) throw new Error(`FDC API error ${res.status}`)

  const data: SearchResponse = await res.json()

  return data.foods.map(f => ({
    fdcId: f.fdcId,
    label: f.brandName || f.brandOwner
      ? `${f.description} — ${f.brandName || f.brandOwner}`
      : f.description,
    food: mapFood(f),
  }))
}
