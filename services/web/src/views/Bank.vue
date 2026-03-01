<template>
  <div class="h-full flex flex-col text-white relative">
    
    <!-- Hero Section -->
    <div class="hero relative h-56 md:h-80 overflow-hidden bg-[#1c1c1e] shadow-sm rounded-b-3xl shrink-0">
      <p class="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-20 backdrop-blur-md">v{{ version }}</p>
      
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
      
      <img src="../assets/bank.png" alt="The Bank" class="absolute object-cover w-full h-full opacity-80">

      <div class="absolute bottom-4 left-4 right-4 z-20">
        <h2 class="text-white text-3xl font-bold tracking-tight shadow-sm mb-1">National Bank</h2>
        <div class="flex items-center gap-2">
          <span 
            class="text-xs font-bold px-2 py-1 rounded-md backdrop-blur-md"
            :class="isNearBank ? 'bg-blue-500/90 text-white' : 'bg-gray-600/70 text-gray-200'"
          >
            {{ isNearBank ? 'At Branch' : 'Out of Range' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Scrollable Content -->
    <div class="flex-1 overflow-y-auto flex flex-col px-4 pt-6 pb-6">
      <DebugLocation />
      
      <h1 class="text-2xl font-bold tracking-tight text-white mb-4">Account Summary</h1>

      <div class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm flex flex-col gap-4">
        
        <div class="flex justify-between items-center">
          <div class="flex flex-col">
            <span class="text-gray-400 text-sm font-medium">Total Savings</span>
            <span class="text-3xl font-extrabold tracking-tight text-green-400">${{ savings_amount }}</span>
          </div>
        </div>

        <div class="w-full h-[1px] bg-gray-800 my-2"></div>

        <div class="flex justify-between items-center mb-1">
          <div class="flex flex-col">
            <span class="text-gray-400 text-sm font-medium">Current Balance (On Hand)</span>
            <span class="text-xl font-bold tracking-tight text-white">${{ bank_amount }}</span>
          </div>
          <span class="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">Limit $200</span>
        </div>

        <div class="w-full h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner relative">
          <div 
            class="h-full rounded-full transition-all duration-500 ease-out"
            :class="bank_amount >= 180 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'"
            :style="{ width: Math.min((bank_amount / 200) * 100, 100) + '%' }"
          ></div>
        </div>
        <p class="text-xs text-gray-500 text-right mt-1 w-full" v-if="bank_amount >= 180">Approaching carry limit!</p>

      </div>
    </div>

    <!-- Sticky Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">
        <button 
          v-if="debug_mode || isNearBank" 
          class="action-btn text-white transition-all duration-200"
          :class="bank_amount > 0 ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-gray-700 opacity-50 cursor-not-allowed'"
          @click="deposit"
          :disabled="bank_amount <= 0"
        >
          <span class="font-bold text-lg">Deposit Funds</span>
        </button>
        <div v-else class="action-btn bg-[#2c2c2e] text-gray-400 border border-gray-700 flex items-center justify-center cursor-not-allowed">
          <span class="font-semibold text-base">Travel to bank to deposit</span>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import DebugLocation from "../components/DebugLocation.vue";

const store = useStore();

// Map State
const debug_mode = computed(() => store.state.debug_mode);
const version = computed(() => store.state.version);

// Map Getters
const bank_amount = computed(() => store.getters.bank_amount);
const savings_amount = computed(() => store.getters.savings_amount);
const isNearBank = computed(() => store.getters['location/isNearBank']);

// Lifecycle
onMounted(async () => {
  console.log("Bank mounted");
  await store.dispatch('fetchSavings');
  await store.dispatch('fetchBank');
});

// Methods
const deposit = () => {
  if (bank_amount.value > 0) {
    store.dispatch('update_savings');
  } else {
    console.warn('ya broke!');
  }
};
</script>

<style scoped>
.action-btn {
  @apply 
    relative 
    flex items-center justify-center
    w-full 
    h-[56px]
    rounded-2xl
    transition-all duration-200
    active:scale-[0.97]
    focus:outline-none
    select-none;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
