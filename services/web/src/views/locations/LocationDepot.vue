<template>
  <div class="depot-container h-full w-full flex flex-col pt-6 pb-6 px-4">
    <div class="flex justify-between items-end mb-6 border-b-2 border-[#ff3b30] pb-2">
      <h1 class="font-mono text-3xl font-black tracking-tighter uppercase text-white">Restaurant Depot</h1>
    </div>

    <!-- Loading State -->
    <div v-if="!inventory" class="flex-1 flex items-center justify-center">
      <div class="animate-pulse text-gray-500 font-mono uppercase tracking-wider text-sm">Loading Inventory…</div>
    </div>

    <!-- Inventory Items -->
    <div v-else class="flex-1 flex flex-col gap-3 overflow-y-auto pb-4">
      <div 
        v-for="item in depotResources" 
        :key="item.key"
        @click="toggleCart(item.key)"
        :class="[
          'resource-card bg-[#1a1a1c] p-5 border-l-4 border border-gray-800 rounded-sm relative cursor-pointer transition-all duration-200 active:scale-[0.98]',
          isInCart(item.key) ? 'border-l-[#ff3b30] bg-[#1a0806] border-[#ff3b30]/30' : 'border-l-gray-700 hover:bg-[#222225]',
          item.data.current >= item.data.max ? 'opacity-40 pointer-events-none' : ''
        ]"
      >
        <!-- Background watermark (clipped by its own container) -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute -right-2 -bottom-3 text-5xl font-black text-white/[0.03] uppercase italic select-none leading-none">{{ item.label }}</div>
        </div>

        <!-- Header: emoji + name -->
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">{{ item.icon }}</span>
            <h3 class="font-mono text-base font-bold text-gray-100 uppercase tracking-wide">{{ item.label }}</h3>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="isInCart(item.key)" class="text-[#ff3b30] font-mono text-[10px] font-bold uppercase animate-pulse">Added</span>
            <span class="font-mono text-sm font-bold" :class="getDeficitCost(item) > 0 ? 'text-[#ff3b30]' : 'text-gray-600'">
              {{ getDeficitCost(item) > 0 ? `-$${getDeficitCost(item).toFixed(2)}` : 'Full' }}
            </span>
          </div>
        </div>

        <!-- Stock Bar -->
        <div class="w-full h-2 bg-gray-800 rounded-sm overflow-hidden mb-2">
          <div 
            class="h-full transition-all duration-500"
            :class="getStockBarColor(item)"
            :style="{ width: getStockPercent(item) + '%' }"
          ></div>
        </div>

        <!-- Stats row -->
        <div class="flex justify-between">
          <p class="text-gray-500 text-[10px] font-mono uppercase tracking-wider">{{ item.data.current }} / {{ item.data.max }} {{ item.unit }}</p>
          <p v-if="getDeficit(item) > 0" class="text-gray-600 text-[10px] font-mono uppercase tracking-wider">Need {{ getDeficit(item) }}</p>
        </div>
      </div>
    </div>

    <!-- Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t-2 border-[#ff3b30] pb-safe pt-5 px-4 rounded-t-none -mx-4">
      <div class="max-w-md mx-auto pb-4">
        <!-- Cart Summary -->
        <div class="flex justify-between items-center mb-3 font-mono text-sm">
          <div class="text-gray-400">
            <span class="uppercase tracking-wider text-[10px]">Cart</span>
            <span class="ml-2 text-white font-bold">{{ cart.length }} items</span>
          </div>
          <div class="text-gray-400">
            <span class="uppercase tracking-wider text-[10px]">Balance</span>
            <span class="ml-2 font-bold" :class="canAfford ? 'text-green-400' : 'text-red-500'">${{ pizzeriaBalance.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Total Cost -->
        <div v-if="cart.length > 0" class="flex justify-between items-center mb-3 py-2 border-t border-b border-gray-800 font-mono">
          <span class="text-white font-bold uppercase tracking-wider text-sm">Total</span>
          <span class="text-[#ff3b30] font-black text-xl">${{ totalCartCost.toFixed(2) }}</span>
        </div>

        <!-- Progress bar visual -->
        <div class="w-full h-1 bg-gray-800 mb-4 overflow-hidden">
          <div class="h-full bg-repeating-linear-gradient" :style="{ width: cart.length > 0 ? '100%' : '33%' }"></div>
        </div>

        <button 
          class="depot-btn w-full flex items-center justify-between px-6"
          :disabled="cart.length === 0 || !canAfford || isRestocking"
          :class="{ 'opacity-40 cursor-not-allowed': cart.length === 0 || !canAfford || isRestocking }"
          @click="purchaseSupply"
        >
          <span class="font-mono font-black text-lg tracking-widest uppercase text-black">
            {{ isRestocking ? 'Restocking…' : cart.length === 0 ? 'Select Items' : 'Purchase Supply' }}
          </span>
          <svg v-if="!isRestocking" class="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          <div v-else class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        </button>

        <p v-if="!canAfford && cart.length > 0" class="text-red-500 text-[10px] font-mono uppercase tracking-wider text-center mt-2 animate-pulse">Insufficient funds</p>
      </div>
    </div>

    <!-- Success Overlay -->
    <transition name="flash">
      <div v-if="showSuccess" class="fixed inset-0 z-[200] flex items-center justify-center bg-[#ff3b30]/10 backdrop-blur-sm" @click="showSuccess = false">
        <div class="bg-[#0a0a0a] border-4 border-white p-8 shadow-[8px_8px_0px_#ff3b30] text-center">
          <span class="text-5xl block mb-3">📦</span>
          <h2 class="font-mono text-2xl font-black text-white uppercase tracking-tight mb-1">Restocked!</h2>
          <p class="font-mono text-sm text-gray-400">Inventory replenished</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { doc } from 'firebase/firestore';
import { useDocument } from 'vuefire';
import { db } from '../../firebase/init.js';

const store = useStore();

const DEPOT_RESOURCES = {
  dough:     { label: 'Dough',     icon: '🍕', unit: 'batches', costPerUnit: 1.50 },
  cheese:    { label: 'Cheese',    icon: '🧀', unit: 'lbs',     costPerUnit: 1.50 },
  proteins:  { label: 'Proteins',  icon: '🍗', unit: 'lbs',     costPerUnit: 3.00 },
  produce:   { label: 'Produce',   icon: '🥬', unit: 'crates',  costPerUnit: 1.40 },
  pasta:     { label: 'Pasta',     icon: '🍝', unit: 'boxes',   costPerUnit: 1.50 },
  fry_oil:   { label: 'Fry Oil',   icon: '🛢️', unit: 'gallons', costPerUnit: 1.67 },
  beverages: { label: 'Beverages', icon: '🥤', unit: 'cases',   costPerUnit: 1.00 },
  desserts:  { label: 'Desserts',  icon: '🍰', unit: 'trays',   costPerUnit: 2.00 },
};

const cart = ref([]);
const showSuccess = ref(false);

const inventory = computed(() => store.getters['inventory/inventory']);
const isRestocking = computed(() => store.getters['inventory/isRestocking']);

// Real-time pizzeria finances
const { data: finances } = useDocument(doc(db, 'pizzeria', 'finances'));
const pizzeriaBalance = computed(() => finances.value?.bank_balance ?? 0);

// Build depot resource list from live inventory
const depotResources = computed(() => {
  if (!inventory.value) return [];
  return Object.entries(DEPOT_RESOURCES).map(([key, meta]) => ({
    key,
    ...meta,
    data: inventory.value[key] || { current: 0, max: 50 },
  }));
});

const isInCart = (key) => cart.value.includes(key);

const toggleCart = (key) => {
  const resource = depotResources.value.find(r => r.key === key);
  if (resource && resource.data.current >= resource.data.max) return;
  
  const idx = cart.value.indexOf(key);
  if (idx > -1) {
    cart.value.splice(idx, 1);
  } else {
    cart.value.push(key);
  }
};

const getDeficit = (item) => Math.max(0, item.data.max - item.data.current);
const getDeficitCost = (item) => getDeficit(item) * (DEPOT_RESOURCES[item.key]?.costPerUnit || 0);
const getStockPercent = (item) => item.data.max > 0 ? (item.data.current / item.data.max) * 100 : 0;
const getStockBarColor = (item) => {
  const pct = getStockPercent(item);
  if (pct <= 20) return 'bg-red-500';
  if (pct <= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

const totalCartCost = computed(() => {
  return cart.value.reduce((total, key) => {
    const resource = depotResources.value.find(r => r.key === key);
    return total + (resource ? getDeficitCost(resource) : 0);
  }, 0);
});

const canAfford = computed(() => pizzeriaBalance.value >= totalCartCost.value);

const purchaseSupply = async () => {
  if (cart.value.length === 0 || !canAfford.value) return;
  try {
    const items = cart.value.map(key => ({
      resource: key,
      quantity: getDeficit(depotResources.value.find(r => r.key === key)),
    }));
    await store.dispatch('inventory/restockItems', { items, source: 'depot' });
    cart.value = [];
    showSuccess.value = true;
    setTimeout(() => { showSuccess.value = false; }, 2000);
  } catch (error) {
    console.error('Restock failed:', error);
  }
};
</script>

<style lang="postcss" scoped>
.depot-container {
  background-color: #0a0a0a;
  background-image: radial-gradient(#222 1px, transparent 1px);
  background-size: 20px 20px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.depot-btn {
  @apply 
    h-[64px]
    bg-[#ff3b30]
    transition-all duration-100
    active:translate-y-1
    active:shadow-none
    focus:outline-none
    select-none;
    
  border: 4px solid #fff;
  box-shadow: 4px 4px 0px #fff;
}

.depot-btn:active {
    box-shadow: 0px 0px 0px #fff;
}

.depot-btn:disabled {
    box-shadow: 2px 2px 0px #555;
    border-color: #555;
    background-color: #333;
}

.depot-btn:disabled span {
    color: #888;
}

.bg-repeating-linear-gradient {
    background-image: repeating-linear-gradient(
        45deg,
        #ff3b30,
        #ff3b30 10px,
        #2a0a0a 10px,
        #2a0a0a 20px
    );
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

.flash-enter-active {
  animation: flash-in 0.3s ease-out;
}
.flash-leave-active {
  animation: flash-out 0.3s ease-in;
}
@keyframes flash-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes flash-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.05); }
}
</style>
