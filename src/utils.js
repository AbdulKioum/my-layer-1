export const num = (v) => Number(v) || 0

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

export function addDays(s, n) {
  return new Date(parse(s) + n * 86400000).toISOString().slice(0, 10)
}

export function formatAge(days) {
  if (days < 0) return '-'
  return `${Math.floor(days / 7)}w ${days % 7}d`
}

export function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}-${m}-${y}`
}

export function fmt(n, max = 2) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: max })
}

// Ekta row er sob hisab
export function calcRow(farm, r, totalBird) {
  const ageDays = daysBetween(farm.hatch_date, r.record_date)
  const totalEgg = num(r.egg_case) * 30
  const eggPct = totalBird > 0 ? (totalEgg / totalBird) * 100 : 0
  const eggPrice = totalEgg * num(r.price_per_egg)
  const feedTotal = num(r.feed_bag) * num(r.feed_price_per_bag)
  return {
    ...r,
    ageDays,
    totalBird,
    totalEgg,
    eggPct,
    eggPrice,
    feedTotal,
    profit: eggPrice - feedTotal,
  }
}

// Date onujayi sajiye, mortality jog kore Total Bird ber kore
export function computeRows(farm, records) {
  const sorted = [...records].sort((a, b) =>
    a.record_date === b.record_date
      ? (a.created_at || '').localeCompare(b.created_at || '')
      : a.record_date.localeCompare(b.record_date)
  )
  let dead = 0
  return sorted.map((r) => {
    dead += num(r.mortality)
    return calcRow(farm, r, farm.total_bird - dead)
  })
}

const splitNames = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)

// Vaccine comment er hisab
export function vaccineInfo(farm, records, vaccines) {
  if (!vaccines.length) return { empty: true }

  const today = todayStr()
  const ageToday = daysBetween(farm.hatch_date, today)
  const given = new Set(records.flatMap((r) => splitNames(r.vaccine)))
  const isGiven = (v) => given.has(v.name.trim().toLowerCase())

  const list = [...vaccines].sort((a, b) => a.age_days - b.age_days)
  const lastAge = list[list.length - 1].age_days

  const dueToday = list.filter((v) => v.age_days === ageToday && !isGiven(v))
  const overdue = list.filter((v) => v.age_days < ageToday && !isGiven(v))
  const upcoming = list.filter(
    (v) => v.age_days > ageToday && v.age_days <= ageToday + 7
  )

  let live = null
  if (ageToday > lastAge) {
    const listEnd = addDays(farm.hatch_date, lastAge)
    const lastGiven = records
      .filter((r) => splitNames(r.vaccine).length)
      .map((r) => r.record_date)
      .sort()
      .pop()
    const ref = lastGiven && lastGiven > listEnd ? lastGiven : listEnd
    const since = daysBetween(ref, today)
    live = { since, due: since >= 30, nextIn: 30 - since }
  }

  return { ageToday, dueToday, overdue, upcoming, live }
}
