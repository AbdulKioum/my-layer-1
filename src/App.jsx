import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Home from './pages/Home'
import AddFarm from './pages/AddFarm'
import Vaccine from './pages/Vaccine'
import Feed from './pages/Feed'

const Icon = ({ children }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

const ICONS = {
  home: (
    <Icon>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Icon>
  ),
  addFarm: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Icon>
  ),
  vaccine: (
    <Icon>
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </Icon>
  ),
  feed: (
    <Icon>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </Icon>
  ),
  culled: (
    <Icon>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10h14V9M10 13h4" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  logout: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </Icon>
  ),
}

const NAV = [
  ['home', 'Homepage'],
  ['addFarm', 'Add Farm'],
  ['culled', 'Culled Farm'],
  ['vaccine', 'Vaccine'],
  ['feed', 'Feed Price'],
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('home')
  const [expanded, setExpanded] = useState(false)
  const [allowed, setAllowed] = useState(null)
  const [blocked, setBlocked] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Email allowed list e na thakle ber kore dibe
  useEffect(() => {
    if (!session) {
      setAllowed(null)
      setProfile(null)
      return
    }
    supabase.rpc('is_allowed').then(({ data, error }) => {
      if (!error && data === false) {
        setBlocked(true)
        setAllowed(false)
        supabase.auth.signOut()
      } else {
        setBlocked(false)
        setAllowed(true)
        supabase.rpc('my_profile').then(({ data }) => setProfile(data?.[0] || null))
      }
    })
  }, [session])

  if (session === undefined) return <div className="center-screen">Loading...</div>
  if (!session) return <Login blocked={blocked} />
  if (allowed !== true) return <div className="center-screen">Loading...</div>

  // Homepage e sidebar shudhu icon, click korle puro dekhabe
  const collapsed = page === 'home' && !expanded

  function go(key) {
    setPage(key)
    setExpanded(false)
  }

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`}>
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        onClick={() => collapsed && setExpanded(true)}
      >
        <div className="side-top">
          {page === 'home' && (
            <button
              className="toggle"
              title={collapsed ? 'Open menu' : 'Close menu'}
              aria-label={collapsed ? 'Open menu' : 'Close menu'}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
            >
              {ICONS.menu}
            </button>
          )}
          <div className="brand">
            <span className="egg" />
            <span className="label">My Layer</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(([key, label]) => (
            <button
              key={key}
              title={label}
              className={page === key ? 'active' : ''}
              onClick={(e) => {
                e.stopPropagation()
                go(key)
              }}
            >
              {ICONS[key]}
              <span className="label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="user">
          {profile?.name && <div className="user-name">{profile.name}</div>}
          <div className="user-email">{session.user.email}</div>
          <button
            title="Log out"
            onClick={(e) => {
              e.stopPropagation()
              supabase.auth.signOut()
            }}
          >
            {ICONS.logout}
            <span className="label">Log out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        {page === 'home' && <Home onNavigate={go} profile={profile} />}
        {page === 'culled' && <Home culled onNavigate={go} />}
        {page === 'addFarm' && <AddFarm onSaved={() => go('home')} />}
        {page === 'vaccine' && <Vaccine />}
        {page === 'feed' && <Feed />}
      </main>
    </div>
  )
}
