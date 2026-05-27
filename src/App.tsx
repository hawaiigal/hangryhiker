import { Routes, Route, NavLink, Link } from 'react-router'
import { useSettingsStore } from './store/settingsStore'
import { Button } from '@/components/ui/button'
import { Dashboard } from './pages/Dashboard'
import { FoodLibrary } from './pages/FoodLibrary'
import { RecipeList } from './pages/RecipeList'
import { RecipeEditor } from './pages/RecipeEditor'
import { TripList } from './pages/TripList'
import { TripNew } from './pages/TripNew'
import { TripEditor } from './pages/TripEditor'
import { About } from './pages/About'

function App() {
  const { weightUnit, setWeightUnit } = useSettingsStore()

  const navLink = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'text-brand-600 font-medium' : 'text-gray-600 hover:text-gray-900'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between print:hidden">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="font-semibold text-gray-900">Hangry Hiker</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <NavLink to="/food" className={navLink}>Food Library</NavLink>
          <NavLink to="/recipes" className={navLink}>Recipes</NavLink>
          <NavLink to="/trips" className={navLink}>Trips</NavLink>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setWeightUnit(weightUnit === 'oz' ? 'g' : 'oz')}
            className="font-mono"
          >
            {weightUnit}
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/food" element={<FoodLibrary />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/new" element={<RecipeEditor />} />
          <Route path="/recipes/:id" element={<RecipeEditor />} />
          <Route path="/trips" element={<TripList />} />
          <Route path="/trips/new" element={<TripNew />} />
          <Route path="/trips/:id" element={<TripEditor />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="print:hidden border-t border-gray-200 mt-8 py-4 px-4 text-center text-xs text-gray-400">
        <Link to="/about" className="hover:text-gray-600">About</Link>
      </footer>
    </div>
  )
}

export default App
