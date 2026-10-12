import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { todayStr } from '../utils'

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export default function CullModal({ farm, defaultTB, onClose, onSaved }) {
  const editing = !!farm.culled_at
  const [f, setF] = useState({
    culled_at: farm.culled_at || todayStr(),
    cull_reason: farm.cull_reason || '',
    cull_tb: farm.cull_tb ?? defaultTB ?? '',
    cull_weight: farm.cull_weight ?? '',
    cull_sale: farm.cull_sale ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase
      .from('farms')
      .update({
        culled_at: f.culled_at,
        cull_reason: f.cull_reason.trim(),
        cull_tb: numOrNull(f.cull_tb),
        cull_weight: numOrNull(f.cull_weight),
        cull_sale: numOrNull(f.cull_sale),
      })
      .eq('id', farm.id)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form
        className="modal small"
        role="dialog"
        aria-modal="true"
        aria-label="Cull"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal-head">
          <h2>{editing ? 'Edit Cull Info' : 'Cull'}: {farm.name}</h2>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" required value={f.culled_at} onChange={set('culled_at')} />
        </div>
        <div className="field">
          <label>Reason</label>
          <input value={f.cull_reason} onChange={set('cull_reason')} />
        </div>
        <div className="field">
          <label>T.B</label>
          <input type="number" min="0" value={f.cull_tb} onChange={set('cull_tb')} />
        </div>
        <div className="field">
          <label>Total Weight</label>
          <input type="number" min="0" step="any" value={f.cull_weight} onChange={set('cull_weight')} />
        </div>
        <div className="field">
          <label>Total Sale TK</label>
          <input type="number" min="0" step="any" value={f.cull_sale} onChange={set('cull_sale')} />
        </div>
        {error && <p className="msg error">{error}</p>}
        <div className="btn-row">
          <button className="btn" disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save' : 'Cull'}
          </button>
          <button type="button" className="btn alt" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
