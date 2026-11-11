<template>
  <div class="flex flex-col gap-6">
    <!-- Header/Filter Area -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-zinc-900">Customers</h1>
        <p class="text-sm text-zinc-500">Manage and view your customer database</p>
      </div>

      <div class="flex items-center gap-3">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search by name or email..."
          class="w-full sm:w-64"
        />
        <Button variant="secondary" size="sm" @click="resetFilters"> Reset </Button>
      </div>
    </div>

    <!-- Customer Cards Grid -->
    <div v-if="paginatedCustomers.length > 0" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        v-for="customer in paginatedCustomers"
        :key="customer.id"
        :padded="true"
        class="transition-all hover:shadow-md"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Info -->
          <div class="flex-1 space-y-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-zinc-900">{{ customer.name }}</h3>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                :class="statusClasses(customer.status)"
              >
                {{ customer.status }}
              </span>
            </div>
            <p class="text-sm text-zinc-500">{{ customer.email }}</p>

            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <div class="flex items-center gap-1.5 text-xs text-zinc-600">
                <svg
                  class="size-3.5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {{ customer.phone }}
              </div>
              <div class="flex items-center gap-1.5 text-xs text-zinc-600">
                <svg
                  class="size-3.5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z"
                  />
                </svg>
                Last: {{ customer.lastVisit }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 gap-2 sm:flex-col sm:border-l sm:border-zinc-100 sm:pl-4">
            <Button variant="ghost" size="sm" class="flex-1 sm:flex-none">History</Button>
            <Button variant="secondary" size="sm" class="flex-1 sm:flex-none">Edit</Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white/50 py-16"
    >
      <div class="rounded-full bg-zinc-100 p-5 shadow-inner">
        <svg class="size-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h3 class="mt-6 text-lg font-bold text-zinc-900">No customers found</h3>
      <p class="mt-2 text-sm text-zinc-500">We couldn't find any results for "{{ searchQuery }}"</p>
      <Button variant="secondary" size="sm" class="mt-6" @click="resetFilters">
        Clear search
      </Button>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row"
    >
      <p class="text-sm text-zinc-500">
        Showing <span class="font-bold text-zinc-900">{{ startIndex + 1 }}</span> to
        <span class="font-bold text-zinc-900">{{
          Math.min(endIndex, filteredCustomers.length)
        }}</span>
        of <span class="font-bold text-zinc-900">{{ filteredCustomers.length }}</span> customers
      </p>

      <div class="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" :disabled="currentPage === 1" @click="currentPage--">
          Previous
        </Button>
        <div class="flex items-center gap-1">
          <Button
            v-for="page in totalPages"
            :key="page"
            :variant="currentPage === page ? 'accent' : 'secondary'"
            size="sm"
            class="h-8 min-w-8 p-0"
            @click="currentPage = page"
          >
            {{ page }}
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Card from '@/components/main/Card.vue'
import Button from '@/components/buttons/Button.vue'
import SearchInput from '@/components/form/SearchInput.vue'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  lastVisit: string
  status: 'active' | 'inactive' | 'pending'
}

const mockCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'John Smith',
    email: 'john.smith@gmail.com',
    phone: '(555) 123-4567',
    lastVisit: '2025-03-12',
    status: 'active',
  },
  {
    id: 'CUST-002',
    name: 'Sarah Johnson',
    email: 's.johnson@outlook.com',
    phone: '(555) 987-6543',
    lastVisit: '2025-04-01',
    status: 'active',
  },
  {
    id: 'CUST-003',
    name: 'Michael Chen',
    email: 'mchen88@yahoo.com',
    phone: '(555) 456-7890',
    lastVisit: '2025-02-28',
    status: 'inactive',
  },
  {
    id: 'CUST-004',
    name: 'Elena Rodriguez',
    email: 'elena.rod@gmail.com',
    phone: '(555) 222-3333',
    lastVisit: '2025-04-05',
    status: 'active',
  },
  {
    id: 'CUST-005',
    name: 'David Wilson',
    email: 'dwilson@corp.net',
    phone: '(555) 888-9999',
    lastVisit: '2025-01-15',
    status: 'inactive',
  },
  {
    id: 'CUST-006',
    name: 'Amy Taylor',
    email: 'amy.t@me.com',
    phone: '(555) 444-5555',
    lastVisit: '2025-04-08',
    status: 'active',
  },
  {
    id: 'CUST-007',
    name: 'Robert Brown',
    email: 'robert.b@gmail.com',
    phone: '(555) 777-6666',
    lastVisit: '2024-12-20',
    status: 'inactive',
  },
  {
    id: 'CUST-008',
    name: 'Lisa Garcia',
    email: 'lgarcia@tech.io',
    phone: '(555) 333-2222',
    lastVisit: '2025-03-25',
    status: 'active',
  },
  {
    id: 'CUST-009',
    name: 'James Miller',
    email: 'miller.time@outlook.com',
    phone: '(555) 666-1111',
    lastVisit: '2025-04-09',
    status: 'pending',
  },
  {
    id: 'CUST-010',
    name: 'Emily Davis',
    email: 'emily.d@gmail.com',
    phone: '(555) 000-8888',
    lastVisit: '2025-03-05',
    status: 'active',
  },
]

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 5

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return mockCustomers
  const q = searchQuery.value.toLowerCase()
  return mockCustomers.filter(
    (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
  )
})

const totalPages = computed(() => Math.ceil(filteredCustomers.value.length / itemsPerPage))

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage)
const endIndex = computed(() => startIndex.value + itemsPerPage)

const paginatedCustomers = computed(() => {
  return filteredCustomers.value.slice(startIndex.value, endIndex.value)
})

watch(searchQuery, () => {
  currentPage.value = 1
})

function resetFilters() {
  searchQuery.value = ''
}

function statusClasses(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'inactive':
      return 'bg-zinc-100 text-zinc-600'
    case 'pending':
      return 'bg-primary-100 text-primary-700'
    default:
      return 'bg-zinc-100 text-zinc-500'
  }
}
</script>
