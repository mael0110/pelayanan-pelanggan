<script setup>
import layout from './layout.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, Printer, X } from 'lucide-vue-next'
import operationServices from '@/services/operationServices.js'

const route = useRoute()
const idPengaduan = route.params.id
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // Maksimal 10MB per file
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')

const isLoading = ref(false)
const isSubmitting = ref(false)
const apiError = ref('')
const isEditingSelesai = ref(false)

// Toast Notification State
const toast = ref({
  show: false,
  message: '',
  type: 'success'
})

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Helper Pemetaan Pesan Error ke Bahasa Indonesia Formal
const getFormalErrorMessage = (error, defaultMessage) => {
  const status = error?.response?.status

  if (!error?.response) {
    return 'Koneksi ke server terputus. Silakan periksa jaringan internet Anda dan coba kembali.'
  }

  switch (status) {
    case 400:
      return 'Data yang dikirimkan tidak valid. Silakan periksa kembali isian formulir Anda.'
    case 401:
      return 'Sesi masuk Anda telah berakhir. Silakan masuk kembali.'
    case 403:
      return 'Anda tidak memiliki hak akses untuk melakukan tindakan ini.'
    case 404:
      return 'Data pengaduan atau berkas yang dimaksud tidak ditemukan.'
    case 413:
      return 'Ukuran berkas yang diunggah melebihi batas maksimal 10MB.'
    case 422:
      return 'Data tidak dapat diproses. Pastikan seluruh kolom wajib telah diisi dengan benar.'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Terjadi gangguan pada server. Silakan coba beberapa saat lagi.'
    default:
      return defaultMessage
  }
}

// State Data Form & Detail
const detailPelanggan = ref(null)
const longitude = ref('')
const latitude = ref('')

// List Dokumen & Foto: { id, serverId, name, url, file: File | null, isLegacy: boolean }
const dokumenList = ref([])
const fotoList = ref([])

// Menampung ID file UUID server yang ditandai hapus sebelum menekan Simpan Perubahan
const deletedServerFileIds = ref([])

// Menampung penanda apakah file legacy dihapus user
const deletedLegacyDokumen = ref(false)
const deletedLegacyFoto = ref(false)

// Ref element input
const documentInput = ref(null)
const photoInput = ref(null)

// Helper Resolve URL File Server
const resolveServerUrl = (rawPath) => {
  if (!rawPath) return ''
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return rawPath
  }
  let cleanPath = rawPath.replace(/\\/g, '/')
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1)
  }
  return `${API_BASE_URL}/${cleanPath}`
}

// Helper cek apakah ID merupakan penanda file legacy dari backend
const isLegacyServerId = (rawId) => {
  if (!rawId) return true
  const str = String(rawId).toLowerCase()
  return str.startsWith('legacy') || str.includes('fallback')
}

