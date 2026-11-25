<script setup>
import layout from './layout.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import superServices from '@/services/superServices.js'

const route = useRoute()
const router = useRouter()

// Deteksi Role User dari localStorage
const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
const userRole = computed(() => String(loggedUser.role || '').toUpperCase().trim())
const canManagePelanggan = computed(() =>
    ['SUPERADMIN', 'SUPER_ADMIN', 'SUPER ADMIN', 'CS', 'CUSTOMER SERVICE', 'CUSTOMER_SERVICE'].includes(userRole.value)
)

// Cek apakah mode Edit (ada parameter ID di URL) atau Tambah
const idPengaduan = route.params.id
const isEdit = computed(() => !!idPengaduan)

const errorMessage = ref('')
const isSubmitting = ref(false)
const isLoading = ref(false)

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
            return 'Data pelanggan yang dimaksud tidak ditemukan.'
        case 409:
            return 'Data pelanggan dengan informasi tersebut sudah terdaftar.'
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

const form = ref({
    namaPelanggan: '',
    noTelp: '',
    noPdam: '',
    alamat: '',
    saluranKeluhan: '',
    sumberAduan: '',
    keluhan: '',
    status: 'PENDING'
})

const mapSaluranToSelect = (val) => {
    const raw = String(val || '').toLowerCase().replace(/_/g, ' ').trim()
    if (raw.includes('datang')) return 'Datang Langsung'
    if (raw.includes('telepon') || raw.includes('telp')) return 'Via Telepon'
    if (raw.includes('temuan') || raw.includes('lapangan') || raw.includes('whatsapp')) return 'Temuan Lapangan'
    return ''
}

const mapSumberToSelect = (val) => {
    const raw = String(val || '').toLowerCase().replace(/_/g, ' ').trim()
    if (raw.includes('non')) return 'Non_Pelanggan'
    if (raw.includes('pelanggan')) return 'Pelanggan'
    return ''
}

onMounted(async () => {
    // Jika bukan Super Admin atau CS, alihkan kembali ke daftar pelanggan
    if (!canManagePelanggan.value) {
        router.replace('/daftar_pelanggan')
        return
    }

    // Jika mode edit, fetch detail data pelanggan
    if (isEdit.value) {
        isLoading.value = true
        try {
            const res = await superServices.detail(idPengaduan)
            const item = res.data?.data || res.data

            form.value = {
                namaPelanggan: item.pelanggan?.namaPelanggan || '',
                noTelp: item.pelanggan?.noHp || '',
                noPdam: item.pelanggan?.noKontakPdam || '',
                alamat: item.pelanggan?.alamat || '',
                saluranKeluhan: mapSaluranToSelect(item.saluranKeluhan),
                sumberAduan: mapSumberToSelect(item.sumberAduan),
                keluhan: item.keluhan || '',
                status: item.status || 'PENDING'
            }
        } catch (err) {
            console.error('Detail Error Memuat Detail Pelanggan:', err.response?.data || err)
            errorMessage.value = getFormalErrorMessage(
                err,
                'Gagal memuat data pelanggan. Silakan muat ulang halaman.'
            )
        } finally {
            isLoading.value = false
        }
    }
})

