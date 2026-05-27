export type WeightUnit = 'g' | 'oz'

export type PackageUnit = 'box' | 'bag' | 'can' | 'bottle' | 'jar' | 'pouch' | 'pack' | 'each'

export type ServingUnit = 'g' | 'oz' | 'ml' | 'floz'

export interface FoodItem {
  id?: number
  name: string
  brand?: string
  servingSizeG: number     // grams for weight items; ml for volume items (1ml ≈ 1g assumed)
  servingUnit?: ServingUnit // undefined = 'g' for backward compat
  servingsPerContainer?: number
  packageUnit?: PackageUnit
  calories: number
  carbs: number
  fiber: number
  addedSugars?: number
  protein: number
  fat: number
  sodium: number        // milligrams
}

export interface RecipeIngredient {
  foodItemId: number
  quantity: number      // number of servings of that food item
}

export interface Recipe {
  id?: number
  name: string
  servings: number
  ingredients: RecipeIngredient[]
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export interface MealItem {
  foodItemId?: number
  recipeId?: number
  servings: number
}

export interface Meal {
  type: MealType
  items: MealItem[]
}

export interface TripDay {
  date: string          // ISO date string YYYY-MM-DD
  meals: Meal[]
}

export interface Trip {
  id?: number
  name: string
  days: TripDay[]
}

export interface NutritionTotals {
  weightG: number
  calories: number
  carbs: number
  fiber: number
  protein: number
  fat: number
  sodium: number
}
