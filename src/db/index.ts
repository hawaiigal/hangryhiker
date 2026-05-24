import Dexie, { type EntityTable } from 'dexie'
import type { FoodItem, Recipe, Trip } from '../types'

const db = new Dexie('BackpackingMealPlanner') as Dexie & {
  foodItems: EntityTable<FoodItem, 'id'>
  recipes: EntityTable<Recipe, 'id'>
  trips: EntityTable<Trip, 'id'>
}

db.version(1).stores({
  foodItems: '++id, name, brand',
  recipes: '++id, name',
  trips: '++id, name',
})

export { db }
