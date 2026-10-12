import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  computeRows,
  calcRow,
  todayStr,
  daysBetween,
  formatAgeMode,
  fmtDate,
  fmt,
  num,
  round,
  lastVaccine,
  addDays,
} from '../utils'
import { AGE_MODES, PALETTE, defaultFeedFor } from '../constants'
import FarmForm from './FarmForm'
import CostModal from './CostModal'
import CullModal from './CullModal'
import ActionMenu from './ActionMenu'

const str = (v) => (v ? String(v) : '')

const newDraft = (farm, feedItems) => {
  const date = todayStr()
  return {
    id: null,
    record_date: date,
    mortality: '',
    egg_case: '',
    total_egg: '',
    medicine: '',
    medicine_cost: '',
    vaccine: '',
    vaccine_cost: '',
    price_per_egg: '',
    feed_item: defaultFeedFor(daysBetween(farm.hatch_date, date), feedItems),
    feed_bag: '',
    feed_kg: '',
    body_weight: '', 
    feed_touched: false,
  }
}

const draftFromRow = (r) => ({
  id: r.id,
  record_date: r.record_date,
  mortality: str(r.mortality),
  egg_case: str(round(r.totalEgg / 30, 2)),
  total_egg: str(r.totalEgg),
  medicine: r.medicine || '',
  medicine_cost: str(r.medicine_cost),
  vaccine: r.vaccine || '',
  vaccine_cost: str(r.vaccine_cost),
  price_per_egg: str(r.price_per_egg),
  feed_item: r.feed_item || '',
  feed_bag: str(r.feedBag ?? r.feed_bag),
  feed_kg: str(r.feedKg ?? num(r.feed_bag) * 50),
  body_weight: str(r.body_weight), 
  feed_touched: true,
  orig_feed_item: r.feed_item || '',
  feed_snapshot: num(r.feed_price_per_bag),
})

function VaccineLine({ farm, records, vaccines }) {
  const v = lastVaccine(records)
  let text = 'No vaccine given yet.'
  if (v) {
    const ago = v.daysAgo === 0 ? 'today' : v.daysAgo === 1 ? '1 day ago' : `${v.daysAgo} days ago`
    text = `${v.name}, ${ago} (${fmtDate(v.date)})`
  }

  const today = todayStr()
  const currentAgeDays = daysBetween(farm.hatch_date, today)

  let nextTexts = []
  let isScheduled = false

  if (currentAgeDays <= 18 * 7) {
    const upcoming = vaccines.filter(vac => {
      const vAge = Number(vac.age_days)
      return vAge >= currentAgeDays && vAge <= currentAgeDays + 7
    })
    
    if (upcoming.length > 0) {
      isScheduled = true
      upcoming.forEach(vac => {
        const targetDate = addDays(farm.hatch_date, vac.age_days)
        nextTexts.push(`${vac.name} (at ${vac.age_days} days on ${fmtDate(targetDate)})`)
      })
    }
  }

  let lastRecurringDate = null
  const sortedRecs = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date))
  
  for (const r of sortedRecs) {
    if (!r.vaccine) continue
    const vName = r.vaccine.toUpperCase().replace(/\s+/g, '')
    
    if (vName.includes('IB+ND+EDS') || vName.includes('ND+IB+EDS')) {
      lastRecurringDate = r.record_date
    } 
    else if (lastRecurringDate && (vName.includes('ND/IB') || vName.includes('ND+IB') || vName.includes('IB+ND') || vName.includes('IB/ND'))) {
      lastRecurringDate = r.record_date
    }
  }

  if (lastRecurringDate) {
    const daysSinceLast = daysBetween(lastRecurringDate, today)
    const daysToNext = 30 - daysSinceLast
    
    if (daysToNext <= 7) {
      isScheduled = true
      const nextDate = addDays(lastRecurringDate, 30)
      
      let dueStr = ''
      if (daysToNext === 0) {
        dueStr = 'today'
      } else if (daysToNext > 0) {
        dueStr = `in ${daysToNext} days`
      } else {
        dueStr = `overdue by ${Math.abs(daysToNext)} days (30 days crossed)`
      }
      
      nextTexts.push(`ND/IB Live (${dueStr} on ${fmtDate(nextDate)})`)
    }
  }

  let nextDisplay = null
  if (isScheduled) {
    nextDisplay = nextTexts.join(', ')
  } else if (currentAgeDays <= 18 * 7) {
    nextDisplay = 'No vaccine scheduled in next 7 days'
  }

  return (
    <div className="vaccine-line" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div><b>Last vaccine:</b> {text}</div>
      {nextDisplay && (
        <div><b>Next vaccine:</b> <span style={{ color: 'var(--danger)' }}>{nextDisplay}</span></div>
      )}
    </div>
  )
}

