import { Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { isLoggedIn } from './authStore'

type SuperAdminProtectedRouteProps = {
  children: ReactElement
}

const SuperAdminProtectedRoute = ({ children }: SuperAdminProtectedRouteProps) => {
  const location = useLocation()

  if (!isLoggedIn()) {
    return <Navigate to="/superadmin/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default SuperAdminProtectedRoute
