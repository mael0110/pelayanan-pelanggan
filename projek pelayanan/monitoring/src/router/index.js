import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../components/dashboard.vue'
import DaftarPelanggan from '../components/daftar_pelanggan.vue'
import DetailPelanggan from '../components/detail_pelanggan.vue'
import History from '../components/history.vue'
import Profile from '../components/profile.vue'
import Login from '../components/login.vue'

const ALLOWED_ROLES = ['PENGAWAS']

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/daftar_pelanggan', name: 'Daftar-Pelanggan', component: DaftarPelanggan, meta: { requiresAuth: true } },
  { path: '/detail_pelanggan/:id', name: 'Detail-Pelanggan', component: DetailPelanggan, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const userRaw = localStorage.getItem('user')

  let user = null
  try {
    user = userRaw ? JSON.parse(userRaw) : null
  } catch (e) {
    user = null
  }

  const userRole = (user?.role || '').toUpperCase().trim()
  const isAuthenticated = !!(token && user && ALLOWED_ROLES.includes(userRole))

  // Jika belum login atau role bukan Pengawas lalu mencoba akses halaman internal -> paksa ke /login
  if (to.meta.requiresAuth && !isAuthenticated) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return '/login'
  }
})

export default router