export const num = (v) => Number(v) || 0
export const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d

export function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// b - a, din e
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000)

export function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}-${m}-${y}`
}

export function fmt(n, max = 2) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: max })
}

function monthsDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  let months = (y2 - y1) * 12 + (m2 - m1)
  if (d2 < d1) months--
  const total = m1 - 1 + months
  const ay = y1 + Math.floor(total / 12)
  const am = (total % 12) + 1
  const dim = new Date(Date.UTC(ay, am, 0)).getUTCDate()
  const anchor = `${ay}-${String(am).padStart(2, '0')}-${String(Math.min(d1, dim)).padStart(2, '0')}`
  return { months, days: daysBetween(anchor, b) }
}

// mode: 'weeks' | 'months' | 'days'
export function formatAgeMode(hatch, date, mode) {
  const days = daysBetween(hatch, date)
  if (days < 0) return '-'
  if (mode === 'days') return `${days} days`
  if (mode === 'months') {
    const m = monthsDays(hatch, date)
    return `${m.months}m ${m.days}d`
  }
  return `${Math.floor(days / 7)}w ${days % 7}d`
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Ekta row er sob hisab
export function calcRow(farm, r, totalBird) {
  const ageDays = daysBetween(farm.hatch_date, r.record_date)
  const hasTotal = r.total_egg !== null && r.total_egg !== undefined && r.total_egg !== ''
  const totalEgg = hasTotal ? num(r.total_egg) : num(r.egg_case) * 30
  const eggPct = totalBird > 0 ? (totalEgg / totalBird) * 100 : 0
  const eggPrice = totalEgg * num(r.price_per_egg)
  const feedTotal = num(r.feed_bag) * num(r.feed_price_per_bag)
  const medicineCost = num(r.medicine_cost)
  const vaccineCost = num(r.vaccine_cost)
  const totalCost = feedTotal + medicineCost + vaccineCost
  return {
    ...r,
    ageDays,
    totalBird,
    totalEgg,
    eggPct,
    eggPrice,
    feedTotal,
    medicineCost,
    vaccineCost,
    totalCost,
    profit: eggPrice - totalCost,
  }
}

const byDate = (a, b) =>
  a.record_date === b.record_date
    ? (a.created_at || '').localeCompare(b.created_at || '')
    : a.record_date.localeCompare(b.record_date)

// Date onujayi sajiye, mortality jog kore Total Bird ber kore
export function computeRows(farm, records) {
  const sorted = [...records].sort(byDate)
  let dead = 0
  return sorted.map((r) => {
    dead += num(r.mortality)
    return calcRow(farm, r, farm.total_bird - dead)
  })
}

// Sesh kon vaccine kotodin age deya hoyeche
export function lastVaccine(records) {
  const list = records.filter((r) => (r.vaccine || '').trim()).sort(byDate)
  if (!list.length) return null
  const r = list[list.length - 1]
  return {
    name: r.vaccine.trim(),
    date: r.record_date,
    daysAgo: daysBetween(r.record_date, todayStr()),
  }
}
