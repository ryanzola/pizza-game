<template>
  <div class="bg-[#000000] h-full flex flex-col text-white relative">
    
    <!-- Hero Section -->
    <div class="hero relative h-56 md:h-80 overflow-hidden bg-[#1c1c1e] shadow-sm rounded-b-3xl shrink-0">
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 transition-opacity"></div>
      <img src="../assets/pizzeria-inside.png" alt="the pizzeria storefront" class="absolute object-cover w-full h-full opacity-80">

      <div class="absolute bottom-4 left-4 right-4 z-20">
        <h2 class="text-white text-3xl font-bold tracking-tight shadow-sm mb-1">Ryan's Pizzeria</h2>
        <div class="flex items-center gap-2">
          <span class="bg-blue-500/90 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-md">
            {{ isNearPizzeria ? 'At HQ' : 'Remote Access' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Content wrapper -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="px-4 pt-6 space-y-4 flex flex-col flex-1 pb-6">
        <DebugLocation />
        
        <div class="flex justify-between items-end mb-2">
          <h1 class="text-2xl font-bold tracking-tight text-white">Business Overview</h1>
        </div>

        <div class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div class="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
          
          <div class="flex justify-between items-center relative z-10">
            <div class="flex flex-col">
              <span class="text-gray-400 text-sm font-medium">Vault Balance</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-4xl font-extrabold tracking-tight text-green-400" v-if="!pending">
                  ${{ (finances?.bank_balance ?? 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
                <span v-else class="text-4xl font-extrabold tracking-tight text-gray-500 animate-pulse">
                  $--.--
                </span>
              </div>
            </div>
          </div>
          <div class="w-full h-[1px] bg-gray-800 my-1"></div>
          <p class="text-xs text-gray-400">Total revenue generated from all successful pizza deliveries. Keep delivering to grow the empire!</p>
        </div>

      </div>
    </div>

    <!-- Sticky Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#121212]/90 backdrop-blur-xl border-t border-gray-800 pb-safe pt-3 px-4 rounded-t-3xl">
      <div class="max-w-md mx-auto flex flex-col gap-2 pb-4">
        <button class="action-btn bg-[#2c2c2e] hover:bg-[#3a3a3c] active:bg-gray-700 border border-gray-700 text-gray-400 cursor-not-allowed">
          <span class="font-bold text-lg">Business Upgrades (Coming Soon)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { doc } from 'firebase/firestore';
import { useDocument } from 'vuefire';
import { db } from '../firebase/init.js';
import DebugLocation from "../components/DebugLocation.vue";

const store = useStore();

// Map Getters for location
const isNearPizzeria = computed(() => store.getters['location/isNearPizzeria']);

// Real-time listener for pizzeria finances using VueFire
const { data: finances, pending } = useDocument(doc(db, 'pizzeria', 'finances'));

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
    active:opacity-80
    focus:outline-none
    select-none;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
