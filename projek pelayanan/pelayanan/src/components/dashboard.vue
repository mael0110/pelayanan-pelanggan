<script setup>
import { ref, computed, onMounted } from 'vue'
import Layout from './layout.vue'
import monitoringServices from '@/services/superServices.js'

// Deteksi Role User dari localStorage
const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
const userRole = computed(() => String(loggedUser.role || '').toUpperCase().trim())

// Flag Role: OP / OPERATOR menggunakan Dashboard B, selain itu (Super Admin, CS, Pengawas) menggunakan Dashboard A
const isOperator = computed(() => userRole.value === 'OP' || userRole.value === 'OPERATOR')

// Label Sapaan Dinamis untuk Dashboard A (Super Admin, CS, Pengawas)
const welcomeRoleLabel = computed(() => {
  if (userRole.value === 'CS') return 'Customer Service'
  if (userRole.value === 'PENGAWAS') return 'Pengawas'
  return 'Super Admin'
})

// State Data dari API
const listPelanggan = ref([])
const listHistory = ref([])
const isLoading = ref(false)
const apiError = ref('')

// Fetch Data dari API
const fetchData = async () => {
  isLoading.value = true
  apiError.value = ''
  try {
    if (isOperator.value) {
      const response = await monitoringServices.getAll()
      listPelanggan.value = response.data?.data || response.data || []
    } else {
      const [resPelanggan, resHistory] = await Promise.all([
        monitoringServices.getAll(),
        monitoringServices.history()
      ])

      listPelanggan.value = resPelanggan.data?.data || resPelanggan.data || []
      listHistory.value = resHistory.data?.data || resHistory.data || []
    }
  } catch (error) {
    apiError.value = isOperator.value
      ? 'Gagal memuat data dashboard.'
      : 'Gagal memuat data dashboard super admin.'
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Hitung Statistik Otomatis dari API
const countSelesai = computed(() => {
  return listPelanggan.value.filter(p => p.status?.toUpperCase() === 'SELESAI').length
})

const countProgress = computed(() => {
  return listPelanggan.value.filter(p => p.status?.toUpperCase() === 'ON PROGRESS' || p.status?.toUpperCase() === 'DIPROSES').length
})

const countPending = computed(() => {
  return listPelanggan.value.filter(p => p.status?.toUpperCase() === 'PENDING').length
})

// --- COMPUTED KHUSUS OPERATOR (DASHBOARD B) ---
const listPelangganAktif = computed(() => {
  return listPelanggan.value.filter(p => {
    const status = p.status?.toUpperCase()
    return status === 'ON PROGRESS' || status === 'DIPROSES' || status === 'PENDING'
  })
})

const listHistoryOperator = computed(() => {
  return listPelanggan.value.filter(p => p.status?.toUpperCase() === 'SELESAI')
})

// --- HELPER FORMAT TANGGAL & STATUS ---
// Format Tanggal Ringkas (DD/MM/YYYY)
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Format Tanggal Lengkap untuk OP (misal: "Rabu, 16 September 2026 | 02.00")
const formatTanggalLengkap = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  
  const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date)
  const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const jam = date.getHours().toString().padStart(2, '0')
  const menit = date.getMinutes().toString().padStart(2, '0')

  return `${hari}, ${tanggal} | ${jam}.${menit}`
}

