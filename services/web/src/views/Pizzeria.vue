<template>
  <div class="bg-[#000000] h-full flex flex-col text-white relative">
    
    <!-- Hero Section -->
    <div class="hero relative h-56 md:h-80 overflow-hidden bg-[#1c1c1e] shadow-sm rounded-b-3xl shrink-0">
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 transition-opacity"></div>
      <img src="../assets/pizzeria-inside.png" alt="the pizzeria storefront" class="absolute object-cover w-full h-full opacity-80">

      <div class="absolute bottom-4 left-4 right-4 z-20">
        <div class="flex justify-between items-end">
          <h2 class="text-white text-3xl font-bold tracking-tight shadow-sm mb-1">Ryan's Pizzeria</h2>

          <!-- Level Badge -->
          <div v-if="finances" class="flex flex-col items-center bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 border border-gray-700/50">
            <span class="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Level</span>
            <span class="text-2xl font-black text-orange-400">{{ pizzeriaLevel }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content wrapper -->
    <div class="flex-1 overflow-y-auto flex flex-col">
      <div class="px-4 pt-6 space-y-4 flex flex-col flex-1 pb-24">
        <DebugLocation />
        
        <div class="flex justify-between items-end mb-2">
          <h1 class="text-2xl font-bold tracking-tight text-white">Business Overview</h1>
        </div>

        <!-- Vault Balance -->
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

        <!-- Level Progress -->
        <div v-if="finances" class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span>⭐</span> Pizzeria Level
            </h2>
            <span class="text-orange-400 font-bold text-sm">{{ capacityMultiplier }}× Capacity</span>
          </div>

          <!-- XP Progress Bar -->
          <div class="mb-2">
            <div class="w-full h-3 bg-[#2c2c2e] rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-700"
                :style="{ width: levelProgress + '%' }"
              ></div>
            </div>
          </div>
          <div class="flex justify-between text-xs text-gray-500">
            <span>{{ currentDeliveries }} deliveries</span>
            <span v-if="nextLevelThreshold">{{ nextLevelThreshold }} to next level</span>
            <span v-else class="text-orange-400">Max Level!</span>
          </div>
        </div>

        <!-- Inventory Status -->
        <div v-if="inventory" class="bg-[#1c1c1e] rounded-3xl p-5 border border-gray-800 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span>📦</span> Inventory Status
            </h2>
            <span 
              class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border"
              :class="stockStatusClass"
            >{{ stockStatusLabel }}</span>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div 
              v-for="item in allResources" 
              :key="item.key"
              class="bg-[#2c2c2e] rounded-xl p-3 flex flex-col items-center gap-1.5 border border-gray-700/30"
            >
              <span class="text-xl">{{ item.icon }}</span>
              <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="getBarColor(item)"
                  :style="{ width: getPercent(item) + '%' }"
                ></div>
              </div>
              <span class="text-[9px] text-gray-500 uppercase tracking-wider font-bold leading-none text-center">{{ item.label }}</span>
            </div>
          </div>
        </div>

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

const isNearPizzeria = computed(() => store.getters['location/isNearPizzeria']);
const inventory = computed(() => store.getters['inventory/inventory']);
const stockStatus = computed(() => store.getters['inventory/stockStatus']);

const { data: finances, pending } = useDocument(doc(db, 'pizzeria', 'finances'));

// Level system
const LEVEL_THRESHOLDS = [
  { level: 1, deliveries: 0, multiplier: 1.0 },
  { level: 2, deliveries: 15, multiplier: 1.15 },
  { level: 3, deliveries: 35, multiplier: 1.3 },
  { level: 4, deliveries: 60, multiplier: 1.5 },
  { level: 5, deliveries: 100, multiplier: 1.75 },
  { level: 6, deliveries: 150, multiplier: 2.0 },
  { level: 7, deliveries: 220, multiplier: 2.3 },
  { level: 8, deliveries: 300, multiplier: 2.6 },
  { level: 9, deliveries: 400, multiplier: 3.0 },
  { level: 10, deliveries: 500, multiplier: 3.5 },
];

const pizzeriaLevel = computed(() => finances.value?.level || 1);
const currentDeliveries = computed(() => finances.value?.total_lifetime_deliveries || 0);

const capacityMultiplier = computed(() => {
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === pizzeriaLevel.value);
  return threshold ? threshold.multiplier : 1.0;
});

const levelProgress = computed(() => {
  const currentIdx = LEVEL_THRESHOLDS.findIndex(t => t.level === pizzeriaLevel.value);
  if (currentIdx === -1 || currentIdx >= LEVEL_THRESHOLDS.length - 1) return 100;
  
  const currentThreshold = LEVEL_THRESHOLDS[currentIdx].deliveries;
  const nextThreshold = LEVEL_THRESHOLDS[currentIdx + 1].deliveries;
  const range = nextThreshold - currentThreshold;
  const progress = currentDeliveries.value - currentThreshold;
  return Math.min(100, (progress / range) * 100);
});

const nextLevelThreshold = computed(() => {
  const currentIdx = LEVEL_THRESHOLDS.findIndex(t => t.level === pizzeriaLevel.value);
  if (currentIdx === -1 || currentIdx >= LEVEL_THRESHOLDS.length - 1) return null;
  return LEVEL_THRESHOLDS[currentIdx + 1].deliveries;
});

// Inventory grid
const RESOURCE_META = {
  dough:     { label: 'Dough',     icon: '🍕' },
  cheese:    { label: 'Cheese',    icon: '🧀' },
  proteins:  { label: 'Proteins',  icon: '🍗' },
  produce:   { label: 'Produce',   icon: '🥬' },
  pasta:     { label: 'Pasta',     icon: '🍝' },
  fry_oil:   { label: 'Fry Oil',   icon: '🛢️' },
  beverages: { label: 'Drinks',    icon: '🥤' },
  desserts:  { label: 'Desserts',  icon: '🍰' },
  bread:     { label: 'Bread',     icon: '🍞' },
};

const allResources = computed(() => {
  if (!inventory.value) return [];
  return Object.entries(RESOURCE_META).map(([key, meta]) => ({
    key,
    ...meta,
    data: inventory.value[key] || { current: 0, max: 50 },
  }));
});

const getPercent = (item) => item.data.max > 0 ? (item.data.current / item.data.max) * 100 : 0;
const getBarColor = (item) => {
  const pct = getPercent(item);
  if (pct <= 20) return 'bg-red-500';
  if (pct <= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

const stockStatusClass = computed(() => {
  switch (stockStatus.value) {
    case 'out': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'low': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
});

const stockStatusLabel = computed(() => {
  switch (stockStatus.value) {
    case 'out': return 'Depleted';
    case 'low': return 'Low Stock';
    default: return 'Stocked';
  }
});
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
