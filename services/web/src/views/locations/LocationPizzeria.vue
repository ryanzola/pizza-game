<template>
  <div class="px-4 pt-6 space-y-4 flex flex-col flex-1 pb-6 w-full">
    <div class="flex justify-between items-end mb-2">
      <h1 class="text-2xl font-bold tracking-tight text-white">Active Orders</h1>
      <p v-if="!$store.state.debug_mode" class="text-sm font-medium text-gray-500">Pull to refresh</p>
    </div>

    <!-- Active Orders List -->
    <ul :class="['orders-list flex flex-col gap-3 flex-1', { 'opacity-50 pointer-events-none': !$store.state.debug_mode }]">
      <Order v-for="order in pendingOrders" :key="order.id" :order="order" :selected="selected.includes(order.id)" @change="toggleOrderSelection" />
      
      <!-- Empty State -->
      <div v-if="pendingOrders.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1c1c1e] rounded-2xl border border-gray-800 shadow-sm">
        <div class="w-16 h-16 bg-[#2c2c2e] rounded-full flex items-center justify-center mb-3">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-white">No active orders</h3>
        <p class="text-sm text-gray-400 mt-1">Check back soon for more deliveries.</p>
      </div>
    </ul>

    <!-- Bottom Action Bar (in-flow for this component) -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl -mx-4">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">
        <div v-if="selected.length === 0 && $store.state.debug_mode" class="flex gap-2">
          <button class="action-btn bg-[#2c2c2e] text-white hover:bg-[#3a3a3c] flex-1 border border-gray-700" @click="getNewOrder">Get Order</button>
          <button class="action-btn bg-red-500/20 text-red-500 hover:bg-red-500/30 flex-1 border border-red-500/30" @click="clearQueuedOrders">Clear</button>
        </div>
        
        <button v-else-if="selected.length > 0" class="action-btn bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-500/30" @click="setDeliveries">
          <span class="font-bold text-lg mx-auto">Take Deliveries ({{ selected.length }})</span>
          <ChevronDoubleRightIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 opacity-80" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
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

const pendingOrders = computed(() => {
  return store.getters['orders/orders'].filter(order => !order.user_id && order.status !== 'delivered');
});

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
    router.push('/deliveries');
  } catch (error) {
    console.error('Error attaching user to orders:', error);
  } finally {
    emit('update:loading', false);
  }
};

const getNewOrder = async () => {
  if (props.loading) return;
  emit('update:loading', true);
  try {
    const generateOrderFunction = httpsCallable(functions, 'generateOrder');
    await generateOrderFunction();
  } catch (error) {
    console.error('Error invoking generateOrder function:', error);
    alert('Failed to generate order: ' + error.message);
  } finally {
    emit('update:loading', false);
  }
};

const clearQueuedOrders = () => {
  // Assuming clearQueuedOrders is an action in the orders module
  store.dispatch('orders/clearQueuedOrders');
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