// Helper ekstrak ID file UUID asli dari objek server maupun segmen akhir URL (/files/:fileId)
const extractServerFileId = (item) => {
  if (item?.legacy === true) return null
  if (item?.id && !isLegacyServerId(item.id)) return String(item.id)
  if (item?.fileId && !isLegacyServerId(item.fileId)) return String(item.fileId)
  if (item?.url && typeof item.url === 'string') {
    const match = item.url.match(/\/files\/([^/?#]+)/i)
    if (match && match[1] && !isLegacyServerId(match[1])) return match[1]
  }
  return null
}

// Helper Mapping File List dari Backend (prioritaskan *Files array, fallback ke single string)
const mapServerFiles = (filesArray, fallbackSingleUrl, prefix) => {
  if (Array.isArray(filesArray) && filesArray.length > 0) {
    return filesArray.slice(0, MAX_FILES).map((item, idx) => {
      const legacyFlag = Boolean(item.legacy) || isLegacyServerId(item.id)
      const extractedId = legacyFlag ? null : extractServerFileId(item)
      return {
        id: item.id || extractedId || `${prefix}-${idx}-${Date.now()}`,
        serverId: extractedId,
        name: item.name || (item.url ? item.url.split(/[/\\]/).pop() : `Berkas ${idx + 1}`),
        url: resolveServerUrl(item.url),
        file: null,
        isLegacy: legacyFlag
      }
    })
  }

  if (fallbackSingleUrl && typeof fallbackSingleUrl === 'string') {
    const match = fallbackSingleUrl.match(/\/files\/([^/?#]+)/i)
    const extractedId = match && match[1] && !isLegacyServerId(match[1]) ? match[1] : null
    return [
      {
        id: extractedId || `${prefix}-fallback-${Date.now()}`,
        serverId: extractedId,
        name: fallbackSingleUrl.split(/[/\\]/).pop() || 'Lihat Dokumen',
        url: resolveServerUrl(fallbackSingleUrl),
        file: null,
        isLegacy: !extractedId
      }
    ]
  }

  return []
}

// Fungsi Cetak / Print Menggunakan Service operationServices
const handlePrint = async () => {
  if (!idPengaduan) {
    showToast('Nomor identitas pengaduan tidak ditemukan.', 'error')
    return
  }

  try {
    const response = await operationServices.print(idPengaduan)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const fileURL = URL.createObjectURL(blob)
    window.open(fileURL, '_blank')
  } catch (error) {
    console.error('Detail Error Print:', error.response?.data || error)
    showToast(
      getFormalErrorMessage(error, 'Gagal mengunduh formulir cetak. Silakan coba kembali.'),
      'error'
    )
  }
}

// Computed Safety Helpers
const statusText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.status 
    ? detailPelanggan.value.status.toUpperCase() 
    : ''
})

const namaPelangganText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.pelanggan && detailPelanggan.value.pelanggan.namaPelanggan
    ? detailPelanggan.value.pelanggan.namaPelanggan
    : '-'
})

const alamatPelangganText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.pelanggan && detailPelanggan.value.pelanggan.alamat
    ? detailPelanggan.value.pelanggan.alamat
    : '-'
})

const noKontakPdamText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.pelanggan && detailPelanggan.value.pelanggan.noKontakPdam
    ? detailPelanggan.value.pelanggan.noKontakPdam
    : '-'
})

const noHpPelangganText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.pelanggan && detailPelanggan.value.pelanggan.noHp
    ? detailPelanggan.value.pelanggan.noHp
    : '-'
})

// Helper Teks & Mapping Saluran Keluhan Backend -> Display Teks
const saluranKeluhanRaw = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.saluranKeluhan
    ? detailPelanggan.value.saluranKeluhan
    : ''
})

const saluranKeluhanText = computed(() => {
  const val = String(saluranKeluhanRaw.value || '').trim()
  const lower = val.toLowerCase()
  if (val === 'Datang Langsung' || val === 'Datang_Ketempat' || lower.includes('datang')) return 'Datang Langsung'
  if (val === 'Via Telepon' || val === 'Telepon' || lower.includes('telepon') || lower.includes('telp')) return 'Via Telepon'
  if (val === 'Temuan Lapangan' || val === 'Whatsapp' || lower.includes('whatsapp') || lower.includes('temuan') || lower.includes('lapangan')) return 'Temuan Lapangan'
  return val || '-'
})

// Helper Teks & Mapping Sumber Aduan Backend -> Display Teks
const sumberAduanRaw = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.sumberAduan
    ? detailPelanggan.value.sumberAduan
    : ''
})

const sumberAduanText = computed(() => {
  const val = sumberAduanRaw.value
  if (val === 'Non_Pelanggan' || val === 'Non_Pelangan' || val.toLowerCase().includes('non')) return 'Non Pelanggan'
  if (val === 'Pelanggan' || val.toLowerCase().includes('pelanggan')) return 'Pelanggan'
  return val || '-'
})

const namaOperatorText = computed(() => {
  return detailPelanggan.value && detailPelanggan.value.penangani && detailPelanggan.value.penangani.namaUser
    ? detailPelanggan.value.penangani.namaUser
    : '-'
})

// Status Flags
const isPending = computed(() => statusText.value === 'PENDING')
const isOnProgress = computed(() => statusText.value === 'ON PROGRESS' || statusText.value === 'DIPROSES')
const isSelesai = computed(() => statusText.value === 'SELESAI')

// Input Boleh Diisi Jika ON PROGRESS atau Sedang Mode Edit Dokumen pada Status SELESAI
const canEdit = computed(() => isOnProgress.value || (isSelesai.value && isEditingSelesai.value))

