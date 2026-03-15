<template>
  <div class="bakery-container h-full w-full flex flex-col pt-6 pb-6 px-4">
    <div class="flex justify-between items-end mb-6">
      <h1 class="font-serif text-3xl font-medium tracking-wide text-[#4A3B32]">The Bakery</h1>
      <p class="text-sm font-medium text-[#AA8E76] font-sans tracking-widest uppercase">Fresh Prep</p>
    </div>

    <!-- Bakery Content -->
    <div class="flex-1 flex flex-col gap-5">
      
      <!-- Bread Inventory Card -->
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5E6DA]">
        <div class="flex gap-4 items-center mb-4">
          <div class="w-16 h-16 rounded-2xl bg-[#FFF5EA] flex items-center justify-center shrink-0 border border-[#FFE8D6]">
            <span class="text-3xl">🍞</span>
          </div>
          <div class="flex-1">
            <h3 class="font-serif text-xl text-[#5C4535] mb-0.5">Fresh Bread</h3>
            <p class="text-[#8C7A6B] text-sm leading-relaxed font-sans">Artisan loaves for sandwiches, wraps, and subs.</p>
          </div>
        </div>

        <!-- Stock Bar -->
        <div v-if="breadData" class="mt-2">
          <div class="w-full h-3 bg-[#F5E6DA] rounded-full overflow-hidden mb-2">
            <div 
              class="h-full rounded-full transition-all duration-500"
              :class="breadStockColor"
              :style="{ width: breadStockPercent + '%' }"
            ></div>
          </div>
          <div class="flex justify-between items-center">
            <p class="text-[#8C7A6B] text-xs font-sans">{{ breadData.current }} / {{ breadData.max }} loaves</p>
            <p v-if="breadDeficit > 0" class="text-[#D4A373] text-xs font-semibold">Need {{ breadDeficit }} loaves</p>
            <p v-else class="text-green-600 text-xs font-semibold">Fully Stocked ✓</p>
          </div>
        </div>

        <div v-if="breadDeficit > 0" class="mt-4 flex justify-between items-center bg-[#FFF5EA] rounded-2xl px-4 py-3 border border-[#FFE8D6]">
          <span class="text-[#5C4535] font-serif text-sm">Restock Cost</span>
          <span class="text-[#D4A373] font-bold text-lg">${{ breadRestockCost.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Custom Cakes (locked) -->
      <div class="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F5E6DA] flex gap-4 items-center opacity-70">
        <div class="w-16 h-16 rounded-2xl bg-[#FFF5EA] flex items-center justify-center shrink-0 border border-[#FFE8D6]">
          <span class="text-3xl grayscale opacity-50">🎂</span>
        </div>
        <div>
          <h3 class="font-serif text-xl text-[#5C4535] mb-1 flex items-center gap-2">
            Custom Cakes
            <span class="bg-[#F5E6DA] text-[#8C7A6B] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">Locked</span>
          </h3>
          <p class="text-[#8C7A6B] text-sm leading-relaxed font-sans mt-0.5">High-margin dessert orders. Available at level 5.</p>
        </div>
      </div>

    </div>

    <!-- Bottom Action Bar -->
    <div class="sticky mt-auto bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#FAEDDF] via-[#FAEDDF]/95 to-transparent pb-safe pt-8 px-4 rounded-t-3xl -mx-4">
      <div class="max-w-md mx-auto pb-4">
        <!-- Balance info -->
        <div v-if="breadDeficit > 0" class="flex justify-between items-center mb-3 text-sm font-sans">
          <span class="text-[#8C7A6B]">Pizzeria Balance</span>
          <span class="font-bold" :class="canAfford ? 'text-green-600' : 'text-red-500'">${{ pizzeriaBalance.toFixed(2) }}</span>
        </div>

        <button 
          class="bakery-btn w-full shadow-[0_10px_40px_rgba(212,163,115,0.4)]"
          :disabled="breadDeficit <= 0 || !canAfford || isRestocking"
          :class="{ 'opacity-50 cursor-not-allowed': breadDeficit <= 0 || !canAfford || isRestocking }"
          @click="restockBread"
        >
          <span class="font-sans font-bold text-lg tracking-wide">
            {{ isRestocking ? 'Restocking…' : breadDeficit <= 0 ? 'Fully Stocked' : 'Pickup Bread Supply' }}
          </span>
        </button>

        <p v-if="!canAfford && breadDeficit > 0" class="text-red-500 text-xs text-center mt-2 font-sans animate-pulse">Insufficient funds</p>
      </div>
    </div>

    <!-- Success Overlay -->
    <transition name="bakery-fade">
      <div v-if="showSuccess" class="fixed inset-0 z-[200] flex items-center justify-center bg-[#D4A373]/10 backdrop-blur-sm" @click="showSuccess = false">
        <div class="bg-white rounded-3xl p-8 shadow-2xl text-center border border-[#F5E6DA]">
          <span class="text-5xl block mb-3">🍞</span>
          <h2 class="font-serif text-2xl text-[#4A3B32] mb-1">Bread Stocked!</h2>
          <p class="text-[#8C7A6B] text-sm font-sans">Fresh loaves delivered to the pizzeria</p>
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
const showSuccess = ref(false);

const BREAD_COST_PER_UNIT = 0.625;

const inventory = computed(() => store.getters['inventory/inventory']);
const isRestocking = computed(() => store.getters['inventory/isRestocking']);

const { data: finances } = useDocument(doc(db, 'pizzeria', 'finances'));
const pizzeriaBalance = computed(() => finances.value?.bank_balance ?? 0);

const breadData = computed(() => inventory.value?.bread || null);
const breadDeficit = computed(() => breadData.value ? Math.max(0, breadData.value.max - breadData.value.current) : 0);
const breadRestockCost = computed(() => breadDeficit.value * BREAD_COST_PER_UNIT);
const breadStockPercent = computed(() => breadData.value && breadData.value.max > 0 ? (breadData.value.current / breadData.value.max) * 100 : 0);
const breadStockColor = computed(() => {
  if (breadStockPercent.value <= 20) return 'bg-red-400';
  if (breadStockPercent.value <= 50) return 'bg-yellow-400';
  return 'bg-green-400';
});

const canAfford = computed(() => pizzeriaBalance.value >= breadRestockCost.value);

const restockBread = async () => {
  if (breadDeficit.value <= 0 || !canAfford.value) return;
  try {
    await store.dispatch('inventory/restockItems', {
      items: [{ resource: 'bread', quantity: breadDeficit.value }],
      source: 'bakery',
    });
    showSuccess.value = true;
    setTimeout(() => { showSuccess.value = false; }, 2000);
  } catch (error) {
    console.error('Bread restock failed:', error);
  }
};
</script>

<style lang="postcss" scoped>
.bakery-container {
  background: linear-gradient(135deg, #FFFAF5 0%, #FAEDDF 100%);
  color: #4A3B32;
}

.font-serif {
  font-family: 'Playfair Display', Georgia, serif;
}

.bakery-btn {
  @apply 
    relative 
    flex items-center justify-center
    h-[60px]
    rounded-2xl
    bg-gradient-to-r from-[#D4A373] to-[#C9915A]
    text-white
    transition-all duration-300
    active:scale-[0.98]
    active:opacity-90
    focus:outline-none
    select-none
    border-b-4 border-[#B07B46];
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

.bakery-fade-enter-active {
  animation: bakery-in 0.3s ease-out;
}
.bakery-fade-leave-active {
  animation: bakery-out 0.3s ease-in;
}
@keyframes bakery-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes bakery-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.02); }
}
</style>
