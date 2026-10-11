import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Home from './pages/Home'
import AddFarm from './pages/AddFarm'
import Vaccine from './pages/Vaccine'
import Feed from './pages/Feed'

const NAV = [
  ['home', 'Homepage'],
  ['addFarm', 'Add Farm'],
  ['vaccine', 'Vaccine'],
  ['feed', 'Feed Price'],
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="center-screen">Loading...</div>
  if (!session) return <Login />

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="egg" />
          My Layer 1
        </div>
        <nav className="nav">
          {NAV.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? 'active' : ''}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="user">
          <div className="user-email">{session.user.email}</div>
          <button onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      </aside>

      <main className="main">
        {page === 'home' && <Home onNavigate={setPage} />}
        {page === 'addFarm' && <AddFarm onSaved={() => setPage('home')} />}
        {page === 'vaccine' && <Vaccine />}
        {page === 'feed' && <Feed />}
      </main>
    </div>
  )
}
