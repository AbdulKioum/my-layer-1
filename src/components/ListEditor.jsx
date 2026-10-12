import React, { useEffect, useState, useMemo } from 'react'
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
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', minWidth: '120px' }}>
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
      style={{ width: '100%', minWidth: '80px' }}
    />
  )
}

export default function ListEditor({ title, hint, table, fields, orderCol, empty, readOnly, groupBy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blank(fields))
  const [dirty, setDirty] = useState({})
  
  const [activeTab, setActiveTab] = useState('')

  const groupField = fields.find((f) => f.key === groupBy)
  const tabOptions = groupField?.options || []

  useEffect(() => {
    if (groupBy && tabOptions.length > 0 && !activeTab) {
      setActiveTab(tabOptions[0])
      setForm((prev) => ({ ...prev, [groupBy]: tabOptions[0] }))
    }
  }, [groupBy, tabOptions, activeTab])

  async function load() {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true })
    if (error) setError(error.message)
    else setRows(data || [])
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
    
    const newForm = blank(fields)
    if (groupBy) newForm[groupBy] = activeTab
    setForm(newForm)
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

  const rowsToShow = groupBy ? rows.filter((r) => r[groupBy] === activeTab) : rows
  const colSpan = readOnly ? fields.length : fields.length + 1

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .tabs-container {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          overflow-x: auto;
          border-bottom: 2px solid var(--pine);
          padding-bottom: 0;
        }
        .tab-btn {
          padding: 10px 20px;
          background: #eef4f0;
          border: 1px solid var(--line);
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-weight: 600;
          color: var(--muted);
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: #d1e2d9;
        }
        .tab-btn.active {
          background: var(--pine);
          color: #ffffff;
          border-color: var(--pine);
        }
        .custom-table-wrap {
          border-radius: ${groupBy ? '0 0 10px 10px' : '10px'};
          max-height: calc(100vh - 40px);
          overflow: auto;
          box-shadow: 0 4px 16px rgba(30, 59, 49, 0.08);
          border: 1px solid var(--grid);
          border-top: ${groupBy ? 'none' : '1px solid var(--grid)'};
          background: #fff;
          width: 100%;
          margin-top: ${groupBy ? '0' : '20px'};
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          table-layout: auto;
        }
        .custom-table th {
         background-color: var(--pine);
          color: #ffffff;
          font-weight: 600;
          padding: 12px 10px;
          text-align: left;
          border: none;
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: normal;
          line-height: 1.2;
          box-shadow: 0 1px 0 var(--grid);
        }
        .custom-table td {
          padding: 10px;
          border: none;
          border-bottom: 1px solid var(--line);
          vertical-align: middle;
          color: var(--ink);
          white-space: normal;
          word-break: break-word;
        }
        .custom-table tbody tr:last-child td {
          border-bottom: none;
        }
        .custom-table tbody tr:nth-child(odd) td {
          background-color: #ffffff;
        }
        .custom-table tbody tr:nth-child(even) td {
          background-color: #f6f9f7;
        }
        .custom-table tbody tr:hover td {
          background-color: #eaf0ec;
        }
        .custom-table td.empty-msg {
          text-align: center;
          padding: 40px;
          color: var(--muted);
          font-style: italic;
          background: #ffffff !important;
        }
        .custom-table td.actions {
          white-space: nowrap;
          text-align: right;
        }
        .custom-table td.actions .btn {
          margin-left: 8px;
        }
      `}</style>

      <h1>{title}</h1>
      <p className="hint">{hint}</p>

      {!readOnly && (
        <form 
          className="card inline-form" 
          style={{ borderTop: '4px solid var(--yolk)', maxWidth: '100%' }} 
          onSubmit={add}
        >
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
          <button className="btn">Add New</button>
        </form>
      )}

      {error && <p className="msg error">{error}</p>}

      {/* Tabs / Switcher */}
      {groupBy && tabOptions.length > 0 && (
        <div className="tabs-container">
          {tabOptions.map((opt) => (
            <button
              key={opt}
              className={`tab-btn ${activeTab === opt ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(opt)
                if (!readOnly) setForm({ ...form, [groupBy]: opt })
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div className="custom-table-wrap">
        <table className="custom-table">
          <thead>
            <tr>
              {fields.filter(f => f.key !== groupBy).map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              {!readOnly && <th style={{ textAlign: 'right', minWidth: '140px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colSpan} className="empty-msg">Loading data...</td>
              </tr>
            )}
            {!loading && !rowsToShow.length && (
              <tr>
                <td colSpan={colSpan} className="empty-msg">
                  {empty}
                </td>
              </tr>
            )}
            {!loading && rowsToShow.map((r) => (
              <tr key={r.id}>
                {fields.filter(f => f.key !== groupBy).map((f) => (
                  <td key={f.key}>
                    {readOnly ? (
                      r[f.key] !== null && r[f.key] !== undefined && r[f.key] !== '' ? String(r[f.key]) : '-'
                    ) : (
                      <FieldInput
                        f={f}
                        value={r[f.key]}
                        onChange={(v) => edit(r.id, f.key, v)}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="actions">
                    {dirty[r.id] && (
                      <button className="btn small yolk" onClick={() => saveRow(r)}>
                        Save
                      </button>
                    )}
                    <button className="btn small danger" onClick={() => remove(r)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}