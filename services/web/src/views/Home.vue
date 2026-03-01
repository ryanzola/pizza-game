<template>
  <div class="bg-[#000000] h-full flex flex-col text-white relative">
    <div class="hero relative h-56 md:h-80 overflow-hidden bg-[#1c1c1e] shadow-sm rounded-b-3xl shrink-0">
      <p class="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20 backdrop-blur-md">v{{ version }}</p>
      
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 transition-opacity"></div>
      <img v-if="isNearRestaurantDepot" src="../assets/depot.png" alt="the pizzeria storefront" class="absolute object-cover w-full h-full opacity-80">
      <img v-else src="../assets/pizzeria.png" alt="the pizzeria storefront" class="absolute object-cover w-full h-full opacity-80">

      <div class="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end" v-if="!isNearRestaurantDepot">
        <div>
          <h2 class="text-white text-3xl font-bold tracking-tight shadow-sm mb-1">Ryan's Pizzeria</h2>
          <div v-if="hasActiveSession" class="flex items-center gap-2 mt-1">
            <span class="bg-blue-500/90 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-md">
              {{ isNearPizzeria ? 'At Store' : 'Out for Delivery' }}
            </span>
            <span class="text-gray-300 text-sm font-medium drop-shadow-md">
              {{ Math.floor(waitTime / 1000 / 60) }} min wait
            </span>
          </div>
        </div>
        
        <!-- Session Controls -->
        <button v-if="!hasActiveSession" @click="start_session"
                class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md transition-colors flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          Start Session
        </button>
        <button v-else @click="end_session"
                class="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md transition-colors border border-red-400/30 flex items-center gap-1.5">
          End Session
        </button>
      </div>
    </div>

    <!-- Main Content wrapper that handles internal scrolling -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="px-4 pt-6 space-y-4 flex flex-col flex-1 pb-6">
        <DebugLocation />
        
        <div class="flex justify-between items-end mb-2">
          <h1 class="text-2xl font-bold tracking-tight text-white">Active Orders</h1>
          <p v-if="isNearPizzeria && !$store.state.debug_mode" class="text-sm font-medium text-gray-500">Pull to refresh</p>
        </div>

        <p class="text-center font-semibold bg-red-900/40 text-red-400 py-3 rounded-xl border border-red-900/50" v-show="!locationAvailable">
          Geolocation is not available or not permitted.
        </p>

        <ul :class="['orders-list flex flex-col gap-3 flex-1', { 'opacity-50 pointer-events-none': !isNearPizzeria && !$store.state.debug_mode }]">
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
      </div>
    </div>

    <!-- Sticky Bottom Action Bar -->
    <!-- Changed to sticky mt-auto to naturally affix to the bottom of the flex container, rather than overlapping fixed elements -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">

        <button v-if="isNearRestaurantDepot" class="action-btn bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" @click="() => {}">
          <span class="font-bold">Restock Pizzeria</span>
        </button>
        
        <div v-else-if="selected.length === 0 && $store.state.debug_mode" class="flex gap-2">
          <button class="action-btn bg-[#2c2c2e] text-white hover:bg-[#3a3a3c] flex-1 border border-gray-700" @click="getNewOrder">Get Order</button>
          <button class="action-btn bg-red-500/20 text-red-500 hover:bg-red-500/30 flex-1 border border-red-500/30" @click="clearQueuedOrders">Clear</button>
        </div>
        
        <button v-else-if="selected.length > 0" class="action-btn bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-500/30" @click="setDeliveries">
          <span class="font-bold text-lg mx-auto">Take Deliveries ({{ selected.length }})</span>
          <ChevronDoubleRightIcon class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 opacity-80" />
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" v-if="loading">
      <div class="bg-[#1c1c1e] p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-gray-800 min-w-[140px]">
        <svg class="animate-spin h-10 w-10 text-blue-500" viewBox="0 0 24 24">
           <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
           <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="font-semibold text-gray-200 text-sm">Processing</span>
      </div>
    </div>
  </div>
</template>

<script>
import DebugLocation from "../components/DebugLocation.vue";
import Order from "../components/Order.vue";
import { mapState, mapGetters, mapActions } from 'vuex'
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid'
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from '../firebase/init'; // Ensure we have the initialized Firebase app

// Get the initialized Cloud Functions instance (explicitly targeting us-central1)
const functions = getFunctions(app, 'us-central1');

export default {
  name: "Home",
  components: {
    ChevronDoubleRightIcon,
    DebugLocation,
    Order,
  },
  data() {
    return {
      currentWaitTime: 0,
      selected: [],
      loading: true,
      pollId: null,
    };
  },
  computed: {
    ...mapState(['session', 'version']),
    ...mapState('orders', ['waitTime', 'selected_orders']),
    ...mapState('location', ['locationAvailable']),
    ...mapGetters('location', ['isNearPizzeria', 'isNearRestaurantDepot']),
    ...mapGetters('orders', ['orders']),
    pendingOrders() {
      // make sure order user_id is null and order.status is not delivered
      return this.orders.filter(order => !order.user_id && order.status !== 'delivered');
    },
    hasActiveSession() {
      const session = this.session || {};
      return session.status === 'active' && !session.ended_at;
    }
  },
  async mounted() {
    try {
      this.listenToQueuedOrders();
    } catch (error) {
      console.error('Error starting order listener:', error);
    } finally {
      this.loading = false;
    }
  },
  unmounted() {
    this.stopListeningToQueuedOrders();
  },
  methods: {
    ...mapActions('orders', ['listenToQueuedOrders', 'stopListeningToQueuedOrders', 'attachUserToOrders']),
    ...mapActions(['start_session', 'end_session']),
    toggleOrderSelection(id) {
      const index = this.selected.findIndex(selectedId => selectedId === id);
      if (index > -1) {
        this.selected.splice(index, 1);
      } else {
        this.selected.push(id);
      }
    },
    async setDeliveries() {
      if (this.selected.length === 0) return;

      try {
        this.loading = true;
        const response = await this.attachUserToOrders(this.selected);
        console.log('User attached to orders successfully:', response);
        this.$router.push('/deliveries');
      } catch (error) {
        console.error('Error attaching user to orders:', error);
      } finally {
        this.loading = false;
      }
    },
    async getNewOrder() {
      if (this.loading) return;
      this.loading = true;
      try {
        const generateOrderFunction = httpsCallable(functions, 'generateOrder');
        const result = await generateOrderFunction();
        console.log('Successfully generated order via Cloud Function:', result.data);
      } catch (error) {
        console.error('Error invoking generateOrder function:', error);
        alert('Failed to generate order: ' + error.message);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="postcss" scoped>
/* Scoped styles are kept minimal, relying on Tailwind utilities */

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

/* Add support for iOS bottom safe area */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>

