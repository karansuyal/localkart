import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Star, ChevronDown } from 'lucide-react'
import { SORT_OPTIONS } from '../hooks/useSmartSearch'
import { Highlight } from './SearchBar'

export default function SearchResults({ s }) {
  const navigate = useNavigate()
  const [sortOpen, setSortOpen] = useState(false)

  if (!s.showResults) return null

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold text-ink-800 text-sm">
          {s.searching ? 'Searching...' : `${s.results?.length || 0} results for "${s.trimmed}"`}
        </h2>
        {s.results?.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-medium text-ink-700 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg"
            >
              {SORT_OPTIONS.find(o => o.key === s.sort)?.label}
              <ChevronDown size={12} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-44">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { s.setSort(opt.key); setSortOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-50 ${s.sort === opt.key ? 'text-primary-700 font-bold bg-primary-50' : 'text-ink-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {s.searching ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
        </div>
      ) : !s.results?.length ? (
        <div className="text-center py-8 text-ink-400 card">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">"{s.trimmed}" ke liye koi item nahi mila</p>
          <p className="text-xs mt-1">Kuch aur try karo, ya spelling check karo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {s.results.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/shop/${p.shop.id}`)}
              className="card w-full flex items-center gap-3 text-left hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Search size={18} className="text-ink-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-800 text-sm truncate">
                    <Highlight text={p.name} query={s.trimmed} />
                  </p>
                  <span className="font-display font-bold text-ink-900 flex-shrink-0">₹{p.price}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={11} className="text-ink-300 flex-shrink-0" />
                  <span className="text-xs text-ink-500 truncate">{p.shop.name}</span>
                  {p.distance_km != null && (
                    <span className="text-xs text-ink-300 flex-shrink-0">• {p.distance_km} km</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                    <Star size={10} fill="currentColor" />{p.shop.rating?.toFixed(1)}
                  </span>
                  <span className={`text-[11px] font-medium ${p.shop.is_open ? 'text-fresh-600' : 'text-urgent-500'}`}>
                    {p.shop.is_open ? 'Open' : 'Closed'}
                  </span>
                  {p.shop.is_verified && <span className="badge-green !text-[10px] !px-1.5 !py-0.5">✓ Verified</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
