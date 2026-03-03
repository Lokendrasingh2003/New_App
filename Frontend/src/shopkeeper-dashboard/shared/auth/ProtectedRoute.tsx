import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isShopkeeperLoggedIn } from './authStore'

type ProtectedRouteProps = {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!isShopkeeperLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