export default function FarmSection({ farm, index, vaccines, feedItems, layerStandards, onFarmChanged }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [shown, setShown] = useState(3)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ageMode, setAgeMode] = useState('weeks')
  const [editingFarm, setEditingFarm] = useState(false)
  const [showCost, setShowCost] = useState(false)
  const [showCull, setShowCull] = useState(false)
  const readOnly = !!farm.culled_at
  const colCount = readOnly ? 22 : 23

  const [accent, soft] = PALETTE[index % PALETTE.length]

  async function load() {
    const { data, error } = await supabase
      .from('farm_records')
      .select('*')
      .eq('farm_id', farm.id)
    if (error) setError(error.message)
    else setRecords(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [farm.id])

  const rows = useMemo(() => computeRows(farm, records), [farm, records])
  const visible = shown >= rows.length ? rows : rows.slice(rows.length - shown)
  const hidden = rows.length - visible.length
  const canLess = rows.length > 3 && visible.length > 3

  let d = null
  let gap = 1
  if (draft) {
    const item = feedItems.find((f) => f.name === draft.feed_item)
    const keepOld = draft.id && draft.feed_item === draft.orig_feed_item
    const feedPrice = keepOld ? draft.feed_snapshot : num(item?.price_per_bag)
    
    const beforeDraft = records
      .filter((r) => r.id !== draft.id && r.record_date < draft.record_date)
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
    
    if (beforeDraft.length > 0) {
      const prevDate = beforeDraft[beforeDraft.length - 1].record_date
      gap = Math.max(1, daysBetween(prevDate, draft.record_date))
    }

    const deadBefore = beforeDraft.reduce((s, r) => s + num(r.mortality), 0)
    
    d = calcRow(
      farm,
      { ...draft, feed_price_per_bag: feedPrice, feed_kg: draft.feed_kg },
      farm.total_bird - deadBefore - num(draft.mortality),
      gap
    )
  }
  
  const maxEggs = d ? Math.max(d.totalBird, 0) * gap : 0
  const overEgg = d ? d.totalEgg > maxEggs : false

  const set = (k) => (e) => setDraft((x) => ({ ...x, [k]: e.target.value }))

  function setDate(e) {
    const date = e.target.value
    setDraft((x) => ({
      ...x,
      record_date: date,
      feed_item:
        x.feed_touched || !date
          ? x.feed_item
          : defaultFeedFor(daysBetween(farm.hatch_date, date), feedItems),
    }))
  }

  function setEgg(kind, v) {
    const max = Math.max(d.totalBird, 0) * gap
    let total = v === '' ? '' : kind === 'case' ? num(v) * 30 : num(v)
    let capped = false
    if (total !== '' && total > max) {
      total = max
      capped = true
    }
    setDraft((x) => ({
      ...x,
      total_egg: total === '' ? '' : kind === 'total' && !capped ? v : String(round(total, 2)),
      egg_case: total === '' ? '' : kind === 'case' && !capped ? v : String(round(total / 30, 2)),
    }))
  }

  function setFeed(kind, v) {
    let kg = v === '' ? '' : kind === 'kg' ? num(v) : num(v) * 50
    let bag = v === '' ? '' : kind === 'bag' ? num(v) : num(v) / 50
    setDraft((x) => ({
      ...x,
      feed_kg: kg === '' ? '' : kind === 'kg' ? v : String(round(kg, 2)),
      feed_bag: bag === '' ? '' : kind === 'bag' ? v : String(round(bag, 2)),
      feed_touched: true
    }))
  }

  async function save() {
    if (!draft.record_date) return setError('Date is required.')
    if (overEgg) return setError('Total Egg cannot be more than Total Bird.')
    setSaving(true)
    setError('')
    const payload = {
      record_date: draft.record_date,
      mortality: num(draft.mortality),
      egg_case: round(d.totalEgg / 30, 4),
      total_egg: d.totalEgg,
      medicine: draft.medicine.trim(),
      medicine_cost: num(draft.medicine_cost),
      vaccine: draft.vaccine.trim(),
      vaccine_cost: num(draft.vaccine_cost),
      price_per_egg: num(draft.price_per_egg),
      feed_item: draft.feed_item,
      feed_bag: num(draft.feed_bag), 
      feed_price_per_bag: d.feed_price_per_bag,
      body_weight: draft.body_weight === '' ? null : num(draft.body_weight) // ওজন সেভ করা
    }
    const q = draft.id
      ? supabase.from('farm_records').update(payload).eq('id', draft.id)
      : supabase.from('farm_records').insert({ ...payload, farm_id: farm.id })
    const { error } = await q
    setSaving(false)
    if (error) return setError(error.message)
    setDraft(null)
    load()
  }

  async function removeRow(r) {
    if (!window.confirm(`Delete the record of ${fmtDate(r.record_date)}?`)) return
    const { error } = await supabase.from('farm_records').delete().eq('id', r.id)
    if (error) setError(error.message)
    else load()
  }

  async function removeFarm() {
    if (!window.confirm(`Delete farm "${farm.name}" and all its records? This cannot be undone.`))
      return
    const { error } = await supabase.from('farms').delete().eq('id', farm.id)
    if (error) setError(error.message)
    else onFarmChanged()
  }

 
  const getStandardWeight = (date) => {
    const ageWeeks = Math.floor(daysBetween(farm.hatch_date, date) / 7)
    const std = layerStandards?.find(l => l.breed === farm.breed && l.age_weeks === ageWeeks)
    if (!std || (!std.body_weight_min && !std.body_weight_max)) return '-'
    if (std.body_weight_min && std.body_weight_max) return `${std.body_weight_min} - ${std.body_weight_max}`
    return std.body_weight_min || std.body_weight_max
  }

  const tone = (p) => (p < 0 ? 'neg' : p > 0 ? 'pos' : '')

  const draftRow = d && (
    <tr className="draft" key="draft">
      <td><input type="date" value={draft.record_date} onChange={setDate} /></td>
      <td>{formatAgeMode(farm.hatch_date, draft.record_date, ageMode)}</td>
      <td><input type="number" min="0" value={draft.mortality} onChange={set('mortality')} style={{width: '60px'}}/></td>
      <td className="num">{fmt(d.totalBird)}</td>
      
      
      <td><input type="number" min="0" step="any" value={draft.body_weight} onChange={set('body_weight')} style={{width: '70px'}} placeholder="gm" /></td>
      <td className="num" style={{ color: 'var(--muted)' }}>{getStandardWeight(draft.record_date)}</td>
      
      <td><input type="number" min="0" step="any" value={draft.egg_case} onChange={(e) => setEgg('case', e.target.value)} /></td>
      <td><input type="number" min="0" max={Math.max(d.totalBird, 0) * gap} step="any" value={draft.total_egg} onChange={(e) => setEgg('total', e.target.value)} /></td>
      <td className="num">{fmt(d.eggPct, 1)}%</td>
      <td><input value={draft.medicine} onChange={set('medicine')} /></td>
      <td><input type="number" min="0" step="any" value={draft.medicine_cost} onChange={set('medicine_cost')} /></td>
      <td>
        <select value={draft.vaccine} onChange={set('vaccine')}>
          <option value="">None</option>
          {draft.vaccine && !vaccines.some((v) => v.name === draft.vaccine) && (
            <option value={draft.vaccine}>{draft.vaccine}</option>
          )}
          {vaccines.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      </td>
      <td><input type="number" min="0" step="any" value={draft.vaccine_cost} onChange={set('vaccine_cost')} /></td>
      <td><input type="number" min="0" step="any" value={draft.price_per_egg} onChange={set('price_per_egg')} /></td>
      <td className="num">{fmt(d.eggPrice)}</td>
      <td>
        <select
          value={draft.feed_item}
          onChange={(e) => setDraft((x) => ({ ...x, feed_item: e.target.value, feed_touched: true }))}
        >
          <option value="">{feedItems.length ? 'Select' : 'No feed added'}</option>
          {draft.feed_item && !feedItems.some((f) => f.name === draft.feed_item) && (
            <option value={draft.feed_item}>{draft.feed_item}</option>
          )}
          {feedItems.map((f) => (
            <option key={f.id} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
      </td>
      <td><input type="number" min="0" step="any" value={draft.feed_bag} onChange={(e) => setFeed('bag', e.target.value)} /></td>
      <td><input type="number" min="0" step="any" value={draft.feed_kg} onChange={(e) => setFeed('kg', e.target.value)} /></td>
      <td className="num">{fmt(d.feedPerBirdDay, 1)}g</td>
      <td className="num">{fmt(d.feed_price_per_bag)}</td>
      <td className="num">{fmt(d.feedTotal)}</td>
      <td className={`num ${tone(d.profit)}`}>{fmt(d.profit)}</td>
      <td className="actions">
        <button className="btn small" onClick={save} disabled={saving || overEgg}>
          {saving ? 'Saving...' : draft.id ? 'Update' : 'Save'}
        </button>
        <button className="btn small alt" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </td>
    </tr>
  )

  const headers = [
    'Date',
    'AGE',
    'Mortality',
    'Total Bird',
    'Weight (g)', 
    'Standard (g)', 
    'Egg Case',
    'Total Egg',
    'Egg %',
    'Medicine',
    'Medicine Cost',
    'Vaccine',
    'Vaccine Cost',
    'Price/egg',
    'Total Egg Price',
    'Feed Item',
    'Feed Bag',
    'Total Kg',
    'Feed/Bird/Day (g)',
    'Feed Price/bag',
    'Total Feed Price',
    'Profit',
    '',
  ]

  return (
    <section className="farm" style={{ '--accent': accent, '--soft': soft }}>
      <div className="farm-head">
        <h2> {farm.name}</h2>
        <div className="meta">
          <span><b>Hatch Date:</b> {fmtDate(farm.hatch_date)}</span>
          <span><b>Hatchery:</b> {farm.hatchery || '-'}</span>
          <span><b>Breed:</b> {farm.breed || '-'}</span>
          <span><b>Total Bird:</b> {fmt(farm.total_bird)}</span>
        </div>
        <ActionMenu
          items={
            readOnly
              ? [
                  { label: 'Edit Cull Info', onClick: () => setShowCull(true) },
                  { label: 'Delete Farm', onClick: removeFarm, danger: true },
                ]
              : [
                  { label: 'Edit Farm', onClick: () => setEditingFarm(!editingFarm) },
                  { label: 'Cull', onClick: () => setShowCull(true) },
                  { label: 'Delete Farm', onClick: removeFarm, danger: true },
                ]
          }
        />
      </div>

      {readOnly && (
        <div className="cull-info">
          <span><b>Culled Date:</b> {fmtDate(farm.culled_at)}</span>
          <span><b>Reason:</b> {farm.cull_reason || '-'}</span>
          <span><b>T.B:</b> {farm.cull_tb === null ? '-' : fmt(farm.cull_tb)}</span>
          <span><b>Total Weight:</b> {farm.cull_weight === null ? '-' : fmt(farm.cull_weight)}</span>
          <span><b>Total Sale TK:</b> {farm.cull_sale === null ? '-' : fmt(farm.cull_sale)}</span>
        </div>
      )}

      {editingFarm && (
        <FarmForm
          initial={farm}
          onCancel={() => setEditingFarm(false)}
          onSaved={() => {
            setEditingFarm(false)
            onFarmChanged()
          }}
        />
      )}

      <div className="load-bar">
        {hidden > 0 && (
          <>
            <button className="btn small alt" onClick={() => setShown(shown + 5)}>
              Load more
            </button>
            <button className="btn small alt" onClick={() => setShown(Infinity)}>
              Load All
            </button>
          </>
        )}
        {canLess && (
          <button className="btn small alt" onClick={() => setShown(3)}>
            Show less
          </button>
        )}
        <span className="count">
          Showing {visible.length} of {rows.length}
        </span>
      </div>

      <div className="tbl-wrap">
        <table className="data">
          <thead>
            <tr>
              {(readOnly ? headers.slice(0, -1) : headers).map((h, i) =>
                h === 'AGE' ? (
                  <th key={i}>
                    Age
                    <select
                      className="age-sel"
                      value={ageMode}
                      aria-label="Age format"
                      onChange={(e) => setAgeMode(e.target.value)}
                    >
                      {AGE_MODES.map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </th>
                ) : (
                  <th key={i}>{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount}>Loading...</td>
              </tr>
            )}

            {visible.map((r) =>
              draft && draft.id === r.id ? (
                draftRow
              ) : (
                <tr key={r.id}>
                  <td>{fmtDate(r.record_date)}</td>
                  <td>{formatAgeMode(farm.hatch_date, r.record_date, ageMode)}</td>
                  <td className="num">{fmt(r.mortality)}</td>
                  <td className="num">{fmt(r.totalBird)}</td>
                  
                  <td className="num">{r.body_weight !== null && r.body_weight !== undefined ? fmt(r.body_weight) : '-'}</td>
                  <td className="num" style={{ color: 'var(--muted)' }}>{getStandardWeight(r.record_date)}</td>

                  <td className="num">{fmt(r.totalEgg / 30, 2)}</td>
                  <td className="num">{fmt(r.totalEgg)}</td>
                  <td className="num">{fmt(r.eggPct, 1)}%</td>
                  <td>{r.medicine}</td>
                  <td className="num">{fmt(r.medicineCost)}</td>
                  <td>{r.vaccine}</td>
                  <td className="num">{fmt(r.vaccineCost)}</td>
                  <td className="num">{fmt(r.price_per_egg)}</td>
                  <td className="num">{fmt(r.eggPrice)}</td>
                  <td>{r.feed_item}</td>
                  <td className="num">{fmt(r.feedBag)}</td>
                  <td className="num">{fmt(r.feedKg)}</td>
                  <td className="num">{fmt(r.feedPerBirdDay, 1)}g</td>
                  <td className="num">{fmt(r.feed_price_per_bag)}</td>
                  <td className="num">{fmt(r.feedTotal)}</td>
                  <td className={`num ${tone(r.profit)}`}>{fmt(r.profit)}</td>
                  {!readOnly && (
                    <td className="actions">
                      <button
                        className="btn small alt"
                        disabled={!!draft}
                        onClick={() => setDraft(draftFromRow(r))}
                      >
                        Edit
                      </button>
                      <button className="btn small danger" onClick={() => removeRow(r)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}

            {draft && !draft.id && draftRow}

            {!readOnly && !draft && !loading && (
              <tr className="add-row">
                <td colSpan={colCount}>
                  <button
                    className="btn small yolk"
                    onClick={() => setDraft(newDraft(farm, feedItems))}
                  >
                    + Add Row
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {overEgg && (
        <p className="msg error">
          Total Egg cannot be more than Total Bird capacity ({fmt(Math.max(d.totalBird, 0))} birds × {gap} days = {fmt(maxEggs)}).
        </p>
      )}
      {error && <p className="msg error">{error}</p>}

      <div className="below-table">
        <button className="btn small" onClick={() => setShowCost(true)}>
          Cost Details
        </button>
      </div>

      {!readOnly && <VaccineLine farm={farm} records={records} vaccines={vaccines} />}

      {showCull && (
        <CullModal
          farm={farm}
          defaultTB={rows.length ? rows[rows.length - 1].totalBird : farm.total_bird}
          onClose={() => setShowCull(false)}
          onSaved={() => {
            setShowCull(false)
            onFarmChanged()
          }}
        />
      )}
      {showCost && <CostModal farm={farm} rows={rows} onClose={() => setShowCost(false)} />}
    </section>
  )
}