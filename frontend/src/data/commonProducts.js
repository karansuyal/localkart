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

// `unit` is the sensible default selling-unit for that item (kg/gram for
// loose weighed goods, litre/ml for liquids, dozen for eggs, piece for
// packaged/countable items, etc.) -- used to auto-fill the Unit dropdown
// on the Add Product form so the shopkeeper doesn't have to think about it.
export const COMMON_PRODUCTS = [
  { match: ['maggi', 'noodles'], category: 'Snacks', icon: 'steaming-bowl', unit: 'packet' },
  { match: ['amul milk', 'milk', 'doodh'], category: 'Dairy', icon: 'glass-of-milk', unit: 'litre' },
  { match: ['paneer'], category: 'Dairy', icon: 'cheese-wedge', unit: 'gram' },
  { match: ['curd', 'dahi', 'yogurt'], category: 'Dairy', icon: 'bowl-with-spoon', unit: 'gram' },
  { match: ['butter', 'amul butter'], category: 'Dairy', icon: 'cheese-wedge', unit: 'packet' },
  { match: ['bread', 'pav'], category: 'Dairy', icon: 'bread', unit: 'piece' },
  { match: ['egg', 'anda'], category: 'Dairy', icon: 'egg', unit: 'dozen' },
  { match: ['coca cola', 'coke', 'pepsi', 'cold drink', 'soda'], category: 'Beverages', icon: 'cup-with-straw', unit: 'bottle' },
  { match: ['juice', 'frooti', 'real juice'], category: 'Beverages', icon: 'tropical-drink', unit: 'bottle' },
  { match: ['tea', 'chai', 'tata tea'], category: 'Beverages', icon: 'teacup-without-handle', unit: 'gram' },
  { match: ['coffee', 'nescafe'], category: 'Beverages', icon: 'hot-beverage', unit: 'gram' },
  { match: ['water bottle', 'mineral water', 'bisleri'], category: 'Beverages', icon: 'droplet', unit: 'bottle' },
  { match: ['lays', 'chips', 'kurkure', 'bingo'], category: 'Snacks', icon: 'french-fries', unit: 'packet' },
  { match: ['biscuit', 'parle', 'cookies', 'rusk'], category: 'Snacks', icon: 'cookie', unit: 'packet' },
  { match: ['chocolate', 'dairy milk', 'kitkat'], category: 'Snacks', icon: 'chocolate-bar', unit: 'piece' },
  { match: ['namkeen', 'bhujia', 'sev', 'mixture'], category: 'Snacks', icon: 'pretzel', unit: 'gram' },
  { match: ['rice', 'chawal', 'basmati'], category: 'Grocery', icon: 'cooked-rice', unit: 'kg' },
  { match: ['atta', 'wheat flour', 'maida'], category: 'Grocery', icon: 'sheaf-of-rice', unit: 'kg' },
  { match: ['dal', 'lentil', 'chana', 'rajma'], category: 'Grocery', icon: 'beans', unit: 'kg' },
  { match: ['sugar', 'cheeni'], category: 'Grocery', icon: 'salt', unit: 'kg' },
  { match: ['salt', 'namak'], category: 'Grocery', icon: 'salt', unit: 'kg' },
  { match: ['oil', 'sunflower oil', 'mustard oil', 'tel'], category: 'Grocery', icon: 'amphora', unit: 'litre' },
  { match: ['tomato', 'tamatar'], category: 'Vegetables', icon: 'tomato', unit: 'kg' },
  { match: ['onion', 'pyaz'], category: 'Vegetables', icon: 'garlic', unit: 'kg' },
  { match: ['potato', 'aloo'], category: 'Vegetables', icon: 'potato', unit: 'kg' },
  { match: ['banana', 'kela'], category: 'Vegetables', icon: 'banana', unit: 'dozen' },
  { match: ['apple', 'seb'], category: 'Vegetables', icon: 'red-apple', unit: 'kg' },
  { match: ['soap', 'lifebuoy', 'dove'], category: 'Personal Care', icon: 'soap', unit: 'piece' },
  { match: ['shampoo'], category: 'Personal Care', icon: 'lotion-bottle', unit: 'ml' },
  { match: ['toothpaste', 'colgate'], category: 'Personal Care', icon: 'toothbrush', unit: 'piece' },
  { match: ['detergent', 'surf', 'tide', 'washing powder'], category: 'Household', icon: 'basket', unit: 'kg' },
  { match: ['phenyl', 'cleaner', 'harpic'], category: 'Household', icon: 'broom', unit: 'ml' },
  { match: ['battery'], category: 'Electronics', icon: 'battery', unit: 'piece' },
  { match: ['bulb', 'led light'], category: 'Electronics', icon: 'light-bulb', unit: 'piece' },
]

const DEFAULT_BY_CATEGORY = {
  Grocery: 'shopping-cart', Dairy: 'glass-of-milk', Snacks: 'popcorn', Beverages: 'cup-with-straw',
  Vegetables: 'broccoli', 'Personal Care': 'lotion-bottle', Household: 'broom', Electronics: 'electric-plug',
}

const ICON_SET = 'fluent-emoji-flat'

// All selling units a shopkeeper can pick from, grouped by kind so the
// dropdown reads naturally. `label` is what's shown, `short` is the
// compact form used next to numbers in the inventory list (e.g. "2 kg").
export const UNITS = [
  { value: 'piece', label: 'Piece (nag)', short: 'pc' },
  { value: 'dozen', label: 'Dozen (12)', short: 'dozen' },
  { value: 'kg', label: 'Kilogram (kg)', short: 'kg' },
  { value: 'gram', label: 'Gram (g)', short: 'g' },
  { value: 'litre', label: 'Litre (L)', short: 'L' },
  { value: 'ml', label: 'Millilitre (ml)', short: 'ml' },
  { value: 'packet', label: 'Packet', short: 'packet' },
  { value: 'pack', label: 'Pack', short: 'pack' },
  { value: 'box', label: 'Box', short: 'box' },
  { value: 'bottle', label: 'Bottle', short: 'bottle' },
]

// Units where fractional-feeling quantities are common (e.g. "500 gram",
// "2 litre") -- used to decide whether to show a decimal-friendly step.
export const DECIMAL_UNITS = ['kg', 'litre']

export function unitShortLabel(unit) {
  return UNITS.find(u => u.value === unit)?.short || unit || 'piece'
}

// Returns { category, icon, unit } guess for a typed product name. `icon`
// is already the full "set:name" string ready to pass to <iconify-icon>.
export function guessProductMeta(name) {
  const lower = (name || '').toLowerCase().trim()
  if (!lower) return null
  const found = COMMON_PRODUCTS.find(p => p.match.some(m => lower.includes(m)))
  if (found) return { category: found.category, icon: `${ICON_SET}:${found.icon}`, unit: found.unit }
  return null
}

export function iconForCategory(category) {
  const name = DEFAULT_BY_CATEGORY[category] || 'shopping-bags'
  return `${ICON_SET}:${name}`
}