import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import FarmSection from '../components/FarmSection'

export default function Home({ onNavigate }) {
  const [s, setS] = useState({ loading: true, farms: [], vaccines: [], feed: [], error: '' })

  useEffect(() => {
    ;(async () => {
      const [f, v, fd] = await Promise.all([
        supabase.from('farms').select('*').order('created_at', { ascending: true }),
        supabase.from('vaccines').select('*').order('age_days', { ascending: true }),
        supabase.from('feed_items').select('*').order('name', { ascending: true }),
      ])
      const err = f.error || v.error || fd.error
      setS({
        loading: false,
        farms: f.data || [],
        vaccines: v.data || [],
        feed: fd.data || [],
        error: err ? err.message : '',
      })
    })()
  }, [])

  if (s.loading) return <p>Loading...</p>
  if (s.error) return <p className="msg error">{s.error}</p>

  if (!s.farms.length)
    return (
      <div className="card">
        <p>No farm yet. Add your first farm to start the record.</p>
        <button className="btn" onClick={() => onNavigate('addFarm')}>
          Add Farm
        </button>
      </div>
    )

  return (
    <div>
      {s.farms.map((farm) => (
        <FarmSection key={farm.id} farm={farm} vaccines={s.vaccines} feedItems={s.feed} />
      ))}
    </div>
  )
}