// Helper Format Text Status (Title Case)
const formatStatus = (status) => {
  if (!status) return '-'
  return status
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getStatusClass = (status) => {
  const upperStatus = status?.toUpperCase()
  if (upperStatus === 'PENDING') return 'bg-app-error text-white'
  if (upperStatus === 'ON PROGRESS' || upperStatus === 'DIPROSES') return 'bg-app-warning text-white'
  if (upperStatus === 'SELESAI') return 'bg-app-success text-white'
  return 'bg-gray-200 text-gray-700'
}
</script>

<template>
  <Layout>
    <!-- ===================================================================== -->
    <!-- DASHBOARD B: KHUSUS OPERATOR (OP)                                     -->
    <!-- ===================================================================== -->
    <div v-if="isOperator" class="max-w-7xl mx-auto flex-1 flex flex-col space-y-5 md:space-y-7 h-full px-2 sm:px-4 md:px-0">
      
      <!-- Judul Halaman -->
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-app-text tracking-tight">Dashboard</h1>
        <p class="text-base md:text-lg font-medium mt-0.5">Selamat Datang Operator</p>
      </div>

      <!-- Ringkasan Statistik Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        
        <!-- Pekerjaan Selesai (Di Mobile mengambil 2 kolom penuh) -->
        <div class="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-success rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">Pekerjaan Selesai</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countSelesai }}</span>
          </div>
        </div>

        <!-- On Progress -->
        <div class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-warning rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">On Progress</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countProgress }}</span>
          </div>
        </div>

        <!-- Pending -->
        <div class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-error rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">Pending</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countPending }}</span>
          </div>
        </div>

      </div>

      <!-- Area Tabel Pelanggan & History -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        <!-- Tabel Utama Pelanggan (Hanya On Progress & Pending) -->
        <div class="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base md:text-lg font-bold md:font-normal text-app-text">Pelanggan</h2>
            <button class="text-xs font-light hover:text-app-text underline" @click="$router.push('/daftar_pelanggan')">
              View All
            </button>
          </div>

          <!-- Indikator Loading / Error -->
          <div v-if="isLoading" class="py-10 text-center text-sm text-gray-400">Memuat data pelanggan...</div>
          <div v-else-if="apiError" class="py-10 text-center text-sm text-red-500">{{ apiError }}</div>

          <!-- Item Pelanggan -->
          <div v-else class="divide-y divide-gray-200 flex-1">
            <div 
              v-for="item in listPelangganAktif.slice(0, 5)"
              :key="item.idPengaduan"
              class="py-2.5 flex items-end justify-between hover:bg-gray-50 transition px-1 md:px-2 rounded-lg"
            >
              <div>
                <button @click="$router.push(`/detail_pelanggan/${item.idPengaduan}`)" class="font-normal md:font-normal text-xs md:text-sm hover:underline text-left text-app-text">
                  {{ item.pelanggan.namaPelanggan || '-' }}
                </button>
                <p class="font-medium md:font-normal text-xs mt-0.5">{{ item.keluhan }}</p>
                <p class="font-light text-[10px] md:text-[11px] mt-1">{{ formatTanggalLengkap(item.createdAt) }}</p>
              </div>

              <div v-if="item.penangani" class="text-right">
                <span class="text-[10px] md:text-xs font-normal text-red-500 block leading-tight max-w-[100px] md:max-w-none">
                  Dikerjakan Oleh {{ item.penangani.namaUser }}
                </span>
              </div>
            </div>

            <div v-if="listPelangganAktif.length === 0" class="py-10 text-center text-xs text-gray-400">
              Tidak ada pekerjaan pending atau on progress.
            </div>
          </div>

        </div>

        <!-- Tabel History -->
        <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
          <div class="flex items-center justify-between mb-4 md:mb-6">
            <h2 class="text-base md:text-lg font-bold md:font-normal text-app-text">History</h2>
            <button class="text-xs font-light hover:text-app-text underline" @click="$router.push('/history')">
              View All
            </button>
          </div>

          <!-- Content Tabel History -->
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs md:text-sm border-collapse min-w-[280px]">
              <thead>
                <tr class="border-b border-gray-300 text-app-text">
                  <th class="pb-2 md:pb-3 font-medium">Nama</th>
                  <th class="pb-2 md:pb-3 text-center font-medium">Tanggal Masuk</th>
                  <th class="pb-2 md:pb-3 text-center font-medium">Tanggal Selesai</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300 text-xs">
                <tr v-if="isLoading">
                  <td colspan="3" class="py-6 text-center text-gray-400">Memuat...</td>
                </tr>

                <tr v-else v-for="history in listHistoryOperator.slice(0, 4)" :key="history.idPengaduan" class="hover:bg-gray-50">
                  <td class="py-2.5 font-normal">{{ history.pelanggan.namaPelanggan || '-' }}</td>
                  <td class="py-2.5 text-center font-normal whitespace-nowrap">{{ formatDate(history.tanggalDiterima) }}</td>
                  <td class="py-2.5 text-center font-normal whitespace-nowrap">{{ formatDate(history.tanggalSelesai) }}</td>
                </tr>

                <tr v-if="!isLoading && listHistoryOperator.length === 0">
                  <td colspan="3" class="py-6 text-center text-gray-400">Belum ada history selesai.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- DASHBOARD A: SUPER ADMIN, CS, DAN PENGAWAS                            -->
    <!-- ===================================================================== -->
    <div v-else class="max-w-7xl mx-auto flex-1 flex flex-col space-y-5 md:space-y-7 h-full px-2 sm:px-4 md:px-0">
      
      <!-- Judul Halaman -->
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-app-text tracking-tight">Dashboard</h1>
        <p class="text-base md:text-lg font-medium mt-0.5">Selamat Datang {{ welcomeRoleLabel }}</p>
      </div>

      <!-- Ringkasan Statistik Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        
        <!-- Pekerjaan Selesai (Memakan 2 kolom penuh di mobile, 1 kolom di laptop) -->
        <div class="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-success rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">Pekerjaan Selesai</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countSelesai }}</span>
          </div>
        </div>

        <!-- On Progress -->
        <div class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-warning rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">On Progress</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countProgress }}</span>
          </div>
        </div>

        <!-- Pending -->
        <div class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
          <div class="w-12 h-12 md:w-16 md:h-16 bg-app-error rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
            <svg class="w-7 h-7 md:w-10 md:h-10 text-white stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs md:text-lg font-medium text-app-text leading-tight">Pending</h3>
            <span class="text-xl md:text-2xl font-bold text-app-text block mt-0.5 md:mt-1">{{ countPending }}</span>
          </div>
        </div>

      </div>

      <!-- Error State -->
      <div v-if="apiError" class="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
        {{ apiError }}
      </div>

      <!-- Area Tabel Pelanggan & History -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        <!-- Tabel Utama Pelanggan -->
        <div class="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
          <div class="flex items-center justify-between mb-4 md:mb-6">
            <h2 class="text-base md:text-lg font-bold text-app-text">Pelanggan</h2>
            <div class="flex items-center gap-3">
              <button class="hidden md:inline-block text-xs font-light hover:text-app-text underline" @click="$router.push('/daftar_pelanggan')">
                View All
              </button>
            </div>
          </div>

          <!-- Content Tabel Pelanggan -->
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs md:text-sm border-collapse min-w-[300px]">
              <thead>
                <tr class="border-b border-gray-300 text-app-text">
                  <th class="pb-2 md:pb-3 w-8 md:w-12 font-medium text-center">No</th>
                  <th class="pb-2 md:pb-3 font-medium text-center">Nama</th>
                  <th class="pb-2 md:pb-3 font-medium text-center">Keluhan</th>
                  <th class="pb-2 md:pb-3 text-center font-medium">Status</th>
                  <th class="hidden md:table-cell pb-3 text-center font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-300 text-xs font-normal">
                <!-- Loading -->
                <tr v-if="isLoading">
                  <td colspan="5" class="py-6 text-center text-gray-400">Memuat data...</td>
                </tr>

                <!-- Data Render -->
                <tr v-else v-for="(item, index) in listPelanggan.slice(0, 4)" :key="item.idPengaduan || index" class="hover:bg-gray-50">
                  <td class="py-2.5 font-normal text-center">{{ index + 1 }}</td>
                  <td class="py-2.5 font-normal text-center">{{ item.pelanggan.namaPelanggan || '-' }}</td>
                  <td class="py-2.5 font-normal text-center">{{ item.keluhan || '-' }}</td>
                  <td class="py-2.5 font-normal text-center">
                    <!-- Status Badge -->
                    <span 
                      :class="getStatusClass(item.status)"
                      class="px-2.5 py-1 rounded-md text-[10px] md:text-xs font-normal min-w-[70px] md:min-w-[85px] inline-block shadow-sm"
                    >
                      {{ formatStatus(item.status) }}
                    </span>
                  </td>
                  <td class="hidden md:table-cell py-2.5 text-center font-normal">{{ formatDate(item.tanggalDiterima || item.createdAt) }}</td>
                </tr>

                <!-- Empty State -->
                <tr v-if="!isLoading && listPelanggan.length === 0">
                  <td colspan="5" class="py-6 text-center text-gray-400">Tidak ada data pelanggan.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Tombol View All khusus layar Mobile di bagian bawah kartu -->
          <div class="mt-4 text-center md:hidden">
            <button 
              class="w-full bg-app-primary text-white text-xs font-medium py-2 rounded-lg shadow-xs hover:opacity-90 transition"
              @click="$router.push('/daftar_pelanggan')"
            >
              View All
            </button>
          </div>
        </div>

        <!-- Tabel History -->
        <div class="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
          <div class="flex items-center justify-between mb-4 md:mb-6">
            <h2 class="text-base md:text-lg font-bold text-app-text">History</h2>
            <button class="text-xs font-light hover:text-app-text underline" @click="$router.push('/history')">
              View All
            </button>
          </div>

          <!-- Content Tabel History -->
          <div class="overflow-x-auto flex-1">
            <table class="w-full text-left text-xs md:text-sm border-collapse min-w-[280px]">
              <thead>
                <tr class="border-b border-gray-300 text-app-text">
                  <th class="pb-2 md:pb-3 font-medium">Nama</th>
                  <th class="pb-2 md:pb-3 text-center font-medium">Tanggal Masuk</th>
                  <th class="pb-2 md:pb-3 text-center font-medium">Tanggal Selesai</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-300 text-xs">
                <!-- Loading -->
                <tr v-if="isLoading">
                  <td colspan="3" class="py-6 text-center text-gray-400">Memuat data...</td>
                </tr>

                <!-- Data Render -->
                <tr v-else v-for="(history, index) in listHistory.slice(0, 4)" :key="history.idPengaduan || index" class="hover:bg-gray-50">
                  <td class="py-2.5 font-normal">{{ history.pelanggan.namaPelanggan || '-' }}</td>
                  <td class="py-2.5 text-center font-normal">{{ formatDate(history.tanggalDiterima || history.createdAt) }}</td>
                  <td class="py-2.5 text-center font-normal">{{ formatDate(history.tanggalSelesai) }}</td>
                </tr>

                <!-- Empty State -->
                <tr v-if="!isLoading && listHistory.length === 0">
                  <td colspan="3" class="py-6 text-center text-gray-400">Tidak ada riwayat.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  </Layout>
</template>