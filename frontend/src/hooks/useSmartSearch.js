import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productAPI } from '../services/api'
import { useDebounce } from './useDebounce'
import { useVoiceSearch } from './useVoiceSearch'
import toast from 'react-hot-toast'

const RECENT_KEY = 'localkart_recent_searches'
const MAX_RECENT = 8

function readRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
function writeRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))) } catch { /* storage disabled -- ignore */ }
}

export const SORT_OPTIONS = [
  { key: 'relevance', label: 'Best Match' },
  { key: 'distance', label: 'Nearest' },
  { key: 'price_low', label: 'Price: Low→High' },
  { key: 'price_high', label: 'Price: High→Low' },
  { key: 'rating', label: 'Top Rated' },
]

/**
 * Single source of truth for the Zomato-style smart search: text input,
 * voice input, autocomplete, recent/trending, sorting, and the actual
 * product+shop results. Consumed by <SearchBar/> (lives in the header)
 * and <SearchResults/> (lives in the page body) so the dropdown doesn't
 * get trapped inside the dark header's stacking context.
 */
export function useSmartSearch(userLocation) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [sort, setSort] = useState('relevance')
  const [recent, setRecent] = useState(readRecent)

  const debouncedQuery = useDebounce(query, 350)
  const trimmed = debouncedQuery.trim()

  const saveRecent = useCallback((term) => {
    const clean = term.trim()
    if (!clean) return
    setRecent(prev => {
      const next = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)
      writeRecent(next)
      return next
    })
  }, [])

  const handleVoiceResult = useCallback((transcript) => {
    setQuery(transcript)
    setFocused(true)
    saveRecent(transcript)
    toast.success(`🎙️ "${transcript}" khoja ja raha hai...`)
  }, [saveRecent])

  const voice = useVoiceSearch(handleVoiceResult)

  useEffect(() => {
    if (voice.error && voice.error !== 'no-speech' && voice.error !== 'aborted') {
      toast.error('Voice search kaam nahi kar paya, dobara try karo')
    }
  }, [voice.error])

  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', trimmed],
    queryFn: () => productAPI.searchSuggestions(trimmed).then(r => r.data),
    enabled: trimmed.length >= 2 && focused,
  })

  const { data: trending } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: () => productAPI.trendingSearches().then(r => r.data),
    staleTime: 10 * 60 * 1000,
  })

  const { data: results, isFetching: searching } = useQuery({
    queryKey: ['product-search', trimmed, sort, userLocation?.lat, userLocation?.lng],
    queryFn: () => productAPI.search(trimmed, {
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      sort,
    }).then(r => r.data),
    enabled: trimmed.length >= 2,
  })

  function selectTerm(term) {
    setQuery(term)
    saveRecent(term)
    setFocused(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      saveRecent(query)
      setFocused(false)
      e.target.blur()
    }
  }

  function clearSearch() {
    setQuery('')
    setFocused(true)
  }

  function closeDropdowns() {
    setFocused(false)
  }

  return {
    query, setQuery, focused, setFocused, sort, setSort, recent,
    trimmed, suggestions, trending, results, searching,
    voice, selectTerm, handleKeyDown, clearSearch, closeDropdowns,
    showAutocomplete: focused && trimmed.length >= 2 && suggestions?.length > 0,
    showEmptyPanel: focused && trimmed.length < 2 && (recent.length > 0 || (trending?.length > 0)),
    showResults: trimmed.length >= 2,
  }
}
