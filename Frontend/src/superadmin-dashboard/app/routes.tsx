import { Navigate } from 'react-router-dom'
import SuperAdminApp from '../SuperAdminApp'
import SuperAdminProtectedRoute from '../auth/SuperAdminProtectedRoute'
import SuperAdminLayout from '../layout/SuperAdminLayout'
import AuditLogPage from '../pages/AuditLogPage'
import CategoriesPage from '../pages/CategoriesPage'
import CategoryDetailsPage from '../pages/CategoryDetailsPage'
import CitiesPage from '../pages/CitiesPage'
import CommissionPage from '../pages/CommissionPage.tsx'
import ConfigPage from '../pages/ConfigPage'
import CouponsPage from '../pages/CouponsPage.tsx'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import OrdersPage from '../pages/OrdersPage'
import PaymentsPage from '../pages/PaymentsPage.tsx'
import PayoutsPage from '../pages/PayoutsPage.tsx'
import RefundsPage from '../pages/RefundsPage.tsx'
import SettingsPage from '../pages/SettingsPage'
import ShopsPage from '../pages/ShopsPage'
import ShopSubscriptionsPage from '../pages/ShopSubscriptionsPage'
import SubscriptionPlansPage from '../pages/SubscriptionPlansPage'

export const superadminRoutes = [
  {
    path: '/superadmin',
    element: <SuperAdminApp />,
    children: [
      {
        index: true,
        element: <Navigate to="/superadmin/login" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        element: (
          <SuperAdminProtectedRoute>
            <SuperAdminLayout />
          </SuperAdminProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'cities',
            element: <CitiesPage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'categories/:slug',
            element: <CategoryDetailsPage />,
          },
          {
            path: 'shops',
            element: <ShopsPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'payments',
            element: <PaymentsPage />,
          },
          {
            path: 'payouts',
            element: <PayoutsPage />,
          },
          {
            path: 'refunds',
            element: <RefundsPage />,
          },
          {
            path: 'coupons',
            element: <CouponsPage />,
          },
          {
            path: 'audit',
            element: <AuditLogPage />,
          },
          {
            path: 'subscriptions/plans',
            element: <SubscriptionPlansPage />,
          },
          {
            path: 'subscriptions/shops',
            element: <ShopSubscriptionsPage />,
          },
          {
            path: 'config',
            element: <ConfigPage />,
          },
          {
            path: 'commission',
            element: <CommissionPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]
