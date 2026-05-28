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

  // Servings per container — number can appear before ("3 servings per container")
  // or after ("Servings Per Container 3"), with optional "About" prefix
  const spcMatch =
    t.match(/about\s+(\d+\.?\d*)\s+servings?\s+per\s+container/i) ??
    t.match(/(\d+\.?\d*)\s+servings?\s+per\s+container/i) ??
    t.match(/servings?\s+per\s+container[:\s]+(?:about\s+)?(\d+\.?\d*)/i)
  if (spcMatch) result.servingsPerContainer = parseFloat(spcMatch[1])

  // Serving size — flatten up to 100 chars after "Serving Size" so OCR line-breaks
  // don't split the label from its value. Prefer parenthesized grams (e.g. "(43g)"),
  // then bare grams, then fall back to oz→g conversion.
  const servingSizeIdx = t.search(/serving\s+size/i)
  const servingRegion = servingSizeIdx >= 0
    ? t.slice(servingSizeIdx, servingSizeIdx + 100).replace(/\n/g, ' ')
    : ''
  const servingGMatch =
    servingRegion.match(/\(.*?(\d+\.?\d*)\s*g\s*\)/) ??
    servingRegion.match(/(\d+\.?\d*)\s*g(?!\w)/)
  if (servingGMatch) {
    result.servingSizeG = parseFloat(servingGMatch[1])
  } else {
    const ozMatch = servingRegion.match(/(\d+\.?\d*)\s*oz(?!\w)/i)
    if (ozMatch) result.servingSizeG = Math.round(parseFloat(ozMatch[1]) * 28.35)
  }

  return result
}
