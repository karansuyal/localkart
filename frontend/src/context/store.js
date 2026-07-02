import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
    }),
    {
      name: 'localkart-cart',
      storage: createJSONStorage(() => localStorage),
      // Only ever persist the actual cart data -- items + shopId. Nothing
      // else in this store needs to survive a refresh, and keeping the
      // persisted payload to exactly these two fields means there's no
      // chance of stale/derived junk corrupting what gets restored.
      partialize: (state) => ({ items: state.items, shopId: state.shopId }),
    }
  )
)