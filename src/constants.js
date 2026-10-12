export const HATCHERIES = ['Nourish', 'Kazi', 'CP', 'Paragon', 'Peoples', 'Nahar']

export const BREEDS = [
  'Shaver Star Cross 579 Brown',
  'Bovans White',
  'Hy-line Brown',
  'Hy-line White',
  'Hisex Brown',
  'Hisex White',
  'ISA Brown',
  'ISA White',
]

export const AGE_MODES = [
  ['weeks', 'Weeks'],
  ['months', 'Months'],
  ['days', 'Days'],
]

// [accent, soft] : protyek farm er alada rong
export const PALETTE = [
  ['#2b7a78', '#e1f0ef'],
  ['#3f51b5', '#e6e9f8'],
  ['#c77d0a', '#fbefd8'],
  ['#b5446e', '#f8e5ed'],
  ['#6b4fa3', '#ece7f6'],
  ['#2f6da3', '#e2edf7'],
  ['#5b7f2b', '#e8f0da'],
]

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()


// < 8 week: Starter, 8 theke 17 week: Grower, 18 week+: Layer 1
export function defaultFeedFor(ageDays, feedItems) {
  const weeks = ageDays / 7
  const key = weeks < 8 ? 'starter' : weeks < 18 ? 'grower' : 'layer 1'
  const target = {
    starter: 'nourish layer starter',
    grower: 'nourish layer grower',
    'layer 1': 'nourish layer 1',
  }[key]
  const exact = feedItems.find((f) => norm(f.name) === target)
  if (exact) return exact.name
  const loose = feedItems.find((f) => norm(f.name).includes('nourish') && norm(f.name).includes(key))
  return loose ? loose.name : ''
}
