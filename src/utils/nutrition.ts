import type { FoodItem, MealItem, NutritionTotals, Recipe, RecipeIngredient, Trip } from '../types'

export function emptyTotals(): NutritionTotals {
  return { weightG: 0, calories: 0, carbs: 0, fiber: 0, protein: 0, fat: 0, sodium: 0 }
}

export function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    weightG: a.weightG + b.weightG,
    calories: a.calories + b.calories,
    carbs: a.carbs + b.carbs,
    fiber: a.fiber + b.fiber,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    sodium: a.sodium + b.sodium,
  }
}

export function scaleTotals(t: NutritionTotals, factor: number): NutritionTotals {
  return {
    weightG: t.weightG * factor,
    calories: t.calories * factor,
    carbs: t.carbs * factor,
    fiber: t.fiber * factor,
    protein: t.protein * factor,
    fat: t.fat * factor,
    sodium: t.sodium * factor,
  }
}

export function computeIngredientTotals(
  ingredients: RecipeIngredient[],
  foodMap: Map<number, FoodItem>,
): NutritionTotals {
  return ingredients.reduce((acc, { foodItemId, quantity }) => {
    const food = foodMap.get(foodItemId)
    if (!food) return acc
    return addTotals(acc, scaleTotals({
      weightG: food.servingSizeG, calories: food.calories, carbs: food.carbs,
      fiber: food.fiber, protein: food.protein, fat: food.fat, sodium: food.sodium,
    }, quantity))
  }, emptyTotals())
}

export function computeMealTotals(
  items: MealItem[],
  foodMap: Map<number, FoodItem>,
  recipeMap: Map<number, Recipe>,
): NutritionTotals {
  return items.reduce((acc, item) => {
    if (item.foodItemId != null) {
      const food = foodMap.get(item.foodItemId)
      if (!food) return acc
      return addTotals(acc, scaleTotals({
        weightG: food.servingSizeG, calories: food.calories, carbs: food.carbs,
        fiber: food.fiber, protein: food.protein, fat: food.fat, sodium: food.sodium,
      }, item.servings))
    }
    if (item.recipeId != null) {
      const recipe = recipeMap.get(item.recipeId)
      if (!recipe) return acc
      return addTotals(acc, scaleTotals(computeIngredientTotals(recipe.ingredients, foodMap), item.servings / (recipe.servings || 1)))
    }
    return acc
  }, emptyTotals())
}

// Returns total servings consumed per food item across an entire trip.
// Includes food items used directly in meals and as recipe ingredients.
export function computeTripShoppingList(
  trip: Trip,
  foodMap: Map<number, FoodItem>,
  recipeMap: Map<number, Recipe>,
): Map<number, number> {
  const totals = new Map<number, number>()
  for (const day of trip.days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        if (item.foodItemId != null) {
          totals.set(item.foodItemId, (totals.get(item.foodItemId) ?? 0) + item.servings)
        } else if (item.recipeId != null) {
          const recipe = recipeMap.get(item.recipeId)
          if (recipe) {
            for (const ing of recipe.ingredients) {
              if (foodMap.has(ing.foodItemId)) {
                totals.set(ing.foodItemId, (totals.get(ing.foodItemId) ?? 0) + ing.quantity * (item.servings / (recipe.servings || 1)))
              }
            }
          }
        }
      }
    }
  }
  return totals
}

export function computeTripTotals(
  trip: Trip,
  foodMap: Map<number, FoodItem>,
  recipeMap: Map<number, Recipe>,
): NutritionTotals {
  return trip.days.reduce((acc, day) =>
    day.meals.reduce((dayAcc, meal) =>
      addTotals(dayAcc, computeMealTotals(meal.items, foodMap, recipeMap)), acc),
    emptyTotals(),
  )
}

// ── Unit conversion ────────────────────────────────────────────────────────

const G_PER_OZ = 28.3495

export function gToOz(grams: number): number {
  return grams / G_PER_OZ
}

export function ozToG(oz: number): number {
  return oz * G_PER_OZ
}

export function formatWeight(grams: number, unit: 'g' | 'oz'): string {
  if (unit === 'oz') return `${gToOz(grams).toFixed(2)} oz`
  return `${grams.toFixed(1)} g`
}

export function calPerG(calories: number, servingSizeG: number): number {
  if (servingSizeG === 0) return 0
  return calories / servingSizeG
}

export function calPerOz(calories: number, servingSizeG: number): number {
  return calPerG(calories, servingSizeG) * G_PER_OZ
}

// Returns cal/oz or cal/100g — both produce readable numbers
export function calDensity(calories: number, servingSizeG: number, unit: 'g' | 'oz'): number {
  if (unit === 'oz') return calPerOz(calories, servingSizeG)
  return calPerG(calories, servingSizeG) * 100
}

export function densityLabel(unit: 'g' | 'oz'): string {
  return unit === 'oz' ? 'Cal/oz' : 'Cal/100g'
}
