<template>
  <div class="bg-[#000000] h-full flex flex-col text-white relative">
    <div class="hero relative h-56 md:h-80 overflow-hidden bg-[#1c1c1e] shadow-sm rounded-b-3xl shrink-0">
      <p class="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20 backdrop-blur-md">v{{ version }}</p>

      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 transition-opacity"></div>
      
      <!-- Dynamic Hero Image -->
      <img v-if="isNearBakery" src="../assets/bakery.png" alt="the bakery" class="absolute object-cover w-full h-full opacity-80 transition-opacity duration-500">
      <img v-else-if="isNearRestaurantDepot" src="../assets/depot.png" alt="restaurant depot" class="absolute object-cover w-full h-full opacity-80 transition-opacity duration-500">
      <img v-else src="../assets/pizzeria.png" alt="the pizzeria storefront" class="absolute object-cover w-full h-full opacity-80 transition-opacity duration-500">

      <div class="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end" v-if="!isNearRestaurantDepot && !isNearBakery">
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
        <button v-if="!hasActiveSession" @click="startSession"
                class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md transition-colors flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          Start Session
        </button>
        <button v-else @click="endSession"
                class="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md transition-colors border border-red-400/30 flex items-center gap-1.5">
          End Session
        </button>
      </div>
    </div>

    <!-- Main Content wrapper that handles internal scrolling -->
    <div class="flex-1 overflow-y-auto flex flex-col relative">
      <DebugLocation v-if="!isNearBakery && !isNearRestaurantDepot" class="px-4 mt-4 shrink-0" />
      
      <p class="text-center font-semibold bg-red-900/40 text-red-400 py-3 mx-4 mt-4 rounded-xl border border-red-900/50 shrink-0" v-show="!locationAvailable">
        Geolocation is not available or not permitted.
      </p>

      <!-- Dynamic Views Orchestration -->
      <transition name="fade-mode" mode="out-in">
        <LocationBakery v-if="isNearBakery" />
        <LocationDepot v-else-if="isNearRestaurantDepot" />
        <LocationPizzeria v-else v-model:loading="loading" />
      </transition>
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

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import DebugLocation from "../components/DebugLocation.vue";
import LocationPizzeria from "./locations/LocationPizzeria.vue";
import LocationBakery from "./locations/LocationBakery.vue";
import LocationDepot from "./locations/LocationDepot.vue";

const store = useStore();

// Local State
const loading = ref(true);

// Computed Properties mapping to Vuex
const session = computed(() => store.state.session);
const version = computed(() => store.state.version);
const waitTime = computed(() => store.state.orders.waitTime);
const locationAvailable = computed(() => store.state.location.locationAvailable);

// Getters mapped from location module
const isNearPizzeria = computed(() => store.getters['location/isNearPizzeria']);
const isNearRestaurantDepot = computed(() => store.getters['location/isNearRestaurantDepot']);
const isNearBakery = computed(() => store.getters['location/isNearBakery']);

// Session logic
const hasActiveSession = computed(() => {
  const currentSession = session.value || {};
  return currentSession.status === 'active' && !currentSession.ended_at;
});

// Actions
const startSession = () => store.dispatch('start_session');
const endSession = () => store.dispatch('end_session');

// Lifecycle
onMounted(() => {
  try {
    store.dispatch('orders/listenToQueuedOrders');
  } catch (error) {
    console.error('Error starting order listener:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  store.dispatch('orders/stopListeningToQueuedOrders');
});

</script>

<style lang="postcss" scoped>
/* Smooth crossfade between view modes */
.fade-mode-enter-active,
.fade-mode-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-mode-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-mode-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
