import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const blank = (fields) => Object.fromEntries(fields.map((f) => [f.key, '']))
const valid = (fields, o) =>
  fields.every((f) => !f.required || String(o[f.key] ?? '').trim() !== '')
const clean = (fields, o) => {
  const out = {}
  for (const f of fields) {
    out[f.key] = f.type === 'number' ? Number(o[f.key]) : String(o[f.key] ?? '').trim()
  }
  return out
}

function FieldInput({ f, value, onChange }) {
  if (f.type === 'select') {
    const opts = f.options.includes(value) || !value ? f.options : [value, ...f.options]
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      type={f.type}
      min={f.type === 'number' ? 0 : undefined}
      step={f.type === 'number' ? 'any' : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default function ListEditor({ title, hint, table, fields, orderCol, empty }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blank(fields))
  const [dirty, setDirty] = useState({})

  async function load() {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true })
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [table])

  async function add(e) {
    e.preventDefault()
    setError('')
    if (!valid(fields, form)) return setError('Fill in the required fields.')
    const { error } = await supabase.from(table).insert(clean(fields, form))
    if (error) return setError(error.message)
    setForm(blank(fields))
    load()
  }

  function edit(id, key, value) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
    setDirty((d) => ({ ...d, [id]: true }))
  }

  async function saveRow(row) {
    setError('')
    if (!valid(fields, row)) return setError('Fill in the required fields.')
    const { error } = await supabase.from(table).update(clean(fields, row)).eq('id', row.id)
    if (error) return setError(error.message)
    setDirty((d) => ({ ...d, [row.id]: false }))
    load()
  }

  async function remove(row) {
    if (!window.confirm('Delete this item?')) return
    const { error } = await supabase.from(table).delete().eq('id', row.id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div>
      <h1>{title}</h1>
      <p className="hint">{hint}</p>

      <form className="card inline-form" onSubmit={add}>
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <FieldInput
              f={f}
              value={form[f.key]}
              onChange={(v) => setForm({ ...form, [f.key]: v })}
            />
          </div>
        ))}
        <button className="btn">Add</button>
      </form>

      {error && <p className="msg error">{error}</p>}

      <div className="tbl-wrap list">
        <table>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={fields.length + 1}>Loading...</td>
              </tr>
            )}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={fields.length + 1} className="empty">
                  {empty}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                {fields.map((f) => (
                  <td key={f.key}>
                    <FieldInput
                      f={f}
                      value={r[f.key]}
                      onChange={(v) => edit(r.id, f.key, v)}
                    />
                  </td>
                ))}
                <td className="actions">
                  {dirty[r.id] && (
                    <button className="btn small" onClick={() => saveRow(r)}>
                      Save
                    </button>
                  )}
                  <button className="btn small alt" onClick={() => remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
