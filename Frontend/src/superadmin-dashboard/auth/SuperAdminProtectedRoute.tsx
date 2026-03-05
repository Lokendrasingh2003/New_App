import { Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { isLoggedIn, restoreSession } from './authStore'

type SuperAdminProtectedRouteProps = {
  children: ReactElement
}

const SuperAdminProtectedRoute = ({ children }: SuperAdminProtectedRouteProps) => {
  const location = useLocation()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    const verify = async () => {
      if (!isLoggedIn()) {
        if (mounted) {
          setAllowed(false)
        }
        return
      }

      const ok = await restoreSession()
      if (mounted) {
        setAllowed(ok)
      }
    }

    void verify()

    return () => {
      mounted = false
    }
  }, [])

  if (allowed === null) {
    return null
  }

  if (!allowed) {
    return <Navigate to="/superadmin/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default SuperAdminProtectedRoute
