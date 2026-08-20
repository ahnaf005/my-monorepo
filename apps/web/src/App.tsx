import { useEffect, useState } from 'react'
import type { User } from '@myapp/shared'
import { getProfile } from './api'
import { LoginForm } from './components/LoginForm'
import { Profile } from './components/Profile'
import { Search } from './components/Search'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkedSession, setCheckedSession] = useState(false)

  // On load, ask the API if the httpOnly cookie from a previous login is
  // still valid — the frontend never persists the user/token itself.
  useEffect(() => {
    getProfile()
      .then((res) => setUser(res.user))
      .catch(() => {})
      .finally(() => setCheckedSession(true))
  }, [])

  if (!checkedSession) return null

  return (
    <main id="app">
      <h1>TypeScript security demo</h1>
      {user ? (
        <>
          <Profile user={user} />
          <Search />
        </>
      ) : (
        <LoginForm onLoggedIn={setUser} />
      )}
    </main>
  )
}

export default App
