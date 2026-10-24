import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../config/api'
import { AccountContext } from './account'

// The signed-in user's Clearcut account: credits, usage stats and engine info from GET /api/me
export const AccountProvider = ({ children }) => {
  const [me, setMe] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/me')
      setMe(data)
      setError(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not load your account'))
    }
  }, [])

  useEffect(() => {
    // Loads the account once on mount; state is only set after the request resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  // Endpoints return the new balance after spending or buying credits
  const setCredits = useCallback((credits) => {
    if (typeof credits !== 'number') return
    setMe((m) => (m ? { ...m, user: { ...m.user, credits } } : m))
  }, [])

  return (
    <AccountContext.Provider value={{ me, credits: me?.user.credits ?? null, isDemo: Boolean(me?.demo), error, refresh, setCredits }}>
      {children}
    </AccountContext.Provider>
  )
}
