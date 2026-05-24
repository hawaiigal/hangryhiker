export interface ParsedNutrition {
  calories?: number
  fat?: number
  carbs?: number
  fiber?: number
  addedSugars?: number
  protein?: number
  sodium?: number
  servingSizeG?: number
  servingsPerContainer?: number
}

export function parseNutritionLabel(text: string): ParsedNutrition {
  const result: ParsedNutrition = {}
  const t = text.replace(/\r\n/g, '\n')

  // Calories — match "Calories NNN" but skip "Calories from Fat"
  const calMatch = t.match(/calories\s+(?!from\b)(\d+)/i)
  if (calMatch) result.calories = parseInt(calMatch[1])

  // Total Fat
  const fatMatch = t.match(/total\s+fat\s+(\d+\.?\d*)\s*g/i)
  if (fatMatch) result.fat = parseFloat(fatMatch[1])

  // Sodium (mg)
  const sodiumMatch = t.match(/sodium\s+(\d+\.?\d*)\s*m?g/i)
  if (sodiumMatch) result.sodium = parseFloat(sodiumMatch[1])

  // Total Carbohydrate
  const carbMatch =
    t.match(/total\s+carbohydrates?\s+(\d+\.?\d*)\s*g/i) ??
    t.match(/total\s+carbs?\s+(\d+\.?\d*)\s*g/i)
  if (carbMatch) result.carbs = parseFloat(carbMatch[1])

  // Dietary Fiber
  const fiberMatch =
    t.match(/dietary\s+fiber\s+(\d+\.?\d*)\s*g/i) ??
    t.match(/\bfiber\s+(\d+\.?\d*)\s*g/i)
  if (fiberMatch) result.fiber = parseFloat(fiberMatch[1])

  // Added Sugars — "Includes Xg Added Sugars" or "Added Sugars Xg"
  const addedSugarsMatch =
    t.match(/includes\s+(\d+\.?\d*)\s*g\s+added\s+sugars/i) ??
    t.match(/added\s+sugars\s+(\d+\.?\d*)\s*g/i)
  if (addedSugarsMatch) result.addedSugars = parseFloat(addedSugarsMatch[1])

  // Protein
  const proteinMatch = t.match(/\bprotein\s+(\d+\.?\d*)\s*g/i)
  if (proteinMatch) result.protein = parseFloat(proteinMatch[1])

  // Servings per container
  const spcMatch = t.match(/(\d+\.?\d*)\s+servings?\s+per\s+container/i)
  if (spcMatch) result.servingsPerContainer = parseFloat(spcMatch[1])

  // Serving size in grams — look for parenthesized (Xg) on the serving size line first
  const servingLine = t.match(/serving\s+size[^\n]*/i)?.[0] ?? ''
  const servingGMatch =
    servingLine.match(/\(.*?(\d+\.?\d*)\s*g\)/) ??
    servingLine.match(/(\d+\.?\d*)\s*g/)
  if (servingGMatch) result.servingSizeG = parseFloat(servingGMatch[1])

  return result
}
