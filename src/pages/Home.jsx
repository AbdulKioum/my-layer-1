import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import FarmSection from '../components/FarmSection'

function Banner({ profile }) {
  if (!profile || (!profile.name && !profile.address)) return null
  return (
    <div className="profile-bar">
      <h1 className="profile-name">{profile.name}</h1>
      {profile.address && (
        <div className="profile-address">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>{profile.address}</span>
        </div>
      )}
    </div>
  )
}

export default function Home({ onNavigate, culled = false, profile }) {
  const [s, setS] = useState({ loading: true, farms: [], vaccines: [], feed: [], layerStandards: [], error: '' })
  const [selected, setSelected] = useState('all')

  async function load() {
    let fq = supabase.from('farms').select('*')
    fq = culled
      ? fq.not('culled_at', 'is', null).order('culled_at', { ascending: false })
      : fq.is('culled_at', null).order('created_at', { ascending: true })

    const [f, v, fd, ls] = await Promise.all([
      fq,
      supabase.from('vaccines').select('*').order('age_days', { ascending: true }),
      supabase.from('feed_items').select('*').order('name', { ascending: true }),
      supabase.from('layer_standards').select('*') 
    ])
    const err = f.error || v.error || fd.error || ls.error
    setS({
      loading: false,
      farms: f.data || [],
      vaccines: v.data || [],
      feed: fd.data || [],
      layerStandards: ls.data || [],
      error: err ? err.message : '',
    })
  }

  useEffect(() => {
    load()
  }, [culled])

  const banner = culled ? null : <Banner profile={profile} />

  if (s.loading) return <div>{banner}<p>Loading...</p></div>
  if (s.error) return <div>{banner}<p className="msg error">{s.error}</p></div>

  if (!s.farms.length)
    return (
      <div>
        {banner}
        {culled ? (
          <div className="card">
            <p>No culled farm yet.</p>
          </div>
        ) : (
          <div className="card">
            <p>No farm yet. Add your first farm to start the record.</p>
            <button className="btn" onClick={() => onNavigate('addFarm')}>
              Add Farm
            </button>
          </div>
        )}
      </div>
    )

  const current = s.farms.some((f) => f.id === selected) ? selected : 'all'
  const list = s.farms
    .map((farm, index) => ({ farm, index }))
    .filter(({ farm }) => current === 'all' || farm.id === current)

  return (
    <div>
      {banner}
      {culled && <h1>Culled Farm</h1>}
      <div className="toolbar">
        <label htmlFor="farm-filter">Farm:</label>
        <select id="farm-filter" value={current} onChange={(e) => setSelected(e.target.value)}>
          <option value="all">All Farms</option>
          {s.farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {list.map(({ farm, index }) => (
        <FarmSection
          key={farm.id}
          farm={farm}
          index={index}
          vaccines={s.vaccines}
          feedItems={s.feed}
          layerStandards={s.layerStandards} 
          onFarmChanged={load}
        />
      ))}
    </div>
  )
}