// Fetch Detail Pelanggan dari API
const fetchDetail = async () => {
  isLoading.value = true
  apiError.value = ''
  try {
    const response = await operationServices.detail(idPengaduan)
    const data = (response.data && response.data.data) ? response.data.data : response.data
    detailPelanggan.value = data
    
    // Reset antrean file dihapus setiap kali data dimuat ulang
    deletedServerFileIds.value = []
    deletedLegacyDokumen.value = false
    deletedLegacyFoto.value = false

    // Binding field form
    longitude.value = data.longitude || ''
    latitude.value = data.latitude || ''
    
    // Populate list dokumen dari dokumenLaporanFiles
    dokumenList.value = mapServerFiles(
      data.dokumenLaporanFiles,
      data.dokumenLaporan,
      'server-doc'
    )

    // Populate list foto dari fotoKeluhanFiles
    const fallbackFoto = data.fotoKeluhan || (data.pelanggan ? data.pelanggan.fotoKeluhan : '')
    fotoList.value = mapServerFiles(
      data.fotoKeluhanFiles,
      fallbackFoto,
      'server-foto'
    )
  } catch (error) {
    console.error('Detail Error Fetch Detail:', error.response?.data || error)
    apiError.value = getFormalErrorMessage(
      error,
      'Gagal memuat rincian data pelanggan. Silakan muat ulang halaman.'
    )
  } finally {
    isLoading.value = false
  }
}

const handleImageError = () => {
  showToast('Sebagian berkas foto gagal dimuat dari server.', 'warning')
}

onMounted(() => {
  if (idPengaduan) {
    fetchDetail()
  }
})

// Format Tanggal (Termasuk Jam & Menit)
const formatTanggal = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

// Handler Utama untuk Tombol Aksi
const handleAction = async () => {
  if (isPending.value) {
    await terimaKeluhan()
  } else if (isOnProgress.value || (isSelesai.value && isEditingSelesai.value)) {
    await simpanPerubahan()
  }
}

// Masuk & Batal Mode Edit saat Status SELESAI
const mulaiEditDokumen = () => {
  deletedServerFileIds.value = []
  deletedLegacyDokumen.value = false
  deletedLegacyFoto.value = false
  isEditingSelesai.value = true
}

const batalEditDokumen = async () => {
  deletedServerFileIds.value = []
  deletedLegacyDokumen.value = false
  deletedLegacyFoto.value = false
  isEditingSelesai.value = false
  await fetchDetail()
}

// 1. Fungsi Terima Keluhan
const terimaKeluhan = async () => {
  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const operatorId = loggedUser.idUser || loggedUser.id

  if (!operatorId) {
    showToast('Sesi pengguna tidak valid. Silakan masuk kembali.', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      status: 'ON PROGRESS',
      operatorId: operatorId
    }

    await operationServices.update(idPengaduan, payload)
    showToast('Keluhan berhasil diterima.', 'success')
    await fetchDetail()
  } catch (error) {
    console.error('Detail Error Terima Keluhan:', error.response?.data || error)
    showToast(
      getFormalErrorMessage(error, 'Gagal menerima keluhan. Silakan coba kembali.'),
      'error'
    )
  } finally {
    isSubmitting.value = false
  }
}

