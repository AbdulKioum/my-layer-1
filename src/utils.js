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

// n din jog korar jonno
export function addDays(dateStr, days) {
  const d = new Date(parse(dateStr) + days * 86400000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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


export function calcRow(farm, r, totalBird, gap = 1) {
  const ageDays = daysBetween(farm.hatch_date, r.record_date)
  const hasTotal = r.total_egg !== null && r.total_egg !== undefined && r.total_egg !== ''
  const totalEgg = hasTotal ? num(r.total_egg) : num(r.egg_case) * 30
  
  // gap diye multiply kore daily er hisab
  const eggPct = totalBird > 0 && gap > 0 ? (totalEgg / (totalBird * gap)) * 100 : 0
  const eggPrice = totalEgg * num(r.price_per_egg)

  const feedBag = num(r.feed_bag)
  // draft theke feed_kg asle ota nibe, noile bag theke hisab korbe
  const feedKg = r.feed_kg !== undefined && r.feed_kg !== '' ? num(r.feed_kg) : feedBag * 50
  const feedTotal = feedBag * num(r.feed_price_per_bag)
  
  const medicineCost = num(r.medicine_cost)
  const vaccineCost = num(r.vaccine_cost)
  const totalCost = feedTotal + medicineCost + vaccineCost

  // Feed/bird/day in gm
  const feedPerBirdDay = totalBird > 0 && gap > 0 ? (feedKg * 1000) / (totalBird * gap) : 0

  return {
    ...r,
    ageDays,
    totalBird,
    totalEgg,
    eggPct,
    eggPrice,
    feedBag,
    feedKg,
    feedPerBirdDay,
    feedTotal,
    medicineCost,
    vaccineCost,
    totalCost,
    profit: eggPrice - totalCost,
    gap 
  }
}

const byDate = (a, b) =>
  a.record_date === b.record_date
    ? (a.created_at || '').localeCompare(b.created_at || '')
    : a.record_date.localeCompare(b.record_date)


export function computeRows(farm, records) {
  const sorted = [...records].sort(byDate)
  let dead = 0
  return sorted.map((r, i) => {
    dead += num(r.mortality)
    const prevDate = i === 0 ? null : sorted[i - 1].record_date
    // Purboborti record theke koto diner gap
    const gap = prevDate ? Math.max(1, daysBetween(prevDate, r.record_date)) : 1
    return calcRow(farm, r, farm.total_bird - dead, gap)
  })
}


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