import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayStr } from '../utils'

export default function AddFarm({ onSaved }) {
  const [f, setF] = useState({
    name: '',
    hatch_date: todayStr(),
    total_bird: '',
    hatchery: '',
    breed: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.from('farms').insert({
      name: f.name.trim(),
      hatch_date: f.hatch_date,
      total_bird: Number(f.total_bird),
      hatchery: f.hatchery.trim(),
      breed: f.breed.trim(),
    })
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div>
      <h1>Add Farm</h1>
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
          <input value={f.hatchery} onChange={set('hatchery')} />
        </div>
        <div className="field">
          <label>Breed</label>
          <input value={f.breed} onChange={set('breed')} />
        </div>
        {error && <p className="msg error">{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? 'Saving...' : 'Save Farm'}
        </button>
      </form>
    </div>
  )
}
