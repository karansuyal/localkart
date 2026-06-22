import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { aiAPI } from '../../services/api'
import { ArrowLeft, Send, Bot, User } from 'lucide-react'

const QUICK_PROMPTS = [
  'Maggi kaha milegi?',
  'Aaj kya special hai?',
  'Best shop near me?',
  'Cold drink discount hai?',
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Namaste! 🙏 Main LocalKart AI hoon. Kaise help kar sakta hoon? Nearby shops, products, ya kuch aur poochein!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = messages.slice(-6).map(m => m.role === 'user' ? { user: m.text, bot: '' } : { user: '', bot: m.text })
      const res = await aiAPI.chat(text, history)
      setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, abhi kuch problem hai. Thodi der baad try karein 🙏' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary-600 text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home"><ArrowLeft size={20} className="text-white" /></Link>
          <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="font-bold">LocalKart AI Assistant</h1>
            <p className="text-primary-200 text-xs">Hindi + English · Always online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-32 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'bot' && <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0"><Bot size={14} className="text-white" /></div>}
            <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}>
              {msg.text}
            </div>
            {msg.role === 'user' && <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0"><User size={14} /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center"><Bot size={14} className="text-white" /></div>
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t px-4 py-3">
        <div className="flex gap-2 overflow-x-auto mb-2 pb-1">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => sendMessage(p)} className="whitespace-nowrap text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1 rounded-full hover:bg-primary-100">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Kuch bhi poochein..."
            className="input-field flex-1"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="btn-primary px-4 disabled:opacity-50">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
