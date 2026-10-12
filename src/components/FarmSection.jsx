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
  feed_bag: str(r.feed_bag),
  feed_touched: true,
  orig_feed_item: r.feed_item || '',
  feed_snapshot: num(r.feed_price_per_bag),
})

function VaccineLine({ records }) {
  const v = lastVaccine(records)
  let text = 'No vaccine given yet.'
  if (v) {
    const ago = v.daysAgo === 0 ? 'today' : v.daysAgo === 1 ? '1 day ago' : `${v.daysAgo} days ago`
    text = `${v.name}, ${ago} (${fmtDate(v.date)})`
  }
  return (
    <p className="vaccine-line">
      <b>Last vaccine:</b> {text}
    </p>
  )
}

export default function FarmSection({ farm, index, vaccines, feedItems, onFarmChanged }) {
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
  const colCount = readOnly ? 18 : 19

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

  // draft / edit row er hisab
  let d = null
  if (draft) {
    const item = feedItems.find((f) => f.name === draft.feed_item)
    const keepOld = draft.id && draft.feed_item === draft.orig_feed_item
    const feedPrice = keepOld ? draft.feed_snapshot : num(item?.price_per_bag)
    const deadBefore = records
      .filter((r) => r.id !== draft.id && r.record_date <= draft.record_date)
      .reduce((s, r) => s + num(r.mortality), 0)
    d = calcRow(
      farm,
      { ...draft, feed_price_per_bag: feedPrice },
      farm.total_bird - deadBefore - num(draft.mortality)
    )
  }
  const overEgg = d ? d.totalEgg > Math.max(d.totalBird, 0) : false

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

  // Egg Case ba Total Egg, jeta khushi dao, arekta auto hobe. Total Bird er beshi hobe na.
  function setEgg(kind, v) {
    const max = Math.max(d.totalBird, 0)
    let total = v === '' ? '' : kind === 'case' ? num(v) * 30 : num(v)
    let capped = false
    if (total !== '' && total > max) {
      total = max
      capped = true
    }
    setDraft((x) => ({
      ...x,
      total_egg:
        total === '' ? '' : kind === 'total' && !capped ? v : String(round(total, 2)),
      egg_case:
        total === '' ? '' : kind === 'case' && !capped ? v : String(round(total / 30, 2)),
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

  const tone = (p) => (p < 0 ? 'neg' : p > 0 ? 'pos' : '')

  const draftRow = d && (
    <tr className="draft" key="draft">
      <td><input type="date" value={draft.record_date} onChange={setDate} /></td>
      <td>{formatAgeMode(farm.hatch_date, draft.record_date, ageMode)}</td>
      <td><input type="number" min="0" value={draft.mortality} onChange={set('mortality')} /></td>
      <td className="num">{fmt(d.totalBird)}</td>
      <td><input type="number" min="0" step="any" value={draft.egg_case} onChange={(e) => setEgg('case', e.target.value)} /></td>
      <td><input type="number" min="0" max={Math.max(d.totalBird, 0)} step="any" value={draft.total_egg} onChange={(e) => setEgg('total', e.target.value)} /></td>
      <td className="num">{fmt(d.eggPct, 1)}%</td>
      <td><input value={draft.medicine} onChange={set('medicine')} /></td>
      <td><input type="number" min="0" step="any" value={draft.medicine_cost} onChange={set('medicine_cost')} /></td>
      <td>
        <input list={`vac-${farm.id}`} value={draft.vaccine} onChange={set('vaccine')} />
        <datalist id={`vac-${farm.id}`}>
          {vaccines.map((v) => (
            <option key={v.id} value={v.name} />
          ))}
        </datalist>
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
      <td><input type="number" min="0" step="any" value={draft.feed_bag} onChange={set('feed_bag')} /></td>
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
    'Feed Price/bag',
    'Total Feed Price',
    'Profit',
    '',
  ]

  return (
    <section className="farm" style={{ '--accent': accent, '--soft': soft }}>
      <div className="farm-head">
        <h2>Farm Name: {farm.name}</h2>
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
                  <td className="num">{fmt(r.feed_bag)}</td>
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
          Total Egg cannot be more than Total Bird ({fmt(Math.max(d.totalBird, 0))}).
        </p>
      )}
      {error && <p className="msg error">{error}</p>}

      <div className="below-table">
        <button className="btn small" onClick={() => setShowCost(true)}>
          Cost Details
        </button>
      </div>

      {!readOnly && <VaccineLine records={records} />}

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
