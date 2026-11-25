import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../components/dashboard.vue'
import DaftarPelanggan from '../components/daftar_pelanggan.vue'
import DetailPelanggan from '../components/detail_pelanggan.vue'
import History from '../components/history.vue'
import Users from '../components/users.vue'
import Login from '../components/login.vue'
import Profile from '../components/profile.vue'

// Kelompok Role
const SUPER_ADMIN_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'SUPER ADMIN']
const CS_ROLES = ['CS', 'CUSTOMER SERVICE', 'CUSTOMER_SERVICE']
const OP_ROLES = ['OP', 'OPERATOR']
const PENGAWAS_ROLES = ['PENGAWAS']

const ALL_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...CS_ROLES,
  ...OP_ROLES,
  ...PENGAWAS_ROLES
]

const ADMIN_AND_CS_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...CS_ROLES
]

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login, meta: { guestOnly: true } },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, allowedRoles: ALL_ROLES }
  },
  {
    path: '/daftar_pelanggan',
    name: 'Daftar-Pelanggan',
    component: DaftarPelanggan,
    meta: { requiresAuth: true, allowedRoles: ALL_ROLES }
  },
  {
    path: '/detail_pelanggan/:id',
    name: 'Detail-Pelanggan',
    component: DetailPelanggan,
    meta: { requiresAuth: true, allowedRoles: ALL_ROLES }
  },
  {
    path: '/history',
    name: 'History',
    component: History,
    meta: { requiresAuth: true, allowedRoles: ALL_ROLES }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, allowedRoles: SUPER_ADMIN_ROLES }
  },
  {
    path: '/tambah_pelanggan',
    name: 'TambahPelanggan',
    component: () => import('@/components/form_pelanggan.vue'),
    meta: { requiresAuth: true, allowedRoles: ADMIN_AND_CS_ROLES }
  },
  {
    path: '/edit_pelanggan/:id',
    name: 'EditPelanggan',
    component: () => import('@/components/form_pelanggan.vue'),
    meta: { requiresAuth: true, allowedRoles: ADMIN_AND_CS_ROLES }
  },
  {
    path: '/tambah_user',
    name: 'TambahUser',
    component: () => import('@/components/form_user.vue'),
    meta: { requiresAuth: true, allowedRoles: SUPER_ADMIN_ROLES }
  },
  {
    path: '/edit_user/:id',
    name: 'EditUser',
    component: () => import('@/components/form_user.vue'),
    meta: { requiresAuth: true, allowedRoles: SUPER_ADMIN_ROLES }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true, allowedRoles: ALL_ROLES }
  },
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
  const isAuthenticated = !!(token && user && ALL_ROLES.includes(userRole))

  // Jika belum login atau role tidak valid -> paksa ke /login
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

  // Jika sudah login tapi role tidak memiliki akses ke rute tujuan -> kembalikan ke /dashboard
  if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(userRole)) {
    next({ path: '/dashboard' })
    return
  }

  next()
})

export default router