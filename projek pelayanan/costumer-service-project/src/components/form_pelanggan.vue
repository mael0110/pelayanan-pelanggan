<script setup>
import layout from './layout.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import pelangganServices from '@/services/pelangganServices.js'

const route = useRoute()
const router = useRouter()

// Cek apakah mode Edit (ada parameter ID di URL) atau Tambah
const idPengaduan = route.params.id
const isEdit = computed(() => !!idPengaduan)

const errorMessage = ref('')
const isSubmitting = ref(false)
const isLoading = ref(false)

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
    // Jika mode edit, fetch detail data pelanggan
    if (isEdit.value) {
        isLoading.value = true
        try {
            const res = await pelangganServices.detail(idPengaduan)
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
            errorMessage.value = 'Gagal memuat data pelanggan.'
            console.error(err)
        } finally {
            isLoading.value = false
        }
    }
})

const submitForm = async () => {
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
        errorMessage.value = 'Semua field harus diisi!'
        return
    }

    isSubmitting.value = true
    try {
        const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')
        const validIdUserCS = loggedUser.idUser || loggedUser.id || 'b554b7d4-a1b3-4617-b58a-1bb15fe1454f'

        if (isEdit.value) {
            await pelangganServices.update(idPengaduan, {
                namaPelanggan: form.value.namaPelanggan,
                noHp: form.value.noTelp,
                noKontakPdam: form.value.noPdam,
                alamat: form.value.alamat,
                saluranKeluhan: form.value.saluranKeluhan,
                sumberAduan: form.value.sumberAduan,
                keluhan: form.value.keluhan,
                status: form.value.status
            })
        } else {
            await pelangganServices.create({
                namaPelanggan: form.value.namaPelanggan,
                noHp: form.value.noTelp,
                noKontakPdam: form.value.noPdam,
                alamat: form.value.alamat,
                saluranKeluhan: form.value.saluranKeluhan,
                sumberAduan: form.value.sumberAduan,
                keluhan: form.value.keluhan,
                idUserCS: validIdUserCS
            })
        }
        router.push('/daftar_pelanggan')
    } catch (error) {
        errorMessage.value = error.response?.data?.message || error.response?.data?.error || 'Gagal menyimpan data pelanggan.'
        console.error(error)
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <layout>
        <div class="max-w-xl mx-auto space-y-4 px-2 sm:px-4 py-2">
            
            <!-- Judul Halaman Mobile -->
            <div class="flex items-center gap-2">
                <button @click="$router.push('/daftar_pelanggan')" class="hover:opacity-75 transition">
                    <ChevronLeft class="w-6 h-6 stroke-[2.5]" />
                </button>
                <h1 class="text-xl font-bold text-app-text tracking-tight leading-none">
                    {{ isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan' }}
                </h1>
            </div>

            <!-- Error Notification -->
            <div v-if="errorMessage" class="p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl flex items-center justify-between">
                <span>{{ errorMessage }}</span>
                <button type="button" @click="errorMessage = ''" class="font-normal">&times;</button>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="bg-white p-5 rounded-2xl border border-gray-100 text-center text-xs text-gray-500">
                Memuat data pelanggan...
            </div>

            <!-- Form -->
            <form v-else @submit.prevent="submitForm" class="bg-white p-5 rounded-2xl border border-gray-100 space-y-4 shadow-sm">
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

                <!-- Dropdown Saluran Keluhan -->
                <div>
                    <label class="block text-xs font-medium mb-1.5">Saluran Keluhan</label>
                    <select v-model="form.saluranKeluhan" :disabled="isSubmitting" class="w-full bg-app-bg rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#427AA1] outline-none cursor-pointer disabled:opacity-60">
                        <option value="" disabled selected hidden></option>
                        <option value="Datang Langsung">Datang Langsung</option>
                        <option value="Via Telepon">Via Telepon</option>
                        <option value="Temuan Lapangan">Temuan Lapangan</option>
                    </select>
                </div>

                <!-- Dropdown Sumber Aduan -->
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

                <div class="flex justify-end pt-2">
                    <button 
                        type="submit" 
                        :disabled="isSubmitting"
                        :class="isEdit ? 'bg-app-warning hover:opacity-90' : 'bg-app-success hover:opacity-90'"
                        class="w-full text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
                    </button>
                </div>
            </form>

        </div>
    </layout>
</template>