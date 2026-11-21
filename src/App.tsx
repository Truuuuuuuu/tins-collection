import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminGuard from './components/AdminGuard'
import Footer from './components/Footer'
import Header from './components/Header'
import SetupNotice from './components/SetupNotice'
import { isConfigured } from './lib/supabase'
import Cart from './pages/Cart'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'

// Admin code (and the image compressor) only loads for the admin.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Login = lazy(() => import('./pages/admin/Login'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm'))

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">
        {!isConfigured ? (
          <SetupNotice />
        ) : (
          <Suspense fallback={<p className="py-20 text-center text-muted">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
            <Route path="/admin/new" element={<AdminGuard><ProductForm /></AdminGuard>} />
            <Route path="/admin/edit/:id" element={<AdminGuard><ProductForm /></AdminGuard>} />
            <Route path="*" element={<p className="py-20 text-center text-muted">Page not found.</p>} />
          </Routes>
          </Suspense>
        )}
      </main>
      <Footer />
    </div>
  )
}
