import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isShopkeeperLoggedIn } from './authStore'
import PageLoader from '../ui/PageLoader'

type ProtectedRouteProps = {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsCheckingAuth(false), 120)
    return () => window.clearTimeout(timer)
  }, [])

  if (isCheckingAuth) {
    return <PageLoader message="Checking session..." />
  }

  if (!isShopkeeperLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
