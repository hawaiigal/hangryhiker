import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { gToOz, ozToG, mlToFloz, flozToMl } from '../utils/nutrition'
import type { FoodItem, PackageUnit, ServingUnit, WeightUnit } from '../types'

const PACKAGE_UNITS: { value: PackageUnit; singular: string; plural: string }[] = [
  { value: 'box',    singular: 'box',    plural: 'boxes'   },
  { value: 'bag',    singular: 'bag',    plural: 'bags'    },
  { value: 'can',    singular: 'can',    plural: 'cans'    },
  { value: 'bottle', singular: 'bottle', plural: 'bottles' },
  { value: 'jar',    singular: 'jar',    plural: 'jars'    },
  { value: 'pouch',  singular: 'pouch',  plural: 'pouches' },
  { value: 'pack',   singular: 'pack',   plural: 'packs'   },
  { value: 'each',   singular: 'each',   plural: 'each'    },
]

export { PACKAGE_UNITS }
import { FdcSearch } from './FdcSearch'
import { NutritionScanner } from './NutritionScanner'
import type { ParsedNutrition } from '../utils/parseNutritionLabel'

interface Props {
  item?: FoodItem
  onClose: () => void
  onSaved?: (item: FoodItem) => void
}

interface FormState {
  name: string
  brand: string
  servingAmount: string
  servingUnit: ServingUnit
  servingsPerContainer: string
  packageUnit: PackageUnit
  calories: string
  fat: string
  carbs: string
  fiber: string
  addedSugars: string
  protein: string
  sodium: string
}

function defaultServingUnit(weightUnit: WeightUnit): ServingUnit {
  return weightUnit === 'oz' ? 'oz' : 'g'
}

function initialState(item: FoodItem | undefined, defaultUnit: WeightUnit): FormState {
  if (!item) {
    return {
      name: '', brand: '', servingAmount: '', servingUnit: defaultServingUnit(defaultUnit),
      servingsPerContainer: '', packageUnit: 'box' as PackageUnit,
      calories: '', fat: '', carbs: '', fiber: '', addedSugars: '', protein: '', sodium: '',
    }
  }
  const unit: ServingUnit = item.servingUnit ?? defaultServingUnit(defaultUnit)
  let servingAmount: string
  switch (unit) {
    case 'oz':   servingAmount = gToOz(item.servingSizeG).toFixed(2); break
    case 'ml':   servingAmount = String(Math.round(item.servingSizeG)); break
    case 'floz': servingAmount = mlToFloz(item.servingSizeG).toFixed(1); break
    default:     servingAmount = item.servingSizeG.toFixed(1)
  }
  return {
    name: item.name,
    brand: item.brand ?? '',
    servingAmount,
    servingUnit: unit,
    servingsPerContainer: item.servingsPerContainer != null ? String(item.servingsPerContainer) : '',
    packageUnit: item.packageUnit ?? 'box',
    calories: String(item.calories),
    fat: String(item.fat),
    carbs: String(item.carbs),
    fiber: String(item.fiber),
    addedSugars: item.addedSugars != null ? String(item.addedSugars) : '',
    protein: String(item.protein),
    sodium: String(item.sodium),
  }
}

