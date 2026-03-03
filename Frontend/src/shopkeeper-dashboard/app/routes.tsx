import { Navigate, createBrowserRouter } from 'react-router-dom'
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
import SettingsPage from '../pages/SettingsPage'
import ShopLinkPage from '../pages/ShopLinkPage'
import ShopLayout from '../layout/ShopLayout'
import ProtectedRoute from '../shared/auth/ProtectedRoute'
import { superadminRoutes } from '../../superadmin-dashboard/app/routes'

export const router = createBrowserRouter([
  ...superadminRoutes,
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
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
        element: <DashboardPage />,
      },
      {
        path: 'orders',
        element: <OrdersListPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailsPage />,
      },
      {
        path: 'products',
        element: <ProductsListPage />,
      },
      {
        path: 'subcategories',
        element: <ManageSubcategoriesPage />,
      },
      {
        path: 'products/new',
        element: <ProductCreatePage />,
      },
      {
        path: 'products/:productId/edit',
        element: <ProductEditPage />,
      },
      {
        path: 'offers',
        element: <OffersListPage />,
      },
      {
        path: 'offers/new',
        element: <OfferCreatePage />,
      },
      {
        path: 'offers/:offerId/edit',
        element: <OfferEditPage />,
      },
      {
        path: 'shop-link',
        element: <ShopLinkPage />,
      },
      {
        path: 'qr',
        element: <QrCodePage />,
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
])
