import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Wraps the browser's Web Speech API (SpeechRecognition) for voice search.
 *
 * IMPORTANT: we use 'en-IN' (Indian English), NOT 'hi-IN'. Product names
 * in the catalog are stored in Latin script ("Maggi", "Atta", "Doodh"),
 * but 'hi-IN' transcribes speech into Devanagari script ("मैगी") even for
 * words spoken in Hinglish -- that text never matches the Latin-script
 * catalog, so search silently returns 0 results. Chrome's 'en-IN'
 * recognizer instead transcribes Hindi/Hinglish speech phonetically in
 * Latin letters, which lines up with how items are actually named here.
 *
 * As a safety net, if the recognizer still returns Devanagari text (some
 * browser/OS combos ignore `lang` for certain voices), we transliterate a
 * small dictionary of common grocery words so the search doesn't just
 * silently fail.
 *
 * Returns { isSupported, isListening, start, stop, error }
 * `onResult(transcript)` fires with the final recognized text.
 */

// Devanagari -> Latin fallback for common grocery items, only used if the
// recognizer ignores `lang` and returns Devanagari script anyway.
const HI_TO_EN = {
  'मैगी': 'maggi', 'मैगि': 'maggi',
  'आटा': 'atta', 'दूध': 'doodh milk', 'दूध।': 'doodh milk',
  'चावल': 'rice', 'चीनी': 'sugar', 'नमक': 'salt',
  'तेल': 'oil', 'ब्रेड': 'bread', 'अंडे': 'eggs', 'अंडा': 'egg',
  'चिप्स': 'chips', 'बिस्किट': 'biscuit', 'साबुन': 'soap',
  'शैम्पू': 'shampoo', 'चाय': 'chai tea', 'कॉफी': 'coffee',
  'पानी': 'water', 'दही': 'dahi curd', 'पनीर': 'paneer',
  'आलू': 'aloo potato', 'प्याज': 'onion', 'टमाटर': 'tomato',
  'कोल्ड ड्रिंक': 'cold drink',
}
const DEVANAGARI_RE = /[\u0900-\u097F]/

function transliterate(text) {
  if (!DEVANAGARI_RE.test(text)) return text
  const trimmed = text.trim()
  if (HI_TO_EN[trimmed]) return HI_TO_EN[trimmed]
  // Word-by-word fallback for short phrases
  const mapped = trimmed.split(/\s+/).map(w => HI_TO_EN[w] || w).join(' ')
  return mapped
}

export function useVoiceSearch(onResult) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!isSupported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const raw = event.results?.[0]?.[0]?.transcript?.trim()
      if (raw) onResult(transliterate(raw))
    }
    recognition.onerror = (event) => {
      setError(event.error)
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [isSupported, onResult])

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return
    setError(null)
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // start() throws if already started -- safe to ignore
    }
  }, [isListening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isSupported, isListening, start, stop, error }
}