// 2. Fungsi Simpan Perubahan (Hapus file UUID via DELETE API, lalu update data & upload file baru via PUT)
const simpanPerubahan = async () => {
  if (!String(longitude.value).trim() || !String(latitude.value).trim()) {
    showToast('Mohon lengkapi titik koordinat (Longitude dan Latitude) terlebih dahulu.', 'warning')
    return
  }

  if (dokumenList.value.length === 0) {
    showToast('Dokumen laporan wajib diunggah.', 'warning')
    return
  }

  if (fotoList.value.length === 0) {
    showToast('Foto dokumentasi wajib diunggah.', 'warning')
    return
  }

  isSubmitting.value = true
  try {
    // 1. Hapus file UUID asli (non-legacy) lewat DELETE /api/pelanggan/:id/files/:fileId
    if (deletedServerFileIds.value.length > 0) {
      for (const fileId of deletedServerFileIds.value) {
        if (!isLegacyServerId(fileId)) {
          await operationServices.deleteFile(idPengaduan, fileId)
        }
      }
    }

    // 2. Simpan koordinat, status, penanda hapus file legacy (jika ada), dan unggah file baru
    const formData = new FormData()
    formData.append('status', 'SELESAI')
    formData.append('longitude', String(longitude.value).trim())
    formData.append('latitude', String(latitude.value).trim())

    if (deletedLegacyDokumen.value) {
      formData.append('hapusDokumenLegacy', 'true')
      formData.append('deleteLegacyDokumen', 'true')
    }

    if (deletedLegacyFoto.value) {
      formData.append('hapusFotoLegacy', 'true')
      formData.append('deleteLegacyFoto', 'true')
    }

    dokumenList.value.forEach((item) => {
      if (item.file) {
        formData.append('dokumenLaporan', item.file)
      }
    })

    fotoList.value.forEach((item) => {
      if (item.file) {
        formData.append('fotoKeluhan', item.file)
      }
    })

    await operationServices.update(idPengaduan, formData)
    showToast(
      isSelesai.value ? 'Perubahan dokumen berhasil disimpan.' : 'Laporan berhasil diselesaikan.',
      'success'
    )
    deletedServerFileIds.value = []
    deletedLegacyDokumen.value = false
    deletedLegacyFoto.value = false
    isEditingSelesai.value = false
    await fetchDetail()
  } catch (error) {
    console.error('Detail Error Simpan Perubahan:', error.response?.data || error)
    showToast(
      getFormalErrorMessage(error, 'Gagal menyimpan perubahan. Silakan coba beberapa saat lagi.'),
      'error'
    )
  } finally {
    isSubmitting.value = false
  }
}

// Upload & Hapus File Handlers
const triggerDocumentUpload = () => {
  if (dokumenList.value.length >= MAX_FILES) {
    showToast(`Batas maksimal unggah dokumen adalah ${MAX_FILES} berkas.`, 'warning')
    return
  }
  documentInput.value.click()
}

const triggerPhotoUpload = () => {
  if (fotoList.value.length >= MAX_FILES) {
    showToast(`Batas maksimal unggah foto adalah ${MAX_FILES} berkas.`, 'warning')
    return
  }
  photoInput.value.click()
}

const handleDocumentChange = (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
  const validSizeFiles = files.filter((file) => file.size <= MAX_FILE_SIZE)

  if (oversizedFiles.length > 0) {
    showToast('Ukuran berkas dokumen melebihi batas maksimal 10MB.', 'error')
  }

  if (!validSizeFiles.length) {
    event.target.value = ''
    return
  }

  const remainingSlots = MAX_FILES - dokumenList.value.length
  if (remainingSlots <= 0) {
    showToast(`Batas maksimal unggah dokumen adalah ${MAX_FILES} berkas.`, 'warning')
    event.target.value = ''
    return
  }

  if (validSizeFiles.length > remainingSlots) {
    showToast(`Hanya ${remainingSlots} berkas dokumen lagi yang dapat ditambahkan (maksimal ${MAX_FILES} berkas).`, 'warning')
  }

  validSizeFiles.slice(0, remainingSlots).forEach((file, idx) => {
    dokumenList.value.push({
      id: `new-doc-${Date.now()}-${idx}`,
      serverId: null,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      isLegacy: false
    })
  })

  event.target.value = ''
}

const removeDocument = (index) => {
  const item = dokumenList.value[index]
  if (item) {
    if (item.file && item.url) {
      URL.revokeObjectURL(item.url)
    } else if (item.isLegacy || isLegacyServerId(item.serverId)) {
      deletedLegacyDokumen.value = true
    } else if (item.serverId && !deletedServerFileIds.value.includes(item.serverId)) {
      deletedServerFileIds.value.push(item.serverId)
    }
  }
  dokumenList.value.splice(index, 1)
}

