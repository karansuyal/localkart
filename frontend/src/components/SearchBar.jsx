import { useRef, useEffect } from 'react'
import { Search, Mic, X, Clock, TrendingUp } from 'lucide-react'

// Bold the matched substring inside a suggestion/result title.
export function Highlight({ text, query }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary-700 font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchBar({ s }) {
  const containerRef = useRef(null)

  // Close dropdown on outside click/tap
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        s.closeDropdowns()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [s])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
        <input
          value={s.query}
          onChange={e => s.setQuery(e.target.value)}
          onFocus={() => s.setFocused(true)}
          onKeyDown={s.handleKeyDown}
          placeholder="Maggi, chips, cold drink khojo... 🎙️ bolke bhi try karo"
          className="w-full pl-9 pr-20 py-2.5 rounded-xl text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {s.query && (
            <button onClick={s.clearSearch} className="p-1.5 text-ink-400 hover:text-ink-700" aria-label="Clear search">
              <X size={15} />
            </button>
          )}
          {s.voice.isSupported && (
            <button
              onClick={() => (s.voice.isListening ? s.voice.stop() : s.voice.start())}
              className={`p-1.5 rounded-lg transition-colors ${s.voice.isListening ? 'bg-urgent-500 text-white animate-pulse' : 'bg-primary-100 text-ink-800 hover:bg-primary-200'}`}
              aria-label="Voice search"
              title="Bol ke search karo"
            >
              <Mic size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {s.showAutocomplete && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {s.suggestions.map((item, i) => (
            <button
              key={`${item.type}-${item.text}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => s.selectTerm(item.text)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-primary-50 text-left border-b border-gray-50 last:border-0"
            >
              <Search size={14} className="text-ink-300 flex-shrink-0" />
              <span className="text-sm text-ink-800 flex-1 truncate">
                <Highlight text={item.text} query={s.trimmed} />
              </span>
              {item.type === 'category' && <span className="text-[10px] text-ink-400 bg-ink-50 px-1.5 py-0.5 rounded-full flex-shrink-0">category</span>}
            </button>
          ))}
        </div>
      )}

      {/* Recent + Trending panel (empty search state) */}
      {s.showEmptyPanel && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-gray-100 p-3">
          {s.recent.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mb-1.5 px-1">Recent Searches</p>
              <div className="flex flex-wrap gap-1.5">
                {s.recent.map((term, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => s.selectTerm(term)}
                    className="flex items-center gap-1 text-xs bg-ink-50 hover:bg-ink-100 text-ink-700 px-2.5 py-1.5 rounded-full"
                  >
                    <Clock size={11} className="text-ink-300" />{term}
                  </button>
                ))}
              </div>
            </div>
          )}
          {s.trending?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mb-1.5 px-1">Trending Now</p>
              <div className="flex flex-wrap gap-1.5">
                {s.trending.map((term, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => s.selectTerm(term)}
                    className="flex items-center gap-1 text-xs bg-primary-50 hover:bg-primary-100 text-ink-800 px-2.5 py-1.5 rounded-full font-medium"
                  >
                    <TrendingUp size={11} className="text-primary-600" />{term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
