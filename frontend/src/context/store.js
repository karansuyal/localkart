import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,

      login: (userData, token) => set({
        user: userData, token, role: userData.role, isAuthenticated: true
      }),

      logout: () => set({ user: null, token: null, role: null, isAuthenticated: false }),

      updateUser: (data) => set(state => ({ user: { ...state.user, ...data } }))
    }),
    { name: 'localkart-auth' }
  )
)

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      shopId: null,

      addItem: (product, shopId) => {
        const { items, shopId: currentShop } = get()
        if (currentShop && currentShop !== shopId) {
          if (!confirm('Cart mein doosri dukaan ke items hain. Clear karein?')) return
          set({ items: [], shopId: null })
        }
        const existing = items.find(i => i.id === product.id)
        if (existing) {
          set({ items: items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) })
        } else {
          set({ items: [...items, { ...product, qty: 1 }], shopId })
        }
      },

      removeItem: (id) => set(state => ({
        items: state.items.filter(i => i.id !== id),
        shopId: state.items.length <= 1 ? null : state.shopId
      })),

      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return }
        set(state => ({ items: state.items.map(i => i.id === id ? { ...i, qty } : i) }))
      },

      clearCart: () => set({ items: [], shopId: null }),

      get total() { return get().items.reduce((s, i) => s + i.price * i.qty, 0) },
      get count() { return get().items.reduce((s, i) => s + i.qty, 0) }
    }),
    { name: 'localkart-cart' }
  )
)
