export type WeightUnit = 'g' | 'oz'

export interface FoodItem {
  id?: number
  name: string
  brand?: string
  servingSizeG: number  // always stored in grams
  calories: number
  carbs: number
  fiber: number
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