export function FoodItemForm({ item, onClose, onSaved }: Props) {
  const { weightUnit } = useSettingsStore()
  const [form, setForm] = useState<FormState>(() => initialState(item, weightUnit))
  const [error, setError] = useState('')

  function handleScan(data: ParsedNutrition) {
    setForm(prev => {
      const next = { ...prev }
      if (data.calories != null) next.calories = String(data.calories)
      if (data.fat != null) next.fat = String(data.fat)
      if (data.carbs != null) next.carbs = String(data.carbs)
      if (data.fiber != null) next.fiber = String(data.fiber)
      if (data.addedSugars != null) next.addedSugars = String(data.addedSugars)
      if (data.protein != null) next.protein = String(data.protein)
      if (data.sodium != null) next.sodium = String(data.sodium)
      if (data.servingsPerContainer != null) next.servingsPerContainer = String(data.servingsPerContainer)
      // keep existing packageUnit when scanning — user picks it manually
      if (data.servingSizeG != null) {
        next.servingAmount = weightUnit === 'oz'
          ? gToOz(data.servingSizeG).toFixed(2)
          : data.servingSizeG.toFixed(1)
        next.servingUnit = weightUnit
      }
      return next
    })
  }

  function handleFdcSelect(food: Omit<FoodItem, 'id'>) {
    const servingAmount = weightUnit === 'oz'
      ? gToOz(food.servingSizeG).toFixed(2)
      : food.servingSizeG.toFixed(1)
    setForm({
      name: food.name,
      brand: food.brand ?? '',
      servingAmount,
      servingUnit: food.servingUnit ?? defaultServingUnit(weightUnit),
      calories: String(food.calories),
      fat: String(food.fat),
      carbs: String(food.carbs),
      fiber: String(food.fiber),
      protein: String(food.protein),
      sodium: String(food.sodium),
      servingsPerContainer: food.servingsPerContainer != null ? String(food.servingsPerContainer) : '',
      packageUnit: food.packageUnit ?? 'box',
      addedSugars: food.addedSugars != null ? String(food.addedSugars) : '',
    })
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function handleUnitToggle(newUnit: ServingUnit) {
    const amount = parseFloat(form.servingAmount)
    let newAmount = form.servingAmount
    if (!isNaN(amount)) {
      const from = form.servingUnit
      if (from === 'g'    && newUnit === 'oz')   newAmount = gToOz(amount).toFixed(2)
      if (from === 'oz'   && newUnit === 'g')    newAmount = ozToG(amount).toFixed(1)
      if (from === 'ml'   && newUnit === 'floz') newAmount = mlToFloz(amount).toFixed(1)
      if (from === 'floz' && newUnit === 'ml')   newAmount = String(Math.round(flozToMl(amount)))
      // crossing weight↔volume: keep numeric value, let user adjust
    }
    setForm(prev => ({ ...prev, servingUnit: newUnit, servingAmount: newAmount }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const servingAmount = parseFloat(form.servingAmount)
    if (!form.name.trim()) return setError('Name is required.')
    if (isNaN(servingAmount) || servingAmount <= 0) return setError('Serving size must be a positive number.')

    // Normalize to canonical storage value (grams for weight, ml for volume — 1ml≈1g assumed)
    let servingSizeG: number
    switch (form.servingUnit) {
      case 'oz':   servingSizeG = ozToG(servingAmount); break
      case 'floz': servingSizeG = flozToMl(servingAmount); break
      default:     servingSizeG = servingAmount
    }

    const spc = parseFloat(form.servingsPerContainer)
    const addedSugars = parseFloat(form.addedSugars)
    const hasSpc = !isNaN(spc) && spc > 0
    const data: Omit<FoodItem, 'id'> = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      servingSizeG,
      servingUnit: form.servingUnit,
      servingsPerContainer: hasSpc ? spc : undefined,
      packageUnit: hasSpc ? form.packageUnit : undefined,
      calories: parseFloat(form.calories) || 0,
      fat: parseFloat(form.fat) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fiber: parseFloat(form.fiber) || 0,
      addedSugars: isNaN(addedSugars) ? undefined : addedSugars,
      protein: parseFloat(form.protein) || 0,
      sodium: parseFloat(form.sodium) || 0,
    }

    if (item?.id != null) {
      await db.foodItems.update(item.id, data)
      onSaved?.({ ...data, id: item.id })
    } else {
      const id = await db.foodItems.add(data)
      onSaved?.({ ...data, id: id as number })
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Food Item' : 'Add Food Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!item && (
            <>
              <FdcSearch onSelect={handleFdcSelect} />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <NutritionScanner onScan={handleScan} />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or enter manually</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={field('name')} placeholder="e.g. Instant Oatmeal" />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={field('brand')} placeholder="e.g. Quaker" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Serving size</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.servingAmount}
                  onChange={field('servingAmount')}
                  placeholder="e.g. 43"
                />
                <select
                  value={form.servingUnit}
                  onChange={e => handleUnitToggle(e.target.value as ServingUnit)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="g">g</option>
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                  <option value="floz">fl oz</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Servings per container</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.servingsPerContainer}
                  onChange={field('servingsPerContainer')}
                  placeholder="e.g. 3"
                />
                <select
                  value={form.packageUnit}
                  onChange={e => setForm(prev => ({ ...prev, packageUnit: e.target.value as PackageUnit }))}
                  disabled={!form.servingsPerContainer}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                >
                  {PACKAGE_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.singular}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Nutrition per serving</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Calories</Label>
                <Input type="number" min="0" step="any" value={form.calories} onChange={field('calories')} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Fat (g)</Label>
                <Input type="number" min="0" step="any" value={form.fat} onChange={field('fat')} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Carbs (g)</Label>
                <Input type="number" min="0" step="any" value={form.carbs} onChange={field('carbs')} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Fiber (g)</Label>
                <Input type="number" min="0" step="any" value={form.fiber} onChange={field('fiber')} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Added Sugars (g)</Label>
                <Input type="number" min="0" step="any" value={form.addedSugars} onChange={field('addedSugars')} placeholder="optional" />
              </div>
              <div className="space-y-1">
                <Label>Protein (g)</Label>
                <Input type="number" min="0" step="any" value={form.protein} onChange={field('protein')} placeholder="0" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Sodium (mg)</Label>
                <Input type="number" min="0" step="any" value={form.sodium} onChange={field('sodium')} placeholder="0" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{item ? 'Save changes' : 'Add food item'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
