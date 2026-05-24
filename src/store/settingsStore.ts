import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeightUnit } from '../types'

interface SettingsState {
  weightUnit: WeightUnit
  setWeightUnit: (unit: WeightUnit) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      weightUnit: 'oz',
      setWeightUnit: (unit) => set({ weightUnit: unit }),
    }),
    { name: 'bmp-settings' }
  )
)
