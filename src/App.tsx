import { Routes, Route, NavLink } from 'react-router'
import { useSettingsStore } from './store/settingsStore'
import { FoodLibrary } from './pages/FoodLibrary'
import { RecipeList } from './pages/RecipeList'
import { RecipeEditor } from './pages/RecipeEditor'
import { TripList } from './pages/TripList'
import { TripNew } from './pages/TripNew'
import { TripEditor } from './pages/TripEditor'

function App() {
  const { weightUnit, setWeightUnit } = useSettingsStore()

  const navLink = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between print:hidden">
        <span className="font-semibold text-gray-900">Hangry Hiker</span>
        <div className="flex items-center gap-4 text-sm">
          <NavLink to="/" end className={navLink}>Food Library</NavLink>
          <NavLink to="/recipes" className={navLink}>Recipes</NavLink>
          <NavLink to="/trips" className={navLink}>Trips</NavLink>
          <button
            onClick={() => setWeightUnit(weightUnit === 'oz' ? 'g' : 'oz')}
            className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono text-gray-700"
          >
            {weightUnit}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<FoodLibrary />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/new" element={<RecipeEditor />} />
          <Route path="/recipes/:id" element={<RecipeEditor />} />
          <Route path="/trips" element={<TripList />} />
          <Route path="/trips/new" element={<TripNew />} />
          <Route path="/trips/:id" element={<TripEditor />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
