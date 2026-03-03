import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isLoggedIn } from './authStore'

type ProtectedRouteProps = {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