const handlePhotoChange = (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
  const validSizeFiles = files.filter((file) => file.size <= MAX_FILE_SIZE)

  if (oversizedFiles.length > 0) {
    showToast('Ukuran berkas foto melebihi batas maksimal 10MB.', 'error')
  }

  if (!validSizeFiles.length) {
    event.target.value = ''
    return
  }

  const remainingSlots = MAX_FILES - fotoList.value.length
  if (remainingSlots <= 0) {
    showToast(`Batas maksimal unggah foto adalah ${MAX_FILES} berkas.`, 'warning')
    event.target.value = ''
    return
  }

  if (validSizeFiles.length > remainingSlots) {
    showToast(`Hanya ${remainingSlots} berkas foto lagi yang dapat ditambahkan (maksimal ${MAX_FILES} berkas).`, 'warning')
  }

  validSizeFiles.slice(0, remainingSlots).forEach((file, idx) => {
    fotoList.value.push({
      id: `new-foto-${Date.now()}-${idx}`,
      serverId: null,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      isLegacy: false
    })
  })

  event.target.value = ''
}

const removePhoto = (index) => {
  const item = fotoList.value[index]
  if (item) {
    if (item.file && item.url) {
      URL.revokeObjectURL(item.url)
    } else if (item.isLegacy || isLegacyServerId(item.serverId)) {
      deletedLegacyFoto.value = true
    } else if (item.serverId && !deletedServerFileIds.value.includes(item.serverId)) {
      deletedServerFileIds.value.push(item.serverId)
    }
  }
  fotoList.value.splice(index, 1)
}
</script>

<template>
  <layout>
    <div class="max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full relative px-2 sm:px-4 md:px-0">
      
      <!-- POPUP / TOAST NOTIFIKASI KECIL -->
      <transition name="fade">
        <div 
          v-if="toast.show" 
          :class="{
            'bg-emerald-600 text-white': toast.type === 'success',
            'bg-red-600 text-white': toast.type === 'error',
            'bg-amber-500 text-white': toast.type === 'warning'
          }"
          class="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-white/20"
        >
          <span>{{ toast.message }}</span>
        </div>
      </transition>

      <!-- Header & Breadcrumb -->
      <div class="flex items-center justify-between">
        <div>
          <!-- Breadcrumb -->
          <nav class="hidden md:flex text-xs font-normal gap-1 mb-1 items-center">
            <router-link to="/dashboard" class="hover:underline">Dashboard</router-link>
            <span>&gt;</span>
            <router-link to="/daftar_pelanggan" class="hover:underline">Daftar Pelanggan</router-link>
            <span>&gt;</span>
            <span>Detail Pelanggan</span>
          </nav>

          <!-- Judul -->
          <div class="flex items-center gap-2">
            <button @click="$router.push('/daftar_pelanggan')" class="hover:opacity-75 transition">
              <ChevronLeft class="w-6 h-6 md:w-7 md:h-7 stroke-[2.5]"/>
            </button>
            <h1 class="text-xl md:text-3xl font-bold text-app-text tracking-tight leading-none">
              Detail Pelanggan
            </h1>
          </div>
        </div>

        <!-- Tombol Print di Pojok Kanan Atas -->
        <button 
          @click="handlePrint"
          type="button"
          class="bg-app-primary hover:opacity-90 text-white text-xs md:text-sm font-semibold px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xs transition flex items-center gap-2"
        >
          <Printer class="w-4 h-4 stroke-[2]" />
          <span>Cetak</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-12 text-center font-normal">
        Memuat detail pelanggan...
      </div>

      <!-- Error State -->
      <div v-else-if="apiError" class="py-12 text-center text-red-500">
        {{ apiError }}
      </div>

      <!-- Detail Content Grid -->
      <div v-else-if="detailPelanggan" class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 pt-2">
        
        <!-- Sisi Kiri: Pelanggan & Proses -->
        <div class="space-y-6 md:space-y-8">
          
          <!-- Section Pelanggan -->
          <div class="space-y-3 md:space-y-4">
            <h2 class="text-base md:text-lg font-bold text-app-primary border-b-2 border-app-primary pb-1 md:pb-2">
              Pelanggan
            </h2>

            <div class="space-y-2.5 md:space-y-3 text-xs">
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Saluran Keluhan</span>
                <span class="col-span-2 font-light">{{ saluranKeluhanText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Sumber Aduan</span>
                <span class="col-span-2 font-light">{{ sumberAduanText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Nama</span>
                <span class="col-span-2 font-light ">{{ namaPelangganText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Alamat</span>
                <span class="col-span-2 font-light leading-tight">{{ alamatPelangganText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">No. Kontak PDAM</span>
                <span class="col-span-2 font-light ">{{ noKontakPdamText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Keluhan</span>
                <span class="col-span-2 font-light">{{ detailPelanggan.keluhan || '-' }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">No. Telp</span>
                <span class="col-span-2 font-light ">{{ noHpPelangganText }}</span>
              </div>
            </div>
          </div>

          <!-- Section Proses -->
          <div class="space-y-3 md:space-y-4 pt-2 md:pt-4">
            <h2 class="text-base md:text-lg font-bold text-app-primary border-b-2 border-app-primary pb-1 md:pb-2">
              Proses
            </h2>

            <div class="space-y-2.5 md:space-y-3 text-xs">
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Operator</span>
                <span class="col-span-2 font-light ">{{ namaOperatorText }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Keluhan diterima</span>
                <span class="col-span-2 font-light ">{{ formatTanggal(detailPelanggan.tanggalDiterima || detailPelanggan.createdAt) }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Laporan diproses</span>
                <span class="col-span-2 font-light ">{{ formatTanggal(detailPelanggan.tanggalDiproses) }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 items-start">
                <span class="font-semibold text-app-secondary">Laporan selesai</span>
                <span class="col-span-2 font-light ">{{ formatTanggal(detailPelanggan.tanggalSelesai) }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Sisi Kanan: Upload Dokumen & Form -->
        <div class="space-y-4 md:space-y-6 pt-2 lg:pt-0">
          <h2 class="text-base md:text-lg font-bold text-app-primary border-b-2 border-app-primary pb-1 md:pb-2">
            Upload Dokumen
          </h2>

          <div class="space-y-4 md:space-y-5">
            
            <!-- Titik Koordinat -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-app-secondary">Titik Kordinat</label>
              <input 
                v-model="longitude" 
                type="text" 
                placeholder="Longitude" 
                :disabled="!canEdit"
                class="w-full bg-gray-300 md:bg-gray-200 text-xs px-4 py-2.5 rounded-xl outline-none placeholder-gray-500 disabled:opacity-60 disabled:cursor-not-allowed" 
              />
              <input 
                v-model="latitude" 
                type="text" 
                placeholder="Latitude" 
                :disabled="!canEdit"
                class="w-full bg-gray-300 md:bg-gray-200 text-xs px-4 py-2.5 rounded-xl outline-none placeholder-gray-500 disabled:opacity-60 disabled:cursor-not-allowed" 
              />
            </div>

            <!-- Dokumen -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-app-secondary">Dokumen</label>
                <span v-if="dokumenList.length > 0" class="text-[11px] text-gray-400">
                  {{ dokumenList.length }}/{{ MAX_FILES }}
                </span>
              </div>
              
              <!-- Daftar Link Dokumen -->
              <div v-if="dokumenList.length > 0" class="space-y-2">
                <div 
                  v-for="(doc, index) in dokumenList" 
                  :key="doc.id"
                  class="flex items-center gap-2"
                >
                  <a 
                    :href="doc.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full bg-gray-200 text-xs px-4 py-2.5 rounded-xl text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center justify-between font-medium transition"
                  >
                    <span class="truncate">{{ doc.name }}</span>
                  </a>

                  <button
                    v-if="canEdit"
                    type="button"
                    @click="removeDocument(index)"
                    title="Hapus dokumen"
                    class="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition shrink-0"
                  >
                    <X class="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <!-- Placeholder Jika Belum Ada Dokumen -->
              <div v-else class="flex items-center gap-2">
                <input 
                  type="text" 
                  value="Tidak ada dokumen" 
                  readonly 
                  disabled
                  class="w-full bg-gray-300 md:bg-gray-200 text-xs px-4 py-2.5 rounded-xl outline-none text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <input 
                ref="documentInput" 
                type="file" 
                multiple
                class="hidden" 
                @change="handleDocumentChange"
              />
              
              <div v-if="canEdit" class="flex items-center gap-2.5">
                <button 
                  v-if="dokumenList.length < MAX_FILES"
                  type="button" 
                  @click="triggerDocumentUpload"
                  class="bg-amber-400 hover:bg-amber-500 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-xs transition"
                >
                  Tambah File
                </button>
                <span class="text-[11px] text-gray-500">Maks. 10MB per file</span>
              </div>
            </div>

            <!-- Foto -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-app-secondary">Foto</label>
                <span v-if="fotoList.length > 0" class="text-[11px] text-gray-400">
                  {{ fotoList.length }}/{{ MAX_FILES }}
                </span>
              </div>

              <!-- Tampilan 1 Foto -->
              <div 
                v-if="fotoList.length === 1" 
                class="relative w-full h-44 md:h-40 bg-gray-300 md:bg-gray-200 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 group"
              >
                <a
                  :href="fotoList[0].url"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Klik untuk membuka foto"
                  class="w-full h-full block cursor-pointer"
                >
                  <img 
                    :src="fotoList[0].url" 
                    @error="handleImageError"
                    class="w-full h-full object-cover hover:opacity-95 transition" 
                  />
                </a>
                <button
                  v-if="canEdit"
                  type="button"
                  @click.stop="removePhoto(0)"
                  title="Hapus foto"
                  class="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-sm transition"
                >
                  <X class="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              <!-- Tampilan Grid Jika Foto Lebih Dari 1 -->
              <div 
                v-else-if="fotoList.length > 1" 
                class="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              >
                <div 
                  v-for="(foto, index) in fotoList" 
                  :key="foto.id"
                  class="relative h-28 sm:h-32 bg-gray-300 md:bg-gray-200 rounded-2xl overflow-hidden border border-gray-200 group"
                >
                  <a
                    :href="foto.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Klik untuk membuka foto"
                    class="w-full h-full block cursor-pointer"
                  >
                    <img 
                      :src="foto.url" 
                      @error="handleImageError"
                      class="w-full h-full object-cover hover:opacity-95 transition" 
                    />
                  </a>
                  <button
                    v-if="canEdit"
                    type="button"
                    @click.stop="removePhoto(index)"
                    title="Hapus foto"
                    class="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-sm transition"
                  >
                    <X class="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <!-- Placeholder Jika Tidak Ada Foto -->
              <div 
                v-else 
                class="w-full h-44 md:h-40 bg-gray-300 md:bg-gray-200 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200"
              >
                <span class="text-xs font-normal text-gray-400">Tidak ada foto</span>
              </div>
              
              <input 
                ref="photoInput" 
                type="file" 
                accept="image/*"
                multiple
                class="hidden" 
                @change="handlePhotoChange"
              />

              <div v-if="canEdit" class="flex items-center gap-2.5">
                <button 
                  v-if="fotoList.length < MAX_FILES"
                  type="button" 
                  @click="triggerPhotoUpload"
                  class="bg-amber-400 hover:bg-amber-500 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-xs transition"
                >
                  Tambah File
                </button>
                <span class="text-[11px] text-gray-500">Maks. 10MB per file</span>
              </div>
            </div>

            <!-- Tombol Utama (Terima Keluhan / Simpan Perubahan) -->
            <div class="pt-2" v-if="!isSelesai"> 
              <button 
                type="button" 
                @click="handleAction"
                :disabled="isSubmitting"
                :class="{
                  'bg-app-primary hover:opacity-90': isPending,
                  'bg-app-success hover:opacity-90': isOnProgress
                }"
                class="w-full sm:w-auto text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                <span v-if="isSubmitting">Memproses...</span>
                <span v-else>{{ isPending ? 'Terima Keluhan' : 'Simpan Perubahan' }}</span>
              </button>
            </div>

            <!-- Tombol Edit / Simpan / Batal saat Status SELESAI -->
            <div class="pt-2 flex items-center gap-2.5" v-else>
              <button 
                v-if="!isEditingSelesai"
                type="button"
                @click="mulaiEditDokumen"
                class="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs transition"
              >
                Edit Dokumen
              </button>

              <template v-else>
                <button 
                  type="button"
                  @click="handleAction"
                  :disabled="isSubmitting"
                  class="w-full sm:w-auto bg-app-success hover:opacity-90 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {{ isSubmitting ? 'Memproses...' : 'Simpan Perubahan' }}
                </button>
                <button 
                  type="button"
                  @click="batalEditDokumen"
                  :disabled="isSubmitting"
                  class="w-full sm:w-auto bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  Batal
                </button>
              </template>
            </div>

          </div>
        </div>

      </div>

    </div>
  </layout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>