const submitForm = async () => {
    if (!canManagePelanggan.value) return
    if (isSubmitting.value) return
    errorMessage.value = ''

    if (
        !form.value.namaPelanggan?.trim() ||
        !form.value.noTelp?.trim() ||
        !form.value.noPdam?.trim() ||
        !form.value.alamat?.trim() ||
        !form.value.saluranKeluhan?.trim() ||
        !form.value.sumberAduan?.trim() ||
        !form.value.keluhan?.trim()
    ) {
        errorMessage.value = 'Seluruh kolom formulir wajib diisi.'
        return
    }

    isSubmitting.value = true
    try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        const validIdUserCS = currentUser.idUser || currentUser.id || 'b554b7d4-a1b3-4617-b58a-1bb15fe1454f'

        if (isEdit.value) {
            const payloadUpdate = {
                namaPelanggan: form.value.namaPelanggan,
                noHp: form.value.noTelp,
                noKontakPdam: form.value.noPdam,
                alamat: form.value.alamat,
                saluranKeluhan: form.value.saluranKeluhan,
                sumberAduan: form.value.sumberAduan,
                keluhan: form.value.keluhan,
                status: form.value.status
            }
            await superServices.update(idPengaduan, payloadUpdate)
        } else {
            const payloadCreate = {
                namaPelanggan: form.value.namaPelanggan,
                noHp: form.value.noTelp,
                noKontakPdam: form.value.noPdam,
                alamat: form.value.alamat,
                saluranKeluhan: form.value.saluranKeluhan,
                sumberAduan: form.value.sumberAduan,
                keluhan: form.value.keluhan,
                idUserCS: validIdUserCS
            }
            await superServices.create(payloadCreate)
        }

        router.push('/daftar_pelanggan')
    } catch (error) {
        console.error('Detail Error Simpan Pelanggan:', error.response?.data || error)
        errorMessage.value = getFormalErrorMessage(
            error,
            'Gagal menyimpan data pelanggan. Silakan coba kembali.'
        )
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <layout>
        <div class="max-w-3xl mx-auto space-y-4 px-2 sm:px-4">
            <!-- Header -->
            <div class="flex items-center gap-2">
                <button @click="$router.push('/daftar_pelanggan')" class="hover:opacity-75 transition">
                    <ChevronLeft class="w-6 h-6 stroke-[2.5]" />
                </button>
                <h1 class="text-xl font-bold text-app-text tracking-tight leading-none">
                    {{ isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan' }}
                </h1>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="py-10 text-center text-xs text-gray-500">
                Memuat data pelanggan...
            </div>

            <!-- Form Card -->
            <div v-else class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-4">
                <div v-if="errorMessage" class="p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl flex items-center justify-between">
                    <span>{{ errorMessage }}</span>
                    <button type="button" @click="errorMessage = ''" class="font-normal">&times;</button>
                </div>

                <form @submit.prevent="submitForm" class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium mb-1.5">Nama</label>
                        <input v-model="form.namaPelanggan" :disabled="isSubmitting" type="text" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none disabled:opacity-60">
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">No. HP</label>
                        <input v-model="form.noTelp" :disabled="isSubmitting" inputmode="numeric" @input="form.noTelp = form.noTelp.replace(/\D/g, '')" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none disabled:opacity-60">
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">No. Kontak PDAM</label>
                        <input v-model="form.noPdam" :disabled="isSubmitting" inputmode="numeric" @input="form.noPdam = form.noPdam.replace(/\D/g, '')" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none disabled:opacity-60">
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">Alamat</label>
                        <input v-model="form.alamat" :disabled="isSubmitting" type="text" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none disabled:opacity-60">
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">Saluran Keluhan</label>
                        <select v-model="form.saluranKeluhan" :disabled="isSubmitting" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none cursor-pointer disabled:opacity-60">
                            <option value="" disabled selected hidden></option>
                            <option value="Datang Langsung">Datang Langsung</option>
                            <option value="Via Telepon">Via Telepon</option>
                            <option value="Temuan Lapangan">Temuan Lapangan</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">Sumber Aduan</label>
                        <select v-model="form.sumberAduan" :disabled="isSubmitting" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none cursor-pointer disabled:opacity-60">
                            <option value="" disabled selected hidden></option>
                            <option value="Pelanggan">Pelanggan</option>
                            <option value="Non_Pelanggan">Non Pelanggan</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-medium mb-1.5">Keluhan</label>
                        <textarea v-model="form.keluhan" :disabled="isSubmitting" rows="3" class="w-full bg-app-bg border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none resize-none disabled:opacity-60"></textarea>
                    </div>

                    <div class="pt-2">
                        <button
                            type="submit"
                            :disabled="isSubmitting"
                            :class="isEdit ? 'bg-app-warning hover:opacity-90' : 'bg-app-success hover:opacity-90'"
                            class="w-full text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </layout>
</template>