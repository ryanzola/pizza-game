<template>
  <div class="px-4 pt-6 space-y-4 flex flex-col flex-1 pb-6 w-full">
    <div class="flex justify-between items-end mb-2">
      <h1 class="text-2xl font-bold tracking-tight text-white">Active Orders</h1>
      <p v-if="isGenerating" class="text-sm font-medium text-blue-400 animate-pulse">Generating orders…</p>
      <p v-else-if="pendingOrders.length > 0" class="text-sm font-medium text-gray-500">{{ pendingOrders.length }} available</p>
    </div>

    <!-- Active Orders List -->
    <ul class="orders-list flex flex-col gap-3 flex-1">
      <Order v-for="order in pendingOrders" :key="order.id" :order="order" :selected="selected.includes(order.id)" @change="toggleOrderSelection" />
      
      <!-- Out of Stock State -->
      <div v-if="isOutOfStock && !isGenerating" class="flex flex-col items-center justify-center py-10 px-4 text-center bg-red-950/30 rounded-2xl border border-red-900/50 shadow-sm">
        <div class="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-3">
          <span class="text-3xl">⚠️</span>
        </div>
        <h3 class="text-lg font-bold text-red-400">Out of Stock</h3>
        <p class="text-sm text-gray-400 mt-1 max-w-[260px]">The pizzeria is out of ingredients. Visit the <span class="text-red-400 font-semibold">Restaurant Depot</span> to restock supplies.</p>
        <div v-if="depletedResources.length > 0" class="flex flex-wrap gap-1.5 mt-3 justify-center">
          <span v-for="r in depletedResources" :key="r" class="text-[10px] uppercase font-bold tracking-wider bg-red-900/40 text-red-400 px-2 py-0.5 rounded-md border border-red-800/30">{{ r.replace('_', ' ') }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="pendingOrders.length === 0 && !isGenerating && !isOutOfStock" class="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1c1c1e] rounded-2xl border border-gray-800 shadow-sm">
        <div class="w-16 h-16 bg-[#2c2c2e] rounded-full flex items-center justify-center mb-3">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-white">No active orders</h3>
        <p class="text-sm text-gray-400 mt-1">Check back soon for more deliveries.</p>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isGenerating" class="flex flex-col gap-3">
        <div v-for="n in 6" :key="n" class="bg-[#1c1c1e] rounded-2xl border border-gray-800 p-4 animate-pulse">
          <div class="flex gap-3 items-center">
            <div class="w-10 h-10 bg-[#2c2c2e] rounded-full shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-[#2c2c2e] rounded w-3/4"></div>
              <div class="h-3 bg-[#2c2c2e] rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </ul>

    <!-- Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl -mx-4">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">
        <!-- Debug Controls: only show in debug mode -->
        <div v-if="selected.length === 0 && $store.state.debug_mode" class="flex gap-2">
          <button class="action-btn bg-[#2c2c2e] text-white hover:bg-[#3a3a3c] flex-1 border border-gray-700" @click="generateBatch">Generate Orders</button>
          <button class="action-btn bg-red-500/20 text-red-500 hover:bg-red-500/30 flex-1 border border-red-500/30" @click="clearQueuedOrders">Clear</button>
        </div>
        
        <button v-if="selected.length > 0" class="action-btn bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-500/30" @click="setDeliveries">
          <span class="font-bold text-lg mx-auto">Take Deliveries ({{ selected.length }})</span>
          <ChevronDoubleRightIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 opacity-80" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid';
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from '../../firebase/init';
import Order from "../../components/Order.vue";

const store = useStore();
const router = useRouter();
const functions = getFunctions(app, 'us-central1');

const props = defineProps({
  loading: Boolean
});
const emit = defineEmits(['update:loading']);

const selected = ref([]);
const isGenerating = ref(false);
const hasGeneratedThisVisit = ref(false);

const pendingOrders = computed(() => {
  return store.getters['orders/orders'].filter(order => !order.user_id && order.status !== 'delivered');
});

const isNearPizzeria = computed(() => store.getters['location/isNearPizzeria']);
const hasActiveSession = computed(() => {
  const session = store.state.session || {};
  return session.status === 'active' && !session.ended_at;
});

// Watch for arrival at pizzeria — auto-generate orders (only with active session)
watch([isNearPizzeria, hasActiveSession], async ([isNear, isActive]) => {
  if (isNear && isActive && !hasGeneratedThisVisit.value && pendingOrders.value.length === 0 && !isOutOfStock.value) {
    await generateBatch();
  }
  if (!isNear) {
    hasGeneratedThisVisit.value = false;
  }
}, { immediate: true });

const isOutOfStock = computed(() => store.getters['inventory/isOutOfStock']);
const depletedResources = computed(() => store.getters['inventory/depletedResources']);

const generateBatch = async () => {
  if (isGenerating.value || isOutOfStock.value) return;
  isGenerating.value = true;
  hasGeneratedThisVisit.value = true;
  try {
    const generateOrderBatch = httpsCallable(functions, 'generateOrderBatch');
    const result = await generateOrderBatch();
    if (result.data && !result.data.success && result.data.reason === 'out_of_stock') {
      console.warn('Cannot generate orders — out of stock:', result.data.depleted);
    }
  } catch (error) {
    console.error('Error generating order batch:', error);
    hasGeneratedThisVisit.value = false; // Allow retry on error
  } finally {
    isGenerating.value = false;
  }
};

const toggleOrderSelection = (id) => {
  const index = selected.value.findIndex(selectedId => selectedId === id);
  if (index > -1) {
    selected.value.splice(index, 1);
  } else {
    selected.value.push(id);
  }
};

const setDeliveries = async () => {
  if (selected.value.length === 0) return;
  try {
    emit('update:loading', true);
    await store.dispatch('orders/attachUserToOrders', selected.value);
    // Clean up all non-selected orders (other drivers took them)
    await store.dispatch('orders/clearUnselectedOrders');
    router.push('/deliveries');
  } catch (error) {
    console.error('Error attaching user to orders:', error);
  } finally {
    emit('update:loading', false);
  }
};

const clearQueuedOrders = () => {
  store.dispatch('orders/clearUnselectedOrders');
};
</script>

<style lang="postcss" scoped>
.action-btn {
  @apply 
    relative 
    flex items-center justify-center
    w-full 
    h-[56px]
    rounded-2xl
    transition-all duration-200
    active:scale-[0.97]
    active:opacity-80
    focus:outline-none
    select-none;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
