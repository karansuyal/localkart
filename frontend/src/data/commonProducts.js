// Starter catalog of common Indian kirana/grocery items.
//
// Icons reference the free, open-source "Fluent Emoji Flat" set (MIT
// licensed, by Microsoft) via Iconify -- these render as polished flat
// illustration icons (not plain text emoji), loaded through the
// <iconify-icon> web component (see index.html for the CDN script).
// Icon name format: "fluent-emoji-flat:<icon-id>"
//
// This is NOT a replacement for real product photos -- it's a tasteful
// placeholder so the UI never looks empty before a shopkeeper uploads
// their own photo. Real brand photos are intentionally NOT hardcoded here
// (copyright/trademark reasons); an uploaded photo always overrides this.

export const COMMON_PRODUCTS = [
  { match: ['maggi', 'noodles'], category: 'Snacks', icon: 'steaming-bowl' },
  { match: ['amul milk', 'milk', 'doodh'], category: 'Dairy', icon: 'glass-of-milk' },
  { match: ['paneer'], category: 'Dairy', icon: 'cheese-wedge' },
  { match: ['curd', 'dahi', 'yogurt'], category: 'Dairy', icon: 'bowl-with-spoon' },
  { match: ['butter', 'amul butter'], category: 'Dairy', icon: 'cheese-wedge' },
  { match: ['bread', 'pav'], category: 'Dairy', icon: 'bread' },
  { match: ['egg', 'anda'], category: 'Dairy', icon: 'egg' },
  { match: ['coca cola', 'coke', 'pepsi', 'cold drink', 'soda'], category: 'Beverages', icon: 'cup-with-straw' },
  { match: ['juice', 'frooti', 'real juice'], category: 'Beverages', icon: 'tropical-drink' },
  { match: ['tea', 'chai', 'tata tea'], category: 'Beverages', icon: 'teacup-without-handle' },
  { match: ['coffee', 'nescafe'], category: 'Beverages', icon: 'hot-beverage' },
  { match: ['water bottle', 'mineral water', 'bisleri'], category: 'Beverages', icon: 'droplet' },
  { match: ['lays', 'chips', 'kurkure', 'bingo'], category: 'Snacks', icon: 'french-fries' },
  { match: ['biscuit', 'parle', 'cookies', 'rusk'], category: 'Snacks', icon: 'cookie' },
  { match: ['chocolate', 'dairy milk', 'kitkat'], category: 'Snacks', icon: 'chocolate-bar' },
  { match: ['namkeen', 'bhujia', 'sev', 'mixture'], category: 'Snacks', icon: 'pretzel' },
  { match: ['rice', 'chawal', 'basmati'], category: 'Grocery', icon: 'cooked-rice' },
  { match: ['atta', 'wheat flour', 'maida'], category: 'Grocery', icon: 'sheaf-of-rice' },
  { match: ['dal', 'lentil', 'chana', 'rajma'], category: 'Grocery', icon: 'beans' },
  { match: ['sugar', 'cheeni'], category: 'Grocery', icon: 'salt' },
  { match: ['salt', 'namak'], category: 'Grocery', icon: 'salt' },
  { match: ['oil', 'sunflower oil', 'mustard oil', 'tel'], category: 'Grocery', icon: 'amphora' },
  { match: ['tomato', 'tamatar'], category: 'Vegetables', icon: 'tomato' },
  { match: ['onion', 'pyaz'], category: 'Vegetables', icon: 'garlic' },
  { match: ['potato', 'aloo'], category: 'Vegetables', icon: 'potato' },
  { match: ['banana', 'kela'], category: 'Vegetables', icon: 'banana' },
  { match: ['apple', 'seb'], category: 'Vegetables', icon: 'red-apple' },
  { match: ['soap', 'lifebuoy', 'dove'], category: 'Personal Care', icon: 'soap' },
  { match: ['shampoo'], category: 'Personal Care', icon: 'lotion-bottle' },
  { match: ['toothpaste', 'colgate'], category: 'Personal Care', icon: 'toothbrush' },
  { match: ['detergent', 'surf', 'tide', 'washing powder'], category: 'Household', icon: 'basket' },
  { match: ['phenyl', 'cleaner', 'harpic'], category: 'Household', icon: 'broom' },
  { match: ['battery'], category: 'Electronics', icon: 'battery' },
  { match: ['bulb', 'led light'], category: 'Electronics', icon: 'light-bulb' },
]

const DEFAULT_BY_CATEGORY = {
  Grocery: 'shopping-cart', Dairy: 'glass-of-milk', Snacks: 'popcorn', Beverages: 'cup-with-straw',
  Vegetables: 'broccoli', 'Personal Care': 'lotion-bottle', Household: 'broom', Electronics: 'electric-plug',
}

const ICON_SET = 'fluent-emoji-flat'

// Returns { category, icon } guess for a typed product name. `icon` is
// already the full "set:name" string ready to pass to <iconify-icon>.
export function guessProductMeta(name) {
  const lower = (name || '').toLowerCase().trim()
  if (!lower) return null
  const found = COMMON_PRODUCTS.find(p => p.match.some(m => lower.includes(m)))
  if (found) return { category: found.category, icon: `${ICON_SET}:${found.icon}` }
  return null
}

export function iconForCategory(category) {
  const name = DEFAULT_BY_CATEGORY[category] || 'shopping-bags'
  return `${ICON_SET}:${name}`
}