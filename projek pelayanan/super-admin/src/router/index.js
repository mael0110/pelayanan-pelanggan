import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../components/dashboard.vue'
import DaftarPelanggan from '../components/daftar_pelanggan.vue'
import DetailPelanggan from '../components/detail_pelanggan.vue'
import History from '../components/history.vue'
import Users from '../components/users.vue'
import Login from '../components/login.vue'
import Profile from '../components/profile.vue'

const ALLOWED_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'SUPER ADMIN']

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login, meta: { guestOnly: true } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/daftar_pelanggan', name: 'Daftar-Pelanggan', component: DaftarPelanggan, meta: { requiresAuth: true } },
  { path: '/detail_pelanggan/:id', name: 'Detail-Pelanggan', component: DetailPelanggan, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
  { path: '/users', name: 'Users', component: Users, meta: { requiresAuth: true } },
  { path: '/tambah_pelanggan', name: 'TambahPelanggan', component: () => import('@/components/form_pelanggan.vue'), meta: { requiresAuth: true } },
  { path: '/edit_pelanggan/:id', name: 'EditPelanggan', component: () => import('@/components/form_pelanggan.vue'), meta: { requiresAuth: true } },
  { path: '/tambah_user', name: 'TambahUser', component: () => import('@/components/form_user.vue'), meta: { requiresAuth: true } },
  { path: '/edit_user/:id', name: 'EditUser', component: () => import('@/components/form_user.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
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

  // Jika belum login (atau data user/token tidak valid) lalu mencoba masuk halaman internal -> paksa ke /login
  if (to.meta.requiresAuth && !isAuthenticated) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    next({ path: '/login' })
    return
  }

  // Jika sudah login tapi mencoba akses /login -> arahkan ke /dashboard
  if (to.meta.guestOnly && isAuthenticated) {
    next({ path: '/dashboard' })
    return
  }

  next()
})

export default router