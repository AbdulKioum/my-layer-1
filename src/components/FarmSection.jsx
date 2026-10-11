import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  computeRows,
  calcRow,
  todayStr,
  formatAge,
  fmtDate,
  fmt,
  num,
  vaccineInfo,
} from '../utils'

const newDraft = () => ({
  record_date: todayStr(),
  mortality: '',
  egg_case: '',
  medicine: '',
  vaccine: '',
  price_per_egg: '',
  feed_item: '',
  feed_bag: '',
})

const COLS = [
  'Date',
  'Age',
  'Mortality',
  'Total Bird',
  'Egg Case',
  'Total Egg',
  'Egg %',
  'Medicine',
  'Vaccine',
  'Price/egg',
  'Total Egg Price',
  'Feed Item',
  'Feed Bag',
  'Feed Price/bag',
  'Total Feed Price',
  'Profit',
  '',
]

function Comment({ farm, records, vaccines }) {
  const info = vaccineInfo(farm, records, vaccines)
  const notes = []

  if (info.empty) {
    notes.push({ tone: 'info', text: 'Vaccine list is empty. Add vaccines from the Vaccine page.' })
  } else {
    const names = (list) => list.map((v) => v.name).join(', ')
    if (info.dueToday.length)
      notes.push({ tone: 'warn', text: `Vaccine due today (${formatAge(info.ageToday)}): ${names(info.dueToday)}` })
    if (info.overdue.length)
      notes.push({ tone: 'warn', text: `Not given yet: ${names(info.overdue)}` })
    if (info.upcoming.length)
      notes.push({
        tone: 'info',
        text: `Coming soon: ${info.upcoming
          .map((v) => `${v.name} (in ${v.age_days - info.ageToday} days)`)
          .join(', ')}`,
      })
    if (info.live) {
      if (info.live.due)
        notes.push({
          tone: 'warn',
          text: `Vaccine list is finished and ${info.live.since} days have passed since the last vaccine. Give a live vaccine now.`,
        })
      else
        notes.push({
          tone: 'info',
          text: `Next live vaccine in ${info.live.nextIn} days.`,
        })
    }
    if (!notes.length) notes.push({ tone: 'ok', text: 'No vaccine needed today.' })
  }

  return (
    <div className="comment">
      <h3>Comment:</h3>
      {notes.map((n, i) => (
        <div key={i} className={`note ${n.tone}`}>
          {n.text}
        </div>
      ))}
    </div>
  )
}

export default function FarmSection({ farm, vaccines, feedItems }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [shown, setShown] = useState(3)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  // draft row er hisab
  let d = null
  if (draft) {
    const feedPrice = num(feedItems.find((f) => f.name === draft.feed_item)?.price_per_bag)
    const deadBefore = records
      .filter((r) => r.record_date <= draft.record_date)
      .reduce((s, r) => s + num(r.mortality), 0)
    d = calcRow(
      farm,
      { ...draft, feed_price_per_bag: feedPrice },
      farm.total_bird - deadBefore - num(draft.mortality)
    )
  }

  const set = (k) => (e) => setDraft((x) => ({ ...x, [k]: e.target.value }))

  async function save() {
    if (!draft.record_date) return setError('Date is required.')
    setSaving(true)
    setError('')
    const { error } = await supabase.from('farm_records').insert({
      farm_id: farm.id,
      record_date: draft.record_date,
      mortality: num(draft.mortality),
      egg_case: num(draft.egg_case),
      medicine: draft.medicine.trim(),
      vaccine: draft.vaccine.trim(),
      price_per_egg: num(draft.price_per_egg),
      feed_item: draft.feed_item,
      feed_bag: num(draft.feed_bag),
      feed_price_per_bag: d.feed_price_per_bag,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setDraft(null)
    load()
  }

  const profitClass = (p) => (p < 0 ? 'neg' : p > 0 ? 'pos' : '')

  return (
    <section className="farm">
      <div className="farm-head">
        <h2> {farm.name}</h2>
        <div className="meta">
          <span><b>Hatch Date:</b> {fmtDate(farm.hatch_date)}</span>
          <span><b>Hatchery:</b> {farm.hatchery || '-'}</span>
          <span><b>Breed:</b> {farm.breed || '-'}</span>
        </div>
      </div>

      <div className="load-bar">
        {hidden > 0 && (
          <>
            <button className="btn small alt" onClick={() => setShown(shown + 5)}>
              Load more
            </button>
            <button className="btn small alt" onClick={() => setShown(rows.length)}>
              Load All
            </button>
          </>
        )}
        <span className="count">
          Showing {visible.length} of {rows.length}
        </span>
      </div>

      <div className="tbl-wrap">
        <table className="data">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLS.length}>Loading...</td>
              </tr>
            )}

            {visible.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.record_date)}</td>
                <td>{formatAge(r.ageDays)}</td>
                <td className="num">{fmt(r.mortality)}</td>
                <td className="num">{fmt(r.totalBird)}</td>
                <td className="num">{fmt(r.egg_case)}</td>
                <td className="num">{fmt(r.totalEgg)}</td>
                <td className="num">{fmt(r.eggPct, 1)}%</td>
                <td>{r.medicine}</td>
                <td>{r.vaccine}</td>
                <td className="num">{fmt(r.price_per_egg)}</td>
                <td className="num">{fmt(r.eggPrice)}</td>
                <td>{r.feed_item}</td>
                <td className="num">{fmt(r.feed_bag)}</td>
                <td className="num">{fmt(r.feed_price_per_bag)}</td>
                <td className="num">{fmt(r.feedTotal)}</td>
                <td className={`num ${profitClass(r.profit)}`}>{fmt(r.profit)}</td>
                <td></td>
              </tr>
            ))}

            {draft && d && (
              <tr className="draft">
                <td><input type="date" value={draft.record_date} onChange={set('record_date')} /></td>
                <td>{formatAge(d.ageDays)}</td>
                <td><input type="number" min="0" value={draft.mortality} onChange={set('mortality')} /></td>
                <td className="num">{fmt(d.totalBird)}</td>
                <td><input type="number" min="0" step="any" value={draft.egg_case} onChange={set('egg_case')} /></td>
                <td className="num">{fmt(d.totalEgg)}</td>
                <td className="num">{fmt(d.eggPct, 1)}%</td>
                <td><input value={draft.medicine} onChange={set('medicine')} /></td>
                <td>
                  <input list={`vac-${farm.id}`} value={draft.vaccine} onChange={set('vaccine')} />
                  <datalist id={`vac-${farm.id}`}>
                    {vaccines.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </td>
                <td><input type="number" min="0" step="any" value={draft.price_per_egg} onChange={set('price_per_egg')} /></td>
                <td className="num">{fmt(d.eggPrice)}</td>
                <td>
                  <select value={draft.feed_item} onChange={set('feed_item')}>
                    <option value="">{feedItems.length ? 'Select' : 'No feed added'}</option>
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
                <td className={`num ${profitClass(d.profit)}`}>{fmt(d.profit)}</td>
                <td className="actions">
                  <button className="btn small" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn small alt" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                </td>
              </tr>
            )}

            {!draft && !loading && (
              <tr>
                <td colSpan={COLS.length} className="add-cell">
                  <button className="btn small yolk" onClick={() => setDraft(newDraft())}>
                    + Add Row
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="msg error">{error}</p>}

      <Comment farm={farm} records={records} vaccines={vaccines} />
    </section>
  )
}
