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

db.version(2).stores({
  foodItems: '++id, name, brand',
  recipes: '++id, name',
  trips: '++id, name',
}).upgrade(tx =>
  tx.table('recipes').toCollection().modify(recipe => {
    if (recipe.servings == null) recipe.servings = 1
  })
)

db.version(3).stores({
  foodItems: '++id, name, brand',
  recipes: '++id, name',
  trips: '++id, name',
}).upgrade(tx =>
  tx.table('foodItems').toCollection().modify(item => {
    if (item.servingsPerContainer != null && item.packageUnit == null) {
      item.packageUnit = 'box'
    }
  })
)

export { db }
