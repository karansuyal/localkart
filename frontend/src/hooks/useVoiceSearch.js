import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Wraps the browser's Web Speech API (SpeechRecognition) for voice search.
 * Hindi + English dono ke liye 'hi-IN' use kar rahe hain -- Chrome ka
 * hi-IN recognizer Hinglish (roman + mixed) speech ko bhi reasonably
 * accha handle karta hai, jo local grocery item names (jaise "maggi",
 * "aata", "doodh") ke liye best fit hai.
 *
 * Returns { isSupported, isListening, start, stop, error }
 * `onResult(transcript)` fires with the final recognized text.
 */
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
    recognition.lang = 'hi-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()
      if (transcript) onResult(transcript)
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
