<template>
  <transition name="pop">
    <div
      v-if="celebration"
      :key="celebration.id"
      class="fixed inset-0 z-40 flex items-center justify-center px-6 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <!-- Confetti -->
      <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
        <span
          v-for="piece in confetti"
          :key="piece.id"
          class="confetti absolute top-1/2 left-1/2 rounded-sm"
          :style="piece.style"
        ></span>
      </div>

      <!-- Card -->
      <div
        class="relative w-full max-w-sm bg-[#1c1c1e] border border-green-500/40 rounded-3xl shadow-2xl px-6 py-7 text-center pointer-events-auto ring-8 ring-green-500/10"
        @click="dismiss"
      >
        <div class="check mx-auto mb-4 h-20 w-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
          <svg class="w-11 h-11 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path class="check-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <p class="text-xs uppercase tracking-[0.2em] text-green-400 font-bold">Delivered</p>
        <h2 class="text-2xl font-bold tracking-tight text-white mt-1 leading-tight capitalize">{{ celebration.address }}</h2>
        <p v-if="celebration.town" class="text-sm text-gray-400 capitalize">{{ celebration.town }}</p>

        <div class="mt-5 flex items-center justify-center gap-2">
          <p class="text-4xl font-bold tracking-tight text-green-400">
            <span class="text-2xl align-top">+$</span>{{ celebration.tip.toFixed(2) }}
          </p>
          <span class="text-sm text-gray-400 font-medium self-end mb-1">tip</span>
        </div>
        <span v-if="celebration.is_vip" class="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
          ★ VIP customer
        </span>

        <p class="mt-5 text-sm font-semibold" :class="celebration.remaining === 0 ? 'text-blue-400' : 'text-gray-300'">
          <template v-if="celebration.remaining === 0">🎉 Route complete — head back to the pizzeria</template>
          <template v-else-if="celebration.remaining === 1">1 delivery to go</template>
          <template v-else>{{ celebration.remaining }} deliveries to go</template>
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, watch, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';

const SHOW_MS = 4000;
const CONFETTI_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ec4899', '#a855f7', '#ffffff'];
const CONFETTI_COUNT = 28;

const store = useStore();
const celebration = computed(() => store.getters['orders/currentCelebration']);
const confetti = ref([]);
let timer = null;

// Deterministic-per-show scatter so the burst looks different each time
// without needing a library.
const buildConfetti = () => Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * 360 + Math.random() * 20;
  const distance = 120 + Math.random() * 160;
  const dx = Math.cos((angle * Math.PI) / 180) * distance;
  const dy = Math.sin((angle * Math.PI) / 180) * distance - 60;
  return {
    id: i,
    style: {
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--rot': `${Math.random() * 720 - 360}deg`,
      '--delay': `${Math.random() * 120}ms`,
      width: `${6 + Math.random() * 6}px`,
      height: `${8 + Math.random() * 8}px`,
      backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    },
  };
});

const dismiss = () => {
  clearTimeout(timer);
  timer = null;
  store.commit('orders/SHIFT_CELEBRATION');
};

watch(celebration, (next, prev) => {
  if (!next || next.id === prev?.id) return;
  confetti.value = buildConfetti();
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 60, 40]);
  clearTimeout(timer);
  timer = setTimeout(dismiss, SHOW_MS);
}, { immediate: true });

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.pop-enter-active { transition: opacity 0.25s ease-out, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.4); }
.pop-leave-active { transition: opacity 0.25s ease-in, transform 0.25s ease-in; }
.pop-enter-from { opacity: 0; transform: scale(0.8); }
.pop-leave-to   { opacity: 0; transform: scale(0.95) translateY(10px); }

.check { animation: check-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.5) both; }
@keyframes check-pop {
  0%   { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
.check-path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: check-draw 0.35s 0.25s ease-out forwards;
}
@keyframes check-draw { to { stroke-dashoffset: 0; } }

.confetti {
  opacity: 0;
  animation: burst 1.4s var(--delay) cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
@keyframes burst {
  0%   { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) scale(0.6); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 80px)) rotate(var(--rot)) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .confetti, .check, .check-path { animation: none; opacity: 1; stroke-dashoffset: 0; }
}
</style>
