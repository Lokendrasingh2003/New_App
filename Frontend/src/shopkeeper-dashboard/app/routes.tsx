import { Navigate, createBrowserRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import ManageSubcategoriesPage from '../pages/ManageSubcategoriesPage'
import NotFoundPage from '../pages/NotFoundPage'
import OfferCreatePage from '../pages/OfferCreatePage'
import OfferEditPage from '../pages/OfferEditPage'
import OffersListPage from '../pages/OffersListPage'
import OrderDetailsPage from '../pages/OrderDetailsPage'
import OrdersListPage from '../pages/OrdersListPage'
import ProductCreatePage from '../pages/ProductCreatePage'
import ProductEditPage from '../pages/ProductEditPage'
import ProductsListPage from '../pages/ProductsListPage'
import QrCodePage from '../pages/QrCodePage'
import PaymentDetailsPage from '../pages/PaymentDetailsPage'
import PaymentsPage from '../pages/PaymentsPage'
import RefundDetailsPage from '../pages/RefundDetailsPage'
import RefundsPage from '../pages/RefundsPage'
import SettingsPage from '../pages/SettingsPage'
import ShopLinkPage from '../pages/ShopLinkPage'
import ShopLayout from '../layout/ShopLayout'
import ProtectedRoute from '../shared/auth/ProtectedRoute'
import { superadminRoutes } from '../../superadmin-dashboard/app/routes'
import AppErrorBoundary from '../shared/ui/AppErrorBoundary'

const withPageBoundary = (element: ReactElement) => <AppErrorBoundary level="page">{element}</AppErrorBoundary>

export const router = createBrowserRouter([
  ...superadminRoutes,
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: withPageBoundary(<LoginPage />),
  },
  {
    path: '/shop',
    element: (
      <ProtectedRoute>
        <ShopLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/shop/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withPageBoundary(<DashboardPage />),
      },
      {
        path: 'orders',
        element: withPageBoundary(<OrdersListPage />),
      },
      {
        path: 'orders/:orderId',
        element: withPageBoundary(<OrderDetailsPage />),
      },
      {
        path: 'products',
        element: withPageBoundary(<ProductsListPage />),
      },
      {
        path: 'subcategories',
        element: withPageBoundary(<ManageSubcategoriesPage />),
      },
      {
        path: 'products/new',
        element: withPageBoundary(<ProductCreatePage />),
      },
      {
        path: 'products/:productId/edit',
        element: withPageBoundary(<ProductEditPage />),
      },
      {
        path: 'offers',
        element: withPageBoundary(<OffersListPage />),
      },
      {
        path: 'offers/new',
        element: withPageBoundary(<OfferCreatePage />),
      },
      {
        path: 'offers/:offerId/edit',
        element: withPageBoundary(<OfferEditPage />),
      },
      {
        path: 'payments',
        element: withPageBoundary(<PaymentsPage />),
      },
      {
        path: 'payments/:paymentId',
        element: withPageBoundary(<PaymentDetailsPage />),
      },
      {
        path: 'refunds',
        element: withPageBoundary(<RefundsPage />),
      },
      {
        path: 'refunds/:refundId',
        element: withPageBoundary(<RefundDetailsPage />),
      },
      {
        path: 'shop-link',
        element: withPageBoundary(<ShopLinkPage />),
      },
      {
        path: 'qr',
        element: withPageBoundary(<QrCodePage />),
      },
      {
        path: 'settings',
        element: withPageBoundary(<SettingsPage />),
      },
    ],
  },
  {
    path: '*',
    element: withPageBoundary(<NotFoundPage />),
  },
])
