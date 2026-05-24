import { useState } from 'react'
import { db } from '../db'
import { useSettingsStore } from '../store/settingsStore'
import { gToOz, ozToG } from '../utils/nutrition'
import type { FoodItem, WeightUnit } from '../types'
import { FdcSearch } from './FdcSearch'
import { NutritionScanner } from './NutritionScanner'
import type { ParsedNutrition } from '../utils/parseNutritionLabel'

interface Props {
  item?: FoodItem
  onClose: () => void
}

interface FormState {
  name: string
  brand: string
  servingAmount: string
  servingUnit: WeightUnit
  servingsPerContainer: string
  calories: string
  fat: string
  carbs: string
  fiber: string
  addedSugars: string
  protein: string
  sodium: string
}

function initialState(item: FoodItem | undefined, defaultUnit: WeightUnit): FormState {
  if (!item) {
    return {
      name: '', brand: '', servingAmount: '', servingUnit: defaultUnit,
      servingsPerContainer: '',
      calories: '', fat: '', carbs: '', fiber: '', addedSugars: '', protein: '', sodium: '',
    }
  }
  const servingAmount = defaultUnit === 'oz'
    ? gToOz(item.servingSizeG).toFixed(2)
    : item.servingSizeG.toFixed(1)
  return {
    name: item.name,
    brand: item.brand ?? '',
    servingAmount,
    servingUnit: defaultUnit,
    servingsPerContainer: item.servingsPerContainer != null ? String(item.servingsPerContainer) : '',
    calories: String(item.calories),
    fat: String(item.fat),
    carbs: String(item.carbs),
    fiber: String(item.fiber),
    addedSugars: item.addedSugars != null ? String(item.addedSugars) : '',
    protein: String(item.protein),
    sodium: String(item.sodium),
  }
}

export function FoodItemForm({ item, onClose }: Props) {
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
      servingUnit: weightUnit,
      calories: String(food.calories),
      fat: String(food.fat),
      carbs: String(food.carbs),
      fiber: String(food.fiber),
      protein: String(food.protein),
      sodium: String(food.sodium),
      servingsPerContainer: food.servingsPerContainer != null ? String(food.servingsPerContainer) : '',
      addedSugars: food.addedSugars != null ? String(food.addedSugars) : '',
    })
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function handleUnitToggle() {
    const newUnit: WeightUnit = form.servingUnit === 'oz' ? 'g' : 'oz'
    const amount = parseFloat(form.servingAmount)
    const newAmount = isNaN(amount)
      ? ''
      : newUnit === 'oz'
        ? gToOz(amount).toFixed(2)
        : ozToG(amount).toFixed(1)
    setForm(prev => ({ ...prev, servingUnit: newUnit, servingAmount: newAmount }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const servingAmount = parseFloat(form.servingAmount)
    if (!form.name.trim()) return setError('Name is required.')
    if (isNaN(servingAmount) || servingAmount <= 0) return setError('Serving size must be a positive number.')

    const servingSizeG = form.servingUnit === 'oz' ? ozToG(servingAmount) : servingAmount

    const spc = parseFloat(form.servingsPerContainer)
    const addedSugars = parseFloat(form.addedSugars)
    const data: Omit<FoodItem, 'id'> = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      servingSizeG,
      servingsPerContainer: isNaN(spc) || spc <= 0 ? undefined : spc,
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
    } else {
      await db.foodItems.add(data)
    }
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            {item ? 'Edit Food Item' : 'Add Food Item'}
          </h2>

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
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={field('name')} placeholder="e.g. Instant Oatmeal" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Brand</label>
                <input className={inputCls} value={form.brand} onChange={field('brand')} placeholder="e.g. Quaker" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Serving size</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="any"
                    value={form.servingAmount}
                    onChange={field('servingAmount')}
                    placeholder="e.g. 43"
                  />
                  <button
                    type="button"
                    onClick={handleUnitToggle}
                    className="shrink-0 w-14 border border-gray-300 rounded-lg text-sm font-mono font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {form.servingUnit}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Servings per container</label>
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  step="1"
                  value={form.servingsPerContainer}
                  onChange={field('servingsPerContainer')}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Nutrition per serving</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Calories</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.calories} onChange={field('calories')} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Fat (g)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.fat} onChange={field('fat')} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Carbs (g)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.carbs} onChange={field('carbs')} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Fiber (g)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.fiber} onChange={field('fiber')} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Added Sugars (g)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.addedSugars} onChange={field('addedSugars')} placeholder="optional" />
                </div>
                <div>
                  <label className={labelCls}>Protein (g)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.protein} onChange={field('protein')} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Sodium (mg)</label>
                  <input className={inputCls} type="number" min="0" step="any" value={form.sodium} onChange={field('sodium')} placeholder="0" />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700"
              >
                {item ? 'Save changes' : 'Add food item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
