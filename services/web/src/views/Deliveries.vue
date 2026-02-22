<template>
  <div class="bg-[#000000] flex flex-col h-full text-white">
    <div class="px-4 pt-6 pb-2 shrink-0">
      <h1 class="text-2xl font-bold tracking-tight mb-4">My Deliveries</h1>
      
      <!-- iOS Segmented Control -->
      <div class="w-full bg-[#1c1c1e] p-1 rounded-xl flex gap-1 relative z-10 border border-gray-800">
        <button 
          @click="showActive = true" 
          class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 z-20"
          :class="showActive ? 'text-white bg-[#3a3a3c] shadow-sm' : 'text-gray-400 hover:text-gray-200'"
        >
          Active
        </button>
        <button 
          @click="showActive = false" 
          class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 z-20"
          :class="!showActive ? 'text-white bg-[#3a3a3c] shadow-sm' : 'text-gray-400 hover:text-gray-200'"
        >
          Completed
        </button>
      </div>
    </div>

    <!-- Scrollable Orders List Container -->
    <div class="flex-1 overflow-y-auto px-4 pb-6 pt-2">
      <ul v-if="showActive" class="orders-list flex flex-col gap-3">
        <Order v-for="order in activeOrders" :key="order.id" :order="order" />
        <div v-if="activeOrders.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1c1c1e] rounded-2xl border border-gray-800 shadow-sm">
          <div class="w-16 h-16 bg-[#2c2c2e] rounded-full flex items-center justify-center mb-3">
             <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white">No active deliveries</h3>
          <p class="text-sm text-gray-400 mt-1">You don't have any deliveries in progress.</p>
        </div>
      </ul>
      <ul v-else class="orders-list flex flex-col gap-3">
        <Order v-for="order in completedOrders" :key="order.id" :order="order" />
        <div v-if="completedOrders.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1c1c1e] rounded-2xl border border-gray-800 shadow-sm">
          <div class="w-16 h-16 bg-[#2c2c2e] rounded-full flex items-center justify-center mb-3">
             <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-white">No completed deliveries</h3>
          <p class="text-sm text-gray-400 mt-1">Deliveries you finish will appear here.</p>
        </div>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import Order from "../components/Order.vue";

const store = useStore();
const showActive = ref(true);

const selectedOrders = computed(() => store.state.orders.selected_orders || []);

const activeOrders = computed(() => {
  return selectedOrders.value.filter(order => order.status !== 'delivered' && order.status !== 'cancelled');
});

const completedOrders = computed(() => {
  return selectedOrders.value
    .filter(order => order.status === 'delivered' || order.status === 'cancelled')
    .sort((a, b) => new Date(b.date_placed) - new Date(a.date_placed)); // Show newest completed first
});

onMounted(() => {
  store.dispatch('orders/fetchSelectedOrders');
});
</script>

<style scoped>
/* Relying on Tailwind utilities for layout */
</style>
