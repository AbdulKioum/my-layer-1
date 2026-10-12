import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayStr } from '../utils'
import { HATCHERIES, BREEDS } from '../constants'

function Options({ list, current }) {
  const l = current && !list.includes(current) ? [current, ...list] : list
  return l.map((o) => (
    <option key={o} value={o}>
      {o}
    </option>
  ))
}

export default function FarmForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    hatch_date: initial?.hatch_date ?? todayStr(),
    total_bird: initial?.total_bird ?? '',
    hatchery: initial?.hatchery ?? '',
    breed: initial?.breed ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      name: f.name.trim(),
      hatch_date: f.hatch_date,
      total_bird: Number(f.total_bird),
      hatchery: f.hatchery,
      breed: f.breed,
    }
    const q = initial?.id
      ? supabase.from('farms').update(payload).eq('id', initial.id)
      : supabase.from('farms').insert(payload)
    const { error } = await q
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label>Farm Name</label>
        <input required value={f.name} onChange={set('name')} />
      </div>
      <div className="field">
        <label>Hatch Date</label>
        <input type="date" required value={f.hatch_date} onChange={set('hatch_date')} />
      </div>
      <div className="field">
        <label>Total Bird</label>
        <input type="number" min="0" required value={f.total_bird} onChange={set('total_bird')} />
      </div>
      <div className="field">
        <label>Hatchery</label>
        <select value={f.hatchery} onChange={set('hatchery')}>
          <option value="">Select</option>
          <Options list={HATCHERIES} current={f.hatchery} />
        </select>
      </div>
      <div className="field">
        <label>Breed</label>
        <select value={f.breed} onChange={set('breed')}>
          <option value="">Select</option>
          <Options list={BREEDS} current={f.breed} />
        </select>
      </div>
      {error && <p className="msg error">{error}</p>}
      <div className="btn-row">
        <button className="btn" disabled={busy}>
          {busy ? 'Saving...' : initial?.id ? 'Update Farm' : 'Save Farm'}
        </button>
        {onCancel && (
          <button type="button" className="btn alt" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
