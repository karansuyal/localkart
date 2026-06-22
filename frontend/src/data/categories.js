// Category grid data — Blinkit-style icon grid
// Each entry maps to Shop.category / Product.category values already used in backend
// Icons use the free, open-source "Fluent Emoji Flat" set via Iconify
// (see index.html for the CDN script) -- flat illustration style, not
// plain text emoji, for a more polished Blinkit-like look.

const ICON_SET = 'fluent-emoji-flat'

export const CATEGORIES = [
  { key: 'Vegetables', label: 'Fruits &\nVegetables', icon: `${ICON_SET}:broccoli`, bg: 'bg-fresh-50' },
  { key: 'Dairy',      label: 'Dairy &\nBread',       icon: `${ICON_SET}:glass-of-milk`, bg: 'bg-blue-50' },
  { key: 'Grocery',    label: 'Atta, Rice\n& Dals',   icon: `${ICON_SET}:sheaf-of-rice`, bg: 'bg-amber-50' },
  { key: 'Snacks',     label: 'Munchies\n& Snacks',   icon: `${ICON_SET}:popcorn`, bg: 'bg-primary-50' },
  { key: 'Beverages',  label: 'Cold Drinks\n& Juices', icon: `${ICON_SET}:cup-with-straw`, bg: 'bg-urgent-50' },
  { key: 'Personal Care', label: 'Personal\nCare',    icon: `${ICON_SET}:lotion-bottle`, bg: 'bg-purple-50' },
  { key: 'Household',  label: 'Cleaning\nEssentials', icon: `${ICON_SET}:broom`, bg: 'bg-teal-50' },
  { key: 'Electronics', label: 'Electronics\n& More',  icon: `${ICON_SET}:electric-plug`, bg: 'bg-ink-50' },
]

export const ALL_CATEGORY = 'All'