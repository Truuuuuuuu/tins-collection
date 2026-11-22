import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminGuard from './components/AdminGuard'
import AdminNav from './components/AdminNav'
import Footer from './components/Footer'
import Header from './components/Header'
import ScrollToTop from './components/ScrollToTop'
import SetupNotice from './components/SetupNotice'
import { PageSkeleton } from './components/Skeletons'
import SplashIntro from './components/SplashIntro'
import { isConfigured } from './lib/supabase'
import Cart from './pages/Cart'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'

// Admin code (and the image compressor) only loads for the admin.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Login = lazy(() => import('./pages/admin/Login'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm'))
const Sales = lazy(() => import('./pages/admin/Sales'))
const Trash = lazy(() => import('./pages/admin/Trash'))

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SplashIntro />
      <ScrollToTop />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6">
        {!isConfigured ? (
          <SetupNotice />
        ) : (
          <>
          {/* Lives outside the routes so its sliding tab pill survives page changes. */}
          <AdminNav />
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
            <Route path="/admin/new" element={<AdminGuard><ProductForm /></AdminGuard>} />
            <Route path="/admin/edit/:id" element={<AdminGuard><ProductForm /></AdminGuard>} />
            <Route path="/admin/sales" element={<AdminGuard><Sales /></AdminGuard>} />
            <Route path="/admin/trash" element={<AdminGuard><Trash /></AdminGuard>} />
            <Route path="*" element={<p className="py-20 text-center text-muted">Page not found.</p>} />
          </Routes>
          </Suspense